"""Dibuja la salida de Playwright (resultados.json) como una captura de terminal, por etapa.

    python tests/usabilidad/programas/capturar_terminal.py antes
    python tests/usabilidad/programas/capturar_terminal.py despues

Salida: tests/usabilidad/evidencias/<etapa>/terminal-playwright.png  (usa capturar.cjs de tests/demostracion).
"""
import html
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
sys.path.insert(0, str(RAIZ / "tests" / "demostracion"))
from demostrar_errores import ESTILO  # noqa: E402  (mismo estilo de ventana que las demás evidencias)


def casos(etapa: str, archivo: str = "resultados.json") -> list[tuple[str, str, str, str]]:
    ruta = RAIZ / "tests/usabilidad/evidencias" / etapa / archivo
    if not ruta.exists():
        return []
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    filas = []

    def recorrer(suite):
        for spec in suite.get("specs", []):
            for t in spec["tests"]:
                if not t["results"] or t["results"][-1]["status"] == "skipped":
                    continue
                r = t["results"][-1]
                error = re.sub(r"\x1b\[[0-9;]*m", "", (r.get("error") or {}).get("message", ""))
                primera = next((l.strip() for l in error.splitlines() if l.strip()), "")
                filas.append((t["projectName"], spec["title"], r["status"], primera))
        for hija in suite.get("suites", []):
            recorrer(hija)

    for s in datos["suites"]:
        recorrer(s)
    return filas


def main(etapa: str) -> None:
    filas = [f for f in casos(etapa) + casos(etapa, "resultados-flujo.json") if f[0] != "sesion"]
    lineas = []
    for proyecto, titulo, estado, error in filas:
        ok = estado in ("passed", "expected")
        marca = "✓" if ok else "✘"
        clase = "verde" if ok else "rojo"
        texto = f"{marca} [{proyecto}] {titulo}"
        lineas.append(f'<span class="{clase}">{html.escape(texto[:118])}</span>')
        if not ok and error:
            lineas.append(f'<span class="gris">      {html.escape(error[:110])}</span>')
    pasan = sum(1 for f in filas if f[2] in ("passed", "expected"))
    fallan = len(filas) - pasan
    lineas.append("")
    if fallan:
        lineas.append(f'<span class="rojo">  {fallan} failed</span>')
    lineas.append(f'<span class="verde">  {pasan} passed</span>')
    etiqueta = (f'<span class="etiqueta {"mal" if fallan else "bien"}">{etapa.upper()} · {pasan} de {len(filas)} pasan</span>')
    pagina = (f"<!doctype html><meta charset='utf-8'><style>{ESTILO}</style><div class='ventana terminal'>"
              f"<div class='barra'>PowerShell · Terminal{etiqueta}</div>"
              f"<pre><span class='prompt'>PS ...\\tests\\usabilidad\\programas&gt;</span> $env:ETAPA=\"{etapa}\"; npx playwright test\n\n"
              + "\n".join(lineas) +
              f"</pre><div class='nota'>Playwright 1.56 + axe-core 4.10 · Chrome escritorio y Pixel 7 · {datetime.now():%d/%m/%Y %H:%M}</div></div>")
    salida = RAIZ / "tests/usabilidad/evidencias" / etapa / "terminal-playwright.png"
    temporal = salida.with_suffix(".html")
    temporal.write_text(pagina, encoding="utf-8")
    trabajos = salida.with_name(".trabajos.json")
    trabajos.write_text(json.dumps([{"html": str(temporal), "salida": str(salida)}]), encoding="utf-8")
    subprocess.run(["node", str(RAIZ / "tests/demostracion/capturar.cjs"), str(trabajos)], check=True, capture_output=True)
    temporal.unlink()
    trabajos.unlink()
    print(f"{salida} · {pasan}/{len(filas)}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "despues")
