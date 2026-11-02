"""CO-EXISTENCIA — los 7 servicios comparten red, balanceador, base de datos y cuenta de AWS sin
perjudicarse entre ellos ni a otros recursos de la cuenta (casos E2 y E6, verificación de diseño).

Lee la infraestructura como código (infra/aws/app.yaml y base.yaml) y el código compartido del
backend; no necesita AWS. Criterio de aceptación:
  - cada servicio tiene límites propios de CPU/memoria, su puerto, su log y su esquema de datos;
  - entre todos no pueden agotar las conexiones de la base de datos (quedan ≥ 50 % libres);
  - solo lo que debe ser público pasa por el balanceador; la base solo acepta a los servicios;
  - cada servicio tiene solo los permisos de AWS que necesita;
  - ningún secreto va en texto plano y todo lleva el prefijo del proyecto (no choca con otros recursos).
"""
import re
from pathlib import Path

import pytest
import yaml

RAIZ = Path(__file__).resolve().parents[4]
INFRA = RAIZ / "infra" / "aws"
PUBLICOS = {"gateway", "erp", "anuncios"}  # los únicos detrás del balanceador


class _CargadorCloudFormation(yaml.SafeLoader):
    """Lee las etiquetas de CloudFormation (!Ref, !Sub, !GetAtt...) como {"!Ref": valor}."""


def _etiqueta(cargador, sufijo, nodo):
    if isinstance(nodo, yaml.ScalarNode):
        valor = cargador.construct_scalar(nodo)
    elif isinstance(nodo, yaml.SequenceNode):
        valor = cargador.construct_sequence(nodo, deep=True)
    else:
        valor = cargador.construct_mapping(nodo, deep=True)
    return {f"!{sufijo}": valor}


_CargadorCloudFormation.add_multi_constructor("!", _etiqueta)


def _plantilla(nombre: str) -> dict:
    return yaml.load((INFRA / nombre).read_text(encoding="utf-8"), Loader=_CargadorCloudFormation)


APP = _plantilla("app.yaml")
BASE = _plantilla("base.yaml")
RECURSOS = APP["Resources"]
TAREAS = {r["Properties"]["ContainerDefinitions"][0]["Name"]: r["Properties"]
          for r in RECURSOS.values() if r["Type"] == "AWS::ECS::TaskDefinition"}
SERVICIOS = {r["Properties"]["ServiceName"]: r["Properties"]
             for r in RECURSOS.values() if r["Type"] == "AWS::ECS::Service"}


def _entorno(tarea: dict) -> dict:
    return {v["Name"]: v.get("Value") for v in tarea["ContainerDefinitions"][0].get("Environment", [])}


def test_estan_los_7_servicios():
    assert set(TAREAS) == set(SERVICIOS) == {
        "gateway", "servicio-postulantes", "servicio-empresas-vacantes", "servicio-procesos-seleccion",
        "servicio-comunicaciones", "erp", "anuncios",
    }


# ------------------------------------------------------------------ recursos propios de cada servicio
@pytest.mark.parametrize("nombre", sorted(TAREAS))
def test_cada_servicio_tiene_limites_propios_de_cpu_y_memoria(nombre):
    """Con límites fijos, un servicio con un pico no le quita CPU ni memoria a los demás."""
    tarea = TAREAS[nombre]
    assert int(tarea["Cpu"]) > 0 and int(tarea["Memory"]) > 0


def test_ningun_servicio_comparte_puerto_ni_log():
    puertos = [t["ContainerDefinitions"][0]["PortMappings"][0]["ContainerPort"] for t in TAREAS.values()]
    logs = [str(t["ContainerDefinitions"][0]["LogConfiguration"]["Options"]["awslogs-group"]) for t in TAREAS.values()]
    assert len(set(puertos)) == len(puertos), f"Puertos repetidos: {puertos}"
    assert len(set(logs)) == len(logs), f"Grupos de log repetidos: {logs}"


def test_cada_servicio_del_backend_usa_su_propio_esquema_de_datos():
    esquemas = {n: _entorno(t).get("DB_SCHEMA") for n, t in TAREAS.items() if "DB_HOST" in _entorno(t)}
    assert len(esquemas) == 5, f"Servicios con base de datos: {sorted(esquemas)}"
    assert len(set(esquemas.values())) == 5, f"Esquemas compartidos: {esquemas}"


