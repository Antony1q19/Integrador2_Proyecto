"""Capturas del CÓDIGO de las pruebas de compatibilidad (por tipo de prueba, por fallo inyectado y por
hallazgo de la matriz), para la presentación.

Toma fragmentos de los archivos tal como están en el repositorio y los dibuja como una ventana de
editor (mismo estilo que las demás capturas). Las líneas en azul son las que se explican en la diapositiva.

    python tests/demostracion/codigo_pruebas.py

Capturas: docs/calidad/codigo-pruebas/
"""
import html
import json
import subprocess
import sys
from pathlib import Path

DEMO = Path(__file__).resolve().parent
sys.path.insert(0, str(DEMO))
import demostrar_errores as base  # noqa: E402  (estilos y resaltado de código)

RAIZ = base.RAIZ
SALIDA = RAIZ / "docs" / "calidad" / "codigo-pruebas"
PRUEBAS = "tests/compatibilidad"
META = f"{PRUEBAS}/interoperabilidad/meta_whatsapp/test_cliente_whatsapp.py"
SES = f"{PRUEBAS}/interoperabilidad/correo_ses/test_correo_ses.py"
S3 = f"{PRUEBAS}/interoperabilidad/almacenamiento_s3/test_almacenamiento_s3.py"
CONSUMIDORES = f"{PRUEBAS}/interoperabilidad/contratos_api/test_consumidores_frontend.py"
CONTRATO = f"{PRUEBAS}/interoperabilidad/contratos_api/test_contrato_servicio.py"
INFRA = f"{PRUEBAS}/coexistencia/infraestructura_compartida/test_infraestructura_compartida.py"
SESIONES = f"{PRUEBAS}/coexistencia/sesiones_erp_portal/test_sesiones_separadas.py"
NAV = f"{PRUEBAS}/navegadores/pruebas"

# (nombre, etiqueta, nota al pie, [(archivo, [(primera, última), ...], {líneas resaltadas}), ...])
# Varios rangos del mismo archivo se separan con "⋮" (líneas omitidas). Etiqueta: PRUEBA o CÓDIGO.
FRAGMENTOS = [
    # ---- una por tipo de prueba (Sprints 1 y 3)
    ("1-meta-whatsapp", "PRUEBA", "Cada fila simula (con respx) un error de Meta y fija qué debe responder el ERP: 400 si es culpa del dato, 503 si es de Meta.",
     [(META, [(136, 139), (152, 161)], set())]),
    ("2-coexistencia", "PRUEBA", "Leen la infraestructura como código (CloudFormation) y el código compartido de la base de datos.",
     [(INFRA, [(85, 85), (88, 97), (131, 135)], set())]),
    ("3-navegadores", "PRUEBA", "base.ts se aplica a TODAS las pruebas: una respuesta 5xx o un error de JavaScript hace fallar la prueba.",
     [(f"{NAV}/base.ts", [(7, 16)], set()), (f"{NAV}/portal.spec.ts", [(39, 42)], set())]),
    # ---- la prueba que detecta cada fallo inyectado (en azul: lo que falla cuando se inyecta el fallo)
    ("fallo1-prueba", "PRUEBA", "Con el fallo inyectado, el caso de la línea 139 (código 200) recibe SolicitudInvalida en vez de ServicioNoDisponible.",
     [(META, [(136, 139), (152, 161)], {139, 158})]),
    ("fallo2-prueba", "PRUEBA", "Lee el enlace del correo como lo haría el navegador: con el fallo, el correo llega como 'ana postula@correo.com'.",
     [(SES, [(62, 70)], {68, 69})]),
    ("fallo3-prueba", "PRUEBA", "Con CONEXIONES_EXTRA = 20 la suma da 115 conexiones y el assert de la línea 97 falla (máximo permitido: 56).",
     [(INFRA, [(85, 85), (88, 97)], {96, 97})]),
    ("fallo4-prueba", "PRUEBA", "Con el rol de postulantes en comunicaciones, el conjunto de la línea 135 tiene dos servicios y la prueba falla.",
     [(INFRA, [(131, 135)], {134, 135})]),
    ("fallo5-prueba", "PRUEBA", "Con el middleware mal escrito, /perfil no redirige a /login y la línea 41 falla.",
     [(f"{NAV}/portal.spec.ts", [(39, 42)], {40, 41})]),
    # ---- matriz de hallazgos
    ("h1", "PRUEBA", "H1 · El cliente de Meta ahora tiene 33 pruebas: formato exacto de cada petición y versión configurable.",
     [(META, [(34, 48)], {41, 43})]),
    ("h2", "PRUEBA", "H2 · Correo (SES) y documentos (S3) con 20 pruebas sobre la API real de boto3 simulada con moto.",
     [(SES, [(62, 69)], {68}), (S3, [(19, 25), (35, 40)], {25, 40})]),
    ("h3", "PRUEBA", "H3 · Cada llamada del ERP y del portal se compara con el contrato OpenAPI aprobado del servicio que la atiende.",
     [(CONSUMIDORES, [(124, 132)], {130}), (CONTRATO, [(80, 85)], {85})]),
    ("h4", "PRUEBA", "H4 · Pruebas de Playwright del ERP: el mismo código corre en Chrome, Firefox, Safari, Android e iPhone.",
     [(f"{NAV}/erp.spec.ts", [(5, 25)], {20, 24})]),
    ("h5", "PRUEBA", "H5 · La co-existencia se mide: un token del portal no abre el ERP, y en el navegador cada sistema tiene su propia cookie.",
     [(SESIONES, [(43, 53)], {46, 52}), (f"{NAV}/coexistencia.spec.ts", [(8, 16)], {10, 13})]),
    ("h6", "PRUEBA", "H6 · Pendiente: la versión es una variable; la prueba A5 confirma que migrar es solo cambiar META_API_VERSION.",
     [("backend/servicio-comunicaciones/app/core/config.py", [(12, 12)], {12}), (META, [(184, 191)], {186, 187})]),
    ("h7", "CÓDIGO", "H7 · Pendiente: el remitente es una dirección de Gmail; falta un dominio propio verificado en SES con DKIM y SPF.",
     [("infra/aws/config.env", [(7, 8)], {8})]),
    ("h8", "CÓDIGO", "H8 · Filtro de métricas sobre el log + alarma: 3 errores de Meta en 5 minutos envían un correo. Patrón probado con aws logs test-metric-filter.",
     [("infra/aws/base.yaml", [(368, 379), (383, 391)], {372, 388})]),
    ("h9-h10", "PRUEBA", "H9 y H10 · Esta prueba falló con el código original (7 casos) y pasa con la corrección: bloqueo, límite y 5xx → 503; HTML → 503.",
     [(META, [(136, 147), (158, 161)], {139, 140, 142, 143, 144, 145, 147})]),
    ("h11", "PRUEBA", "H11 · Esta prueba falló con el contrato del Gateway: la ruta del proxy repetía el mismo operationId en 5 métodos.",
     [(CONTRATO, [(68, 77)], {69, 77})]),
    ("h12", "CÓDIGO", "H12 · Aceptado: el límite por IP vive en la memoria del proceso; válido mientras el Gateway tenga 1 réplica.",
     [("backend/gateway/app/core/limite_peticiones.py", [(7, 8), (47, 48)], {7, 48})]),
    ("h13", "PRUEBA", "H13 · Pendiente: las llamadas cuya ruta está en una variable no se pueden verificar sin ejecutar (Schemathesis en la VPC).",
     [(CONSUMIDORES, [(60, 66)], {62, 63})]),
]

