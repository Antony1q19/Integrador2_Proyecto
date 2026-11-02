"""Ejecuta las pruebas de compatibilidad (ISO/IEC 25010) suite por suite y guarda la evidencia.

Cada microservicio tiene su propio paquete `app`, así que cada suite corre en un proceso aparte con
el PYTHONPATH de SU servicio. Los reportes JUnit y un resumen quedan en tests/evidencias/.

    python tests/ejecutar.py                          # todas las suites
    python tests/ejecutar.py meta-whatsapp correo-ses # solo esas
    python tests/ejecutar.py --actualizar-contratos   # regenera los contratos OpenAPI (contratos_api/contratos/)
    python tests/ejecutar.py --listar                 # muestra las suites disponibles
"""
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

PRUEBAS = Path(__file__).resolve().parent
RAIZ = PRUEBAS.parent
BACKEND = RAIZ / "backend"
EVIDENCIAS = PRUEBAS / "evidencias"
INTEROPERABILIDAD = "compatibilidad/interoperabilidad"
COEXISTENCIA = "compatibilidad/coexistencia"
SERVICIOS = ["gateway", "servicio-postulantes", "servicio-empresas-vacantes", "servicio-procesos-seleccion",
             "servicio-comunicaciones"]


@dataclass
class Suite:
    nombre: str
    ruta: str  # carpeta o archivo, relativo a tests/
    servicio: str | None  # cuyo código importan las pruebas (None = ninguno)
    caracteristica: str
    entorno: dict[str, str] = field(default_factory=dict)


SUITES = [
    Suite("meta-whatsapp", f"{INTEROPERABILIDAD}/meta_whatsapp", "servicio-comunicaciones", "Interoperabilidad"),
    Suite("correo-ses", f"{INTEROPERABILIDAD}/correo_ses", "servicio-postulantes", "Interoperabilidad"),
    Suite("almacenamiento-s3", f"{INTEROPERABILIDAD}/almacenamiento_s3", "servicio-postulantes", "Interoperabilidad"),
    *[
        Suite(f"contrato-{servicio}", f"{INTEROPERABILIDAD}/contratos_api/test_contrato_servicio.py", servicio,
              "Interoperabilidad", {"CONTRATO_SERVICIO": servicio})
        for servicio in SERVICIOS
    ],
    Suite("contrato-consumidores", f"{INTEROPERABILIDAD}/contratos_api/test_consumidores_frontend.py", None,
          "Interoperabilidad"),
    Suite("coexistencia-infraestructura", f"{COEXISTENCIA}/infraestructura_compartida", None, "Co-existencia"),
    Suite("coexistencia-sesiones", f"{COEXISTENCIA}/sesiones_erp_portal", "gateway", "Co-existencia"),
]

# Valores de prueba: la configuración de los servicios se lee al importarlos, pero ninguna prueba se
# conecta a la base de datos, a Meta ni a AWS (se usan dobles: respx y moto).
ENTORNO_BASE = {
    "DATABASE_URL": "postgresql+asyncpg://prueba:prueba@localhost:5432/prueba",
    "JWT_SECRET": "jwt-de-prueba",
    "GATEWAY_SHARED_SECRET": "hmac-de-prueba",
    "URL_SERVICIO_POSTULANTES": "http://servicio-postulantes:8001",
    "URL_SERVICIO_EMPRESAS_VACANTES": "http://servicio-empresas-vacantes:8002",
    "URL_SERVICIO_PROCESOS_SELECCION": "http://servicio-procesos-seleccion:8003",
    "URL_SERVICIO_COMUNICACIONES": "http://servicio-comunicaciones:8004",
    # Credenciales FALSAS para moto: así ninguna prueba puede llegar a la cuenta real de AWS.
    "AWS_ACCESS_KEY_ID": "testing",
    "AWS_SECRET_ACCESS_KEY": "testing",
    "AWS_SESSION_TOKEN": "testing",
    "AWS_DEFAULT_REGION": "us-east-1",
    "AWS_REGION": "us-east-1",
    "PYTHONDONTWRITEBYTECODE": "1",
}


