"""Evidencia de los DEFECTOS REALES que encontraron las pruebas y que se corrigieron (H9, H10, H11).

A diferencia de demostrar_errores.py (errores introducidos a propósito), aquí el "antes" es el código
ORIGINAL del repositorio, tal como estaba en el commit anterior a la corrección. Para cada defecto:
(1) se pone temporalmente el código original, (2) se ejecuta la prueba y FALLA, (3) se vuelve al código
corregido y (4) la misma prueba PASA. Se capturan el código (con las líneas que cambió la corrección
resaltadas) y el resultado de la prueba.

    python tests/demostracion/defectos_reales.py

El código corregido se guarda byte a byte y se restaura siempre; al final se verifica que quedó idéntico.
Capturas: docs/calidad/defectos-reales/
"""
import difflib
import html
import json
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

DEMO = Path(__file__).resolve().parent
sys.path.insert(0, str(DEMO))
import demostrar_errores as base  # noqa: E402  (entorno de prueba, estilos y lectura de la salida)

RAIZ = base.RAIZ
SALIDA = RAIZ / "docs" / "calidad" / "defectos-reales"
COMMIT_ANTES = "bbc56f8"  # último commit con el código ANTES de las correcciones


@dataclass
class Defecto:
    clave: str
    hallazgos: str
    titulo: str
    archivo: str
    prueba: str
    filtro: str
    servicio: str
    antes_desde: str
    antes_hasta: str
    despues_desde: str
    despues_hasta: str
    entorno: dict = field(default_factory=dict)


DEFECTOS = [
    Defecto(
        "meta", "H9 · H10", "Errores de Meta mal interpretados por el ERP",
        "backend/servicio-comunicaciones/app/infrastructure/whatsapp_client.py",
        "tests/compatibilidad/interoperabilidad/meta_whatsapp/test_cliente_whatsapp.py",
        "200-api-bloqueada or 130429-limite or 500-error-meta or 502-html", "servicio-comunicaciones",
        "    if respuesta.status_code >= 400:", "        raise SolicitudInvalida(motivo)",
        "    if respuesta.status_code >= 400:", "        raise SolicitudInvalida(motivo)",
    ),
    Defecto(
        "openapi", "H11", "Contrato OpenAPI del Gateway inválido",
        "backend/gateway/app/api/v1/proxy.py",
        "tests/compatibilidad/interoperabilidad/contratos_api/test_contrato_servicio.py",
        "openapi_3_valido or operation_id", "gateway",
        "@router.api_route(", "async def reenviar(",
        "for _metodo in (", '        "/{servicio}{ruta:path}", reenviar',
        entorno={"CONTRATO_SERVICIO": "gateway"},
    ),
]


def bloque(texto: str, desde: str, hasta: str) -> tuple[int, list[str]]:
    """(número de la primera línea, líneas) desde la línea que contiene `desde` hasta la que contiene `hasta`."""
    lineas = texto.replace("\r\n", "\n").split("\n")
    i = next(n for n, l in enumerate(lineas) if desde in l)
    j = next(n for n in range(i, len(lineas)) if hasta in lineas[n])
    return i + 1, lineas[i:j + 2 if lineas[j + 1].strip() == ")" else j + 1]


def html_codigo(defecto: Defecto, inicio: int, lineas: list[str], cambiadas: set[int], antes: bool) -> str:
    extension = Path(defecto.archivo).suffix
    clase = "marca-mal" if antes else "marca-bien"
    filas = "".join(
        f'<div class="l {clase if i in cambiadas else ""}"><span class="n">{inicio + i}</span>'
        f'<span>{base._resaltar(t, extension) or "&nbsp;"}</span></div>' for i, t in enumerate(lineas))
    etiqueta = (f'<span class="etiqueta mal">ANTES · código original ({COMMIT_ANTES})</span>' if antes
                else '<span class="etiqueta bien">DESPUÉS · código corregido</span>')
    nota = ("En rojo: las líneas que la corrección reemplazó." if antes else "En verde: las líneas nuevas de la corrección.")
    return (f"<!doctype html><meta charset='utf-8'><style>{base.ESTILO}</style>{base.ESTILO_COMPACTO}<div class='ventana'>"
            f"<div class='barra'><span class='punto' style='background:#ff5f56'></span><span class='punto' style='background:#ffbd2e'></span>"
            f"<span class='punto' style='background:#27c93f'></span>&nbsp;{html.escape(defecto.archivo)}{etiqueta}</div>"
            f"<pre>{filas}</pre><div class='nota'>{nota}</div></div>")