ESTILO_EXTRA = ("<style>.ventana{width:1100px} pre{font-size:20px;line-height:1.5} .barra,.nota{font-size:17px}"
                ".archivo{padding:8px 16px;background:#252526;color:#9cdcfe;font:600 16px 'Segoe UI',Arial;border-top:1px solid #3c3c3c}"
                ".salto{color:#858585;padding-left:70px} .l.marca{background:rgba(47,111,159,.45)}</style>")


def html_fragmento(etiqueta: str, nota: str, partes: list) -> str:
    bloques = []
    for archivo, rangos, marcadas in partes:
        todas = (RAIZ / archivo).read_text(encoding="utf-8").splitlines()
        extension = Path(archivo).suffix
        filas = []
        for k, (desde, hasta) in enumerate(rangos):
            if k:
                filas.append('<div class="salto">⋮</div>')
            filas += [f'<div class="l {"marca" if n in marcadas else ""}"><span class="n">{n}</span>'
                      f'<span>{base._resaltar(todas[n - 1], extension) or "&nbsp;"}</span></div>' for n in range(desde, hasta + 1)]
        bloques.append(f"<div class='archivo'>{html.escape(archivo)}</div><pre>{''.join(filas)}</pre>")
    titulo = "Código de la prueba" if etiqueta == "PRUEBA" else "Código del sistema"
    return (f"<!doctype html><meta charset='utf-8'><style>{base.ESTILO}</style>{ESTILO_EXTRA}<div class='ventana'>"
            f"<div class='barra'><span class='punto' style='background:#ff5f56'></span><span class='punto' style='background:#ffbd2e'></span>"
            f"<span class='punto' style='background:#27c93f'></span>&nbsp;{titulo}<span class='etiqueta' style='background:#2f6f9f'>{etiqueta}</span></div>"
            f"{''.join(bloques)}<div class='nota'>{html.escape(nota)}</div></div>")


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)
    trabajos = []
    for nombre, etiqueta, nota, partes in FRAGMENTOS:
        pagina = SALIDA / f"{nombre}.html"
        pagina.write_text(html_fragmento(etiqueta, nota, partes), encoding="utf-8")
        trabajos.append({"html": str(pagina), "salida": str(pagina.with_suffix(".png"))})
    lista = SALIDA / ".trabajos.json"
    lista.write_text(json.dumps(trabajos), encoding="utf-8")
    subprocess.run(["node", str(DEMO / "capturar.cjs"), str(lista)], check=True, capture_output=True)
    lista.unlink()
    for t in trabajos:
        Path(t["html"]).unlink()
        print("captura:", t["salida"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
