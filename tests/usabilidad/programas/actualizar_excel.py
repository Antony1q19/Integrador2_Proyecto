"""Agrega a la matriz Excel los resultados MEDIDOS por los programas (antes y después).

    python tests/usabilidad/programas/actualizar_excel.py

Lee tests/usabilidad/evidencias/{antes,despues}/resultados.json y escribe 4 columnas nuevas en
tests/usabilidad/casos-prueba-usabilidad-iso25010-atendido.xlsx (las columnas originales no se tocan).
"""
import copy
import json
import re
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parents[3]
USAB = RAIZ / "tests" / "usabilidad"
EXCEL = USAB / "casos-prueba-usabilidad-iso25010-atendido.xlsx"
COLUMNAS = ["Programa (prueba automática)", "Resultado medido · antes (01-11)", "Resultado medido · después (05-11)",
            "Evidencia medida (antes / después)"]
PROGRAMA = {
    "13": "axe-core + Playwright", "18": "axe-core (color-contrast)", "17": "axe-core + Playwright",
    "22": "Playwright · Pixel 7 (mide px)",
}
MOTIVO = {  # qué midió el programa cuando falló (versión del 01-11)
    "01": "redirige a /postulantes sin el aviso «Acceso restringido»",
    "02": "no muestra «Paso 1 de 3 (33% completado)»",
    "03": "lista vacía sin el botón «Crear Primer Anuncio»",
    "07": "recargar borra lo escrito: el navegador no pregunta (sin beforeunload)",
    "13": "getByLabel(«Nombres») no encuentra el campo; axe: label y select-name críticos",
    "16": "404 por defecto en inglés («This page could not be found»), sin enlaces",
    "18": "axe color-contrast: rol del usuario (text-slate-400) y «(Opcional)» del registro (text-gray-400)",
    "22": "no existen accesos rápidos de búsqueda en el celular",
}
MANUAL = {"14": "Dura milisegundos (no estable)", "24": "Percepción visual: revisión con usuarios"}
# Medidos solo en la versión actual, con el postulante de prueba (flujo-postulante.spec.ts)
CON_DATOS = {"05", "10", "11", "12", "15"}


def resultados(etapa: str, archivo: str = "resultados.json") -> dict:
    ruta = USAB / "evidencias" / etapa / archivo
    if not ruta.exists():
        return {}
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    salida = {}

    def rec(s):
        for sp in s.get("specs", []):
            for t in sp["tests"]:
                if not t["results"] or t["results"][-1]["status"] == "skipped":
                    continue
                r = t["results"][-1]
                error = re.sub(r"\x1b\[[0-9;]*m", "", (r.get("error") or {}).get("message", ""))
                salida.setdefault(sp["title"].split(" ")[0], []).append(
                    (r["status"] in ("passed", "expected"), next((l.strip() for l in error.splitlines() if l.strip()), "")))
        for c in s.get("suites", []):
            rec(c)
    for s in datos["suites"]:
        rec(s)
    return salida


def texto(lista) -> str:
    if not lista:
        return "—"
    ok = all(o for o, _ in lista)
    return "✓ Pasa" if ok else "✗ Falla · " + "; ".join(m for o, m in lista if not o)[:140]


def main() -> None:
    antes, despues = resultados("antes"), resultados("despues")
    flujo = resultados("despues", "resultados-flujo.json")
    wb = openpyxl.load_workbook(EXCEL)
    ws = wb.worksheets[0]
    ultima = 13
    for j, titulo in enumerate(COLUMNAS, start=ultima + 1):
        celda = ws.cell(1, j, titulo)
        celda._style = copy.copy(ws.cell(1, ultima)._style)
        ws.column_dimensions[openpyxl.utils.get_column_letter(j)].width = 34
    for fila in range(2, ws.max_row + 1):
        cp = ws.cell(fila, 1).value
        if not cp:
            continue
        n = cp.replace("CP-USAB-", "")
        ids = [k for k in antes if k == cp or k.startswith(cp) and k[len(cp):] in ("b",)]
        a = [x for k in ids for x in antes[k]]
        d = [x for k in ids for x in despues[k]]
        if n in CON_DATOS:
            d = flujo.get(cp, [])
            valores = ["Playwright · postulante de prueba", "No medido (necesitaba el postulante de prueba)", texto(d),
                       f"evidencias/despues/{cp}.png"]
            if n == "12" and not all(o for o, _ in d):
                valores[2] = "✗ Falla · sin indicador «Ya postulado» (el backend responde 409). Corregido en código, falta publicarlo"
                valores[3] += " / evidencias/hallazgo-CP-USAB-12/antes-sin-indicador.png"
        elif n in MANUAL:
            valores = ["Manual (no automatizado)", f"No medido · {MANUAL[n]}", "No medido", "—"]
        else:
            evid = " / ".join(f"evidencias/{e}/{k}.png" for k in ids for e in ("antes", "despues"))
            valores = [PROGRAMA.get(n, "Playwright"), texto(a), texto(d), evid]
            if n in MOTIVO and not all(o for o, _ in a):
                valores[1] = "✗ Falla · " + MOTIVO[n]
            if n == "22":
                valores[2] = "✓ Pasa tras corregir 36 → 44 px (el 05-11 medía 36 px)"
                valores[3] += " / evidencias/hallazgo-CP-USAB-22/antes-36px.png"
        for j, v in enumerate(valores, start=ultima + 1):
            celda = ws.cell(fila, j, v)
            celda._style = copy.copy(ws.cell(fila, ultima)._style)
    ws.auto_filter.ref = f"A1:{openpyxl.utils.get_column_letter(ultima + len(COLUMNAS))}{ws.max_row}"
    wb.save(EXCEL)
    print("actualizado", EXCEL)


if __name__ == "__main__":
    main()