def html_resultado(defecto: Defecto, r: dict, antes: bool) -> str:
    comando = f'python -m pytest {Path(defecto.prueba).name} -k "{defecto.filtro}" -v'
    cuerpo = "\n".join(base._colorear_salida(l) for l in base._lineas_clave(r["salida"]))
    etiqueta = ('<span class="etiqueta mal">ANTES · la prueba detecta el defecto</span>' if antes
                else '<span class="etiqueta bien">DESPUÉS · la prueba pasa</span>')
    resumen = f"Resultado: FALLA (código de salida {r['codigo']})" if r["codigo"] else "Resultado: PASA (código de salida 0)"
    return (f"<!doctype html><meta charset='utf-8'><style>{base.ESTILO}</style>{base.ESTILO_COMPACTO}<div class='ventana terminal'>"
            f"<div class='barra'>PowerShell · Terminal{etiqueta}</div>"
            f"<pre><span class='prompt'>PS {html.escape(r['carpeta'])}&gt;</span> {html.escape(comando)}\n\n{cuerpo}</pre>"
            f"<div class='nota'>Salida resumida (líneas clave) · {resumen} · {datetime.now():%d/%m/%Y %H:%M}</div></div>")


def ejecutar(defecto: Defecto) -> dict:
    error = base.Error(0, "", "", "", defecto.archivo, "", "", defecto.prueba, defecto.filtro, servicio=defecto.servicio)
    viejo = dict(base.ENTORNO_BASE)
    base.ENTORNO_BASE.update(defecto.entorno)
    try:
        return base.correr_pytest(error)
    finally:
        base.ENTORNO_BASE.clear()
        base.ENTORNO_BASE.update(viejo)


def main() -> int:
    SALIDA.mkdir(parents=True, exist_ok=True)
    trabajos, informe = [], []
    for d in DEFECTOS:
        ruta = RAIZ / d.archivo
        corregido = ruta.read_bytes()
        original = subprocess.run(["git", "show", f"{COMMIT_ANTES}:{d.archivo}"], cwd=RAIZ, capture_output=True, check=True).stdout
        print(f"\n=== {d.hallazgos}: {d.titulo}")
        try:
            ruta.write_bytes(original)
            r_antes = ejecutar(d)
        finally:
            ruta.write_bytes(corregido)
        r_despues = ejecutar(d)
        if ruta.read_bytes() != corregido:
            raise RuntimeError(f"{d.archivo} no quedó idéntico al código corregido")
        print(f"  código original:  salida {r_antes['codigo']}   ·   código corregido: salida {r_despues['codigo']}")

        ini_a, lin_a = bloque(original.decode("utf-8"), d.antes_desde, d.antes_hasta)
        ini_d, lin_d = bloque(corregido.decode("utf-8"), d.despues_desde, d.despues_hasta)
        quitadas, agregadas = set(), set()
        for op, a1, a2, b1, b2 in difflib.SequenceMatcher(a=lin_a, b=lin_d, autojunk=False).get_opcodes():
            if op != "equal":
                quitadas |= set(range(a1, a2))
                agregadas |= set(range(b1, b2))
        piezas = [
            ("1-codigo-antes", html_codigo(d, ini_a, lin_a, quitadas, True)),
            ("2-resultado-antes", html_resultado(d, r_antes, True)),
            ("3-codigo-despues", html_codigo(d, ini_d, lin_d, agregadas, False)),
            ("4-resultado-despues", html_resultado(d, r_despues, False)),
        ]
        for nombre, contenido in piezas:
            pagina = SALIDA / f"{d.clave}-{nombre}.html"
            pagina.write_text(contenido, encoding="utf-8")
            trabajos.append({"html": str(pagina), "salida": str(pagina.with_suffix(".png"))})
        informe.append({"clave": d.clave, "hallazgos": d.hallazgos, "titulo": d.titulo, "archivo": d.archivo,
                        "commit_antes": COMMIT_ANTES, "falla_antes": r_antes["codigo"] != 0, "pasa_despues": r_despues["codigo"] == 0})

    lista = SALIDA / ".trabajos.json"
    lista.write_text(json.dumps(trabajos), encoding="utf-8")
    subprocess.run(["node", str(DEMO / "capturar.cjs"), str(lista)], check=True, capture_output=True)
    lista.unlink()
    for t in trabajos:
        Path(t["html"]).unlink()
    (SALIDA / "resultados.json").write_text(json.dumps(informe, ensure_ascii=False, indent=2), encoding="utf-8")
    ok = all(i["falla_antes"] and i["pasa_despues"] for i in informe)
    print("\n" + ("Todos los defectos: el código original FALLA y el corregido PASA." if ok else "REVISAR: algún resultado no fue el esperado."))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