def correr(suite: Suite, actualizar_contratos: bool) -> int:
    entorno = {k: v for k, v in os.environ.items() if k not in ("AWS_PROFILE", "AWS_DEFAULT_PROFILE")}
    entorno.update(ENTORNO_BASE)
    entorno.update(suite.entorno)
    rutas = [str(BACKEND / "libs" / "shared")]
    if suite.servicio:
        rutas.insert(0, str(BACKEND / suite.servicio))
    entorno["PYTHONPATH"] = os.pathsep.join(rutas)
    if actualizar_contratos:
        entorno["ACTUALIZAR_CONTRATOS"] = "1"

    comando = [
        sys.executable, "-m", "pytest", str(PRUEBAS / suite.ruta),
        "-q", "-p", "no:cacheprovider", "--import-mode=importlib", f"--rootdir={PRUEBAS}",
        "-o", "asyncio_mode=auto", "-o", "asyncio_default_fixture_loop_scope=function",
        "-o", f"junit_suite_name={suite.nombre}",
        f"--junitxml={EVIDENCIAS / (suite.nombre + '.xml')}",
    ]
    print(f"\n=== {suite.nombre}  ({suite.caracteristica} · {suite.ruta})", flush=True)
    return subprocess.run(comando, cwd=RAIZ, env=entorno).returncode


def resumir(suites: list[Suite], codigos: dict[str, int]) -> str:
    filas = []
    totales = [0, 0, 0, 0]
    for suite in suites:
        reporte = EVIDENCIAS / f"{suite.nombre}.xml"
        if not reporte.exists():
            filas.append(f"| {suite.nombre} | {suite.caracteristica} | — | — | — | — | ❌ sin reporte |")
            continue
        raiz = ET.parse(reporte).getroot()
        nodo = raiz if raiz.tag == "testsuite" else raiz.find("testsuite")
        pruebas, fallas, errores, omitidas = (int(nodo.get(c, 0)) for c in ("tests", "failures", "errors", "skipped"))
        totales = [a + b for a, b in zip(totales, (pruebas, fallas, errores, omitidas))]
        estado = "✅ pasa" if codigos[suite.nombre] == 0 else "❌ falla"
        filas.append(f"| {suite.nombre} | {suite.caracteristica} | {pruebas} | {fallas} | {errores} | {omitidas} | {estado} |")
    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=RAIZ, capture_output=True, text=True).stdout.strip()
    return "\n".join([
        "# Resumen de pruebas de compatibilidad (ISO/IEC 25010)",
        "",
        f"- Fecha: {datetime.now():%Y-%m-%d %H:%M}",
        f"- Commit: `{commit or 'desconocido'}`",
        f"- Python: {sys.version.split()[0]}",
        "",
        "| Suite | Característica | Pruebas | Fallas | Errores | Omitidas | Resultado |",
        "|---|---|---|---|---|---|---|",
        *filas,
        f"| **Total** | | **{totales[0]}** | **{totales[1]}** | **{totales[2]}** | **{totales[3]}** | |",
        "",
    ])


def main(argumentos: list[str]) -> int:
    if "--listar" in argumentos:
        for suite in SUITES:
            print(f"{suite.nombre:32} {suite.caracteristica:18} {suite.ruta}")
        return 0
    actualizar = "--actualizar-contratos" in argumentos
    pedidas = [a for a in argumentos if not a.startswith("--")]
    elegidas = [s for s in SUITES if not pedidas or s.nombre in pedidas]
    if actualizar and not pedidas:
        elegidas = [s for s in SUITES if s.nombre.startswith("contrato-") and s.servicio]
    desconocidas = set(pedidas) - {s.nombre for s in SUITES}
    if desconocidas:
        print(f"Suites desconocidas: {', '.join(sorted(desconocidas))}. Usa --listar.")
        return 2

    EVIDENCIAS.mkdir(exist_ok=True)
    codigos = {suite.nombre: correr(suite, actualizar) for suite in elegidas}
    resumen = resumir(elegidas, codigos)
    (EVIDENCIAS / "resumen.md").write_text(resumen, encoding="utf-8")
    print("\n" + resumen)
    print(f"Reportes en {EVIDENCIAS}")
    return 0 if all(c == 0 for c in codigos.values()) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
