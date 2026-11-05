"""INTEROPERABILIDAD interna — contrato consumidor → proveedor (C2).

Lee el código de los dos frontends (ERP y ANUNCIOS) y extrae cada llamada que hacen al Gateway
(`reenviarAlGateway(...)` y `fetch(`${GATEWAY_URL}...`)`). Cada una debe existir en el contrato
OpenAPI del servicio que la atiende: en el propio Gateway o, si es una ruta reenviada, en el
microservicio que indica la tabla `_URL_POR_SERVICIO` de gateway/app/api/v1/proxy.py.

Criterio de aceptación: el 100 % de las llamadas con ruta fija tiene una operación con el mismo
método y la misma ruta. Así, renombrar o borrar un endpoint que el frontend usa rompe esta prueba
ANTES de llegar a producción. No importa código de ningún servicio: solo lee archivos.
"""
import json
import re
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[4]
CONTRATOS = Path(__file__).parent / "contratos"
FRONTENDS = [RAIZ / "frontend" / "ERP", RAIZ / "frontend" / "ANUNCIOS"]
PREFIJO_GATEWAY = "/api/v1"
INICIOS = re.compile(r"reenviarAlGateway\(|fetch\(\s*`\$\{GATEWAY_URL\}")
LITERAL = re.compile(r"""(['"`])((?:\\.|(?!\1).)*)\1""", re.S)
METODO = re.compile(r"""method\s*:\s*['"](\w+)['"]""")


def _cierre(texto: str, inicio: int) -> int:
    """Posición del paréntesis que cierra la llamada que empieza en `inicio`."""
    nivel = 0
    for i in range(inicio, len(texto)):
        if texto[i] == "(":
            nivel += 1
        elif texto[i] == ")":
            nivel -= 1
            if nivel == 0:
                return i
    return len(texto)


def _ruta_normalizada(literal: str) -> str | None:
    """`/anuncios/${encodeURIComponent(id)}/estado` → `/anuncios/{}/estado`; quita `${...}` de query."""
    literal = literal.replace("${GATEWAY_URL}", "")
    if not literal.startswith("/"):
        return None
    ruta = re.sub(r"/\$\{[^}]*\}", "/{}", literal)  # parámetro de ruta
    ruta = re.sub(r"\$\{[^}]*\}", "", ruta)  # ${request.nextUrl.search} y similares: query
    return ruta.split("?")[0].rstrip("/") or "/"


def llamadas_del_frontend() -> list[tuple[str, str, str]]:
    """(archivo:línea, MÉTODO, ruta) de cada llamada al Gateway con ruta conocida."""
    llamadas = []
    for frontend in FRONTENDS:
        for archivo in sorted([*frontend.rglob("*.ts"), *frontend.rglob("*.tsx")]):
            if "node_modules" in archivo.parts or ".next" in archivo.parts:
                continue
            texto = archivo.read_text(encoding="utf-8")
            for coincidencia in INICIOS.finditer(texto):
                abre = texto.index("(", coincidencia.start())
                llamada = texto[abre: _cierre(texto, abre) + 1]
                rutas = [r for r in (_ruta_normalizada(m.group(2)) for m in LITERAL.finditer(llamada)) if r]
                if not rutas:
                    continue  # ruta dinámica (variable): no se puede verificar estáticamente
                metodo = m.group(1) if (m := METODO.search(llamada)) else "GET"
                linea = texto.count("\n", 0, coincidencia.start()) + 1
                llamadas.append((f"{archivo.relative_to(RAIZ).as_posix()}:{linea}", metodo.upper(), rutas[0]))
    return llamadas


def _servicios_del_proxy() -> dict[str, str]:
    """{"postulantes": "servicio-postulantes", "anuncios": "servicio-empresas-vacantes", ...}"""
    texto = (RAIZ / "backend" / "gateway" / "app" / "api" / "v1" / "proxy.py").read_text(encoding="utf-8")
    pares = re.findall(r'"(\w+)":\s*settings\.url_servicio_(\w+)', texto)
    return {prefijo: "servicio-" + atributo.replace("_", "-") for prefijo, atributo in pares}


def _operaciones(servicio: str) -> set[tuple[str, tuple[str, ...]]]:
    archivo = CONTRATOS / f"{servicio}.json"
    if not archivo.exists():
        pytest.fail(f"Falta el contrato {archivo.name}: python tests/ejecutar.py --actualizar-contratos")
    esquema = json.loads(archivo.read_text(encoding="utf-8"))
    operaciones = set()
    for ruta, metodos in esquema["paths"].items():
        if "{ruta" in ruta:  # la ruta comodín del proxy no cuenta como operación propia
            continue
        segmentos = tuple("{}" if s.startswith("{") else s for s in ruta.strip("/").split("/"))
        operaciones |= {(m.upper(), segmentos) for m in metodos}
    return operaciones


def _existe(metodo: str, ruta: str, operaciones: set) -> bool:
    pedidos = tuple(ruta.strip("/").split("/")) if ruta != "/" else ("",)
    for m, segmentos in operaciones:
        if m == metodo and len(segmentos) == len(pedidos) and all(
            s == p or s == "{}" for s, p in zip(segmentos, pedidos)
        ):
            return True
    return False


def _existe_alguna(ruta: str, operaciones: set) -> bool:
    return any(_existe(m, ruta, operaciones) for m in {"GET", "POST", "PUT", "PATCH", "DELETE"})


def destino(ruta: str, proxy: dict[str, str], gateway: set) -> tuple[str, str]:
    """Qué servicio atiende la ruta y con qué ruta la recibe: primero las rutas propias del Gateway
    (login, usuarios, públicas); si no, el microservicio al que la reenvía el proxy."""
    if _existe_alguna(f"{PREFIJO_GATEWAY}{ruta}", gateway):
        return "gateway", f"{PREFIJO_GATEWAY}{ruta}"
    prefijo = ruta.strip("/").split("/")[0]
    if prefijo in proxy:
        return proxy[prefijo], ruta
    return "gateway", f"{PREFIJO_GATEWAY}{ruta}"


LLAMADAS = llamadas_del_frontend()


def test_se_encontraron_las_llamadas_de_ambos_frontends():
    assert len(LLAMADAS) >= 40, f"Solo se encontraron {len(LLAMADAS)} llamadas: ¿cambió la forma de llamar al Gateway?"
    assert {a.split("/")[1] for a, _, _ in LLAMADAS} == {"ERP", "ANUNCIOS"}


@pytest.mark.parametrize(("ubicacion", "metodo", "ruta"), LLAMADAS, ids=[f"{m} {r}" for _, m, r in LLAMADAS])
def test_cada_llamada_del_frontend_existe_en_el_backend(ubicacion, metodo, ruta):
    proxy = _servicios_del_proxy()
    gateway = _operaciones("gateway")
    servicio, ruta_destino = destino(ruta, proxy, gateway)
    operaciones = gateway if servicio == "gateway" else _operaciones(servicio)
    assert _existe(metodo, ruta_destino, operaciones), (
        f"{ubicacion} llama {metodo} {ruta}, pero {servicio} no tiene {metodo} {ruta_destino} en su contrato"
    )