def test_entre_todos_no_agotan_las_conexiones_de_la_base_de_datos():
    """RDS calcula max_connections = memoria / 9 531 392 (tope 5 000). Los pools de todos los servicios
    juntos deben dejar al menos la mitad libre (administración, despliegues con dos tareas a la vez)."""
    codigo = (RAIZ / "backend" / "libs" / "shared" / "shared_kernel" / "database.py").read_text(encoding="utf-8")
    base = int(re.search(r"^CONEXIONES_BASE\s*=\s*(\d+)", codigo, re.M).group(1))
    extra = int(re.search(r"^CONEXIONES_EXTRA\s*=\s*(\d+)", codigo, re.M).group(1))
    con_base_de_datos = sum(1 for t in TAREAS.values() if "DB_HOST" in _entorno(t))
    clase = APP["Parameters"]["ClaseBaseDatos"]["Default"]
    memoria_gib = {"db.t4g.micro": 1, "db.t4g.small": 2, "db.t4g.medium": 4, "db.t4g.large": 8}[clase]
    maximo_rds = min(memoria_gib * 1024**3 // 9_531_392, 5000)

    usadas = con_base_de_datos * (base + extra)
    assert usadas <= maximo_rds * 0.5, f"{usadas} conexiones posibles de {maximo_rds} en {clase}"


# ------------------------------------------------------------------ red: quién puede hablar con quién
def test_solo_gateway_erp_y_anuncios_estan_detras_del_balanceador():
    con_balanceador = {n for n, s in SERVICIOS.items() if s.get("LoadBalancers")}
    assert con_balanceador == PUBLICOS


def test_el_balanceador_solo_acepta_trafico_de_cloudfront():
    reglas = RECURSOS["SgBalanceador"]["Properties"]["SecurityGroupIngress"]
    assert all("SourcePrefixListId" in r and "CidrIp" not in r for r in reglas)


def test_la_base_de_datos_solo_acepta_a_los_servicios_y_es_privada():
    reglas = RECURSOS["SgBaseDatos"]["Properties"]["SecurityGroupIngress"]
    assert reglas == [{"IpProtocol": "tcp", "FromPort": 5432, "ToPort": 5432, "SourceSecurityGroupId": {"!Ref": "SgServicios"}}]
    bd = RECURSOS["BaseDatos"]["Properties"]
    assert bd["PubliclyAccessible"] is False
    subredes = RECURSOS["GrupoSubredesBaseDatos"]["Properties"]["SubnetIds"]
    assert all("Privada" in s["!Ref"] for s in subredes)


def test_los_servicios_se_encuentran_por_nombre_sin_salir_a_internet():
    """Todos usan Service Connect; el backend además publica su nombre (los frontends solo llaman,
    nadie los llama a ellos por la red interna)."""
    for nombre, servicio in SERVICIOS.items():
        conexion = servicio["ServiceConnectConfiguration"]
        assert conexion["Enabled"] is True
        if nombre not in ("erp", "anuncios"):
            assert conexion["Services"][0]["DiscoveryName"] == nombre


# ------------------------------------------------------------------ permisos y secretos
def test_solo_postulantes_tiene_permisos_de_aws_mientras_corre():
    """Mínimo privilegio: solo servicio-postulantes usa S3 y SES; los demás no pueden tocar nada de AWS."""
    roles = {n: t["TaskRoleArn"]["!ImportValue"]["Fn::Sub"] for n, t in TAREAS.items()}
    con_permisos = {n for n, r in roles.items() if not r.endswith("-rol-sin-permisos")}
    assert con_permisos == {"servicio-postulantes"}


@pytest.mark.parametrize("nombre", sorted(TAREAS))
def test_ningun_secreto_va_en_texto_plano(nombre):
    """Los secretos llegan desde SSM (cifrados); en "Environment" no debe haber ninguno."""
    contenedor = TAREAS[nombre]["ContainerDefinitions"][0]
    sensibles = [v for v in _entorno(TAREAS[nombre]) if re.search(r"SECRET|PASSWORD|TOKEN", v)]
    assert not sensibles, f"Secretos en texto plano: {sensibles}"
    for secreto in contenedor.get("Secrets", []):
        assert ":parameter/${Proyecto}/" in secreto["ValueFrom"]["!Sub"]


# ------------------------------------------------------------------ convivencia con otros recursos de la cuenta
def test_todos_los_nombres_llevan_el_prefijo_del_proyecto():
    """Así TalentERP no choca con otros proyectos de la misma cuenta y se puede borrar sin afectar a nadie."""
    nombres = []
    for plantilla in (APP, BASE):
        for recurso in plantilla["Resources"].values():
            propiedades = recurso.get("Properties", {})
            for campo in ("Family", "LogGroupName", "RepositoryName", "DBInstanceIdentifier", "Name", "AlarmName", "TopicName"):
                valor = propiedades.get(campo)
                if isinstance(valor, dict) and "!Sub" in valor:
                    nombres.append(valor["!Sub"])
    assert nombres and all("${Proyecto}" in n for n in nombres), [n for n in nombres if "${Proyecto}" not in n]


def test_cada_log_de_servicio_existe_y_caduca():
    """Los logs tienen retención (no crecen sin límite ni cobran de más) y uno por servicio."""
    grupos = {r["Properties"]["LogGroupName"]["!Sub"]: r["Properties"].get("RetentionInDays")
              for r in BASE["Resources"].values() if r["Type"] == "AWS::Logs::LogGroup"}
    for nombre, tarea in TAREAS.items():
        grupo = tarea["ContainerDefinitions"][0]["LogConfiguration"]["Options"]["awslogs-group"]["!Sub"]
        assert grupo in grupos, f"{nombre} escribe en {grupo}, que no está en base.yaml"
    assert all(dias for dias in grupos.values())
