"""Dibuja las verificaciones de cada funcionalidad (antes y después) como imágenes para el informe.

    python tests/funcionalidad/programas/capturar_verificaciones.py

Lee evidencias/{antes,despues}/verificaciones.json y escribe:
  evidencias/verificaciones/Fxx.png          tabla de la funcionalidad: esperado · antes · después
  evidencias/<etapa>/terminal-playwright.png la corrida completa de esa etapa (✓ / ✗ por verificación)
"""
import html
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
EV = RAIZ / "tests" / "funcionalidad" / "evidencias"
sys.path.insert(0, str(RAIZ / "tests" / "demostracion"))
from demostrar_errores import ESTILO  # noqa: E402

TABLA = """
.ventana { width: 1500px; background: #ffffff; }
.barra { background: #0f3b3a; color: #e6f2f1; font-size: 17px; }
table { width: 100%; border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; font-size: 17px; color: #1f2933; }
th { background: #e7efee; text-align: left; padding: 10px 14px; font-size: 15px; color: #0f3b3a; }
td { padding: 10px 14px; border-top: 1px solid #e3e8e8; vertical-align: top; }
td.sub { font-weight: 700; color: #0f6b5b; white-space: nowrap; }
td.tok { color: #0e8a6b; font-weight: 700; white-space: nowrap; } td.tmal { color: #c0392b; font-weight: 700; white-space: nowrap; }
td.mono { font-family: 'Cascadia Mono', Consolas, monospace; font-size: 15px; color: #374151; }
"""


def bonito(texto: str) -> str:
    """'{"admin":"Admin","rrhh":"RRHH"}' → 'admin: Admin · rrhh: RRHH' (más legible en la tabla)."""
    try:
        datos = json.loads(texto)
    except (ValueError, TypeError):
        return texto
    if isinstance(datos, dict):
        return " · ".join(f"{k.split('@')[0]}: {'sí' if v is True else 'no' if v is False else v}" for k, v in datos.items())
    if isinstance(datos, list):
        return ", ".join(str(x) for x in datos)
    return texto


def cargar(etapa: str) -> dict:
    f = EV / etapa / "verificaciones.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def ventana(titulo: str, etiqueta: str, cuerpo: str, nota: str, clase: str = "bien") -> str:
    return (f"<!doctype html><meta charset='utf-8'><style>{ESTILO}{TABLA}</style><div class='ventana'>"
            f"<div class='barra'>{html.escape(titulo)}<span class='etiqueta {clase}'>{html.escape(etiqueta)}</span></div>"
            f"{cuerpo}<div class='nota' style='background:#f4f7f7;color:#4b5563;border-top:1px solid #e3e8e8'>{html.escape(nota)}</div></div>")


def celda(x: dict | None) -> str:
    if not x:
        return "<td class='mono'>—</td>"
    clase = "tok" if x["ok"] else "tmal"
    marca = "✓" if x["ok"] else "✗"
    return f"<td class='{clase}'>{marca} <span style='font-weight:400;color:#374151'>{html.escape(bonito(x['obtenido'])[:80])}</span></td>"


def main() -> None:
    antes, despues = cargar("antes"), cargar("despues")
    base = despues or antes
    funcs = base["funcionalidades"]
    a = {x["id"]: x for x in antes.get("verificaciones", [])}
    d = {x["id"]: x for x in despues.get("verificaciones", [])}
    salida = EV / "verificaciones"
    salida.mkdir(parents=True, exist_ok=True)
    trabajos = []
    for clave, nombre in funcs.items():
        ids = sorted({i for i in list(a) + list(d) if i.startswith(clave + "-")},
                     key=lambda i: ("COI".index(i[4]) if i[4] in "COI" else 9, i))
        filas = []
        for i in ids:
            ref = d.get(i) or a.get(i)
            filas.append(f"<tr><td class='sub'>{ {'C': 'Completitud', 'O': 'Corrección', 'I': 'Idoneidad'}.get(i[4], '')}</td>"
                         f"<td>{html.escape(ref['que'])}</td><td class='mono'>{html.escape(bonito(ref['esperado'])[:80])}</td>"
                         f"{celda(a.get(i))}{celda(d.get(i)) if despues else ''}</tr>")
        cabecera = "<tr><th>Subcaract.</th><th>Verificación</th><th>Esperado</th><th>Antes</th>" + ("<th>Después</th>" if despues else "") + "</tr>"
        todas_ok = all((d.get(i) or a.get(i))["ok"] for i in ids)
        pagina = ventana(f"{clave} · {nombre}", f"{sum((d.get(i) or a.get(i))['ok'] for i in ids)} de {len(ids)} se cumplen",
                         f"<table>{cabecera}{''.join(filas)}</table>",
                         "Playwright contra AWS · antes = versión sin la corrección de F09 · después = versión publicada con la corrección",
                         "bien" if todas_ok else "mal")
        f = salida / f"{clave}.html"
        f.write_text(pagina, encoding="utf-8")
        trabajos.append({"html": str(f), "salida": str(f.with_suffix(".png"))})

    for etapa, datos in (("antes", antes), ("despues", despues)):
        if not datos:
            continue
        lineas = []
        for clave, nombre in datos["funcionalidades"].items():
            xs = [x for x in datos["verificaciones"] if x["id"].startswith(clave + "-")]
            bien = sum(x["ok"] for x in xs)
            clase = "verde" if bien == len(xs) else "rojo"
            lineas.append(f"<span class='{clase}'>{'✓' if bien == len(xs) else '✘'} {clave} · {html.escape(nombre):<34} {bien} de {len(xs)}</span>")
            for x in xs:
                if not x["ok"]:
                    lineas.append(f"<span class='rojo'>      ✘ {html.escape(x['id'])} {html.escape(x['que'][:80])}</span>")
                    lineas.append(f"<span class='gris'>        esperado {html.escape(bonito(x['esperado'])[:70])}</span>")
                    lineas.append(f"<span class='gris'>        obtenido {html.escape(bonito(x['obtenido'])[:70])}</span>")
        ok = sum(x["ok"] for x in datos["verificaciones"])
        total = len(datos["verificaciones"])
        pagina = (f"<!doctype html><meta charset='utf-8'><style>{ESTILO}</style><div class='ventana terminal'>"
                  f"<div class='barra'>PowerShell · Terminal<span class='etiqueta {'bien' if ok == total else 'mal'}'>{etapa.upper()} · {ok} de {total}</span></div>"
                  f"<pre style='font-size:17px;line-height:1.5'><span class='prompt'>PS ...\\tests\\funcionalidad\\programas&gt;</span> "
                  f"$env:ETAPA=\"{etapa}\"; $env:DATOS_PRUEBA=\"1\"; npx playwright test\n\n" + "\n".join(lineas) +
                  f"\n\n<span class='{'verde' if ok == total else 'rojo'}'>  {ok} de {total} verificaciones se cumplen</span></pre>"
                  f"<div class='nota'>Playwright 1.56 · ERP y portal en AWS · datos de prueba: sello {datos['datos'].get('sello')} · "
                  f"{datos['fecha'][:16].replace('T', ' ')} UTC</div></div>")
        f = EV / etapa / "terminal-playwright.html"
        f.write_text(pagina, encoding="utf-8")
        trabajos.append({"html": str(f), "salida": str(f.with_suffix(".png"))})

    lista = salida / ".trabajos.json"
    lista.write_text(json.dumps(trabajos), encoding="utf-8")
    subprocess.run(["node", str(RAIZ / "tests/demostracion/capturar.cjs"), str(lista)], check=True, capture_output=True)
    lista.unlink()
    for t in trabajos:
        Path(t["html"]).unlink()
    print(f"{len(trabajos)} imágenes · {datetime.now():%H:%M}")


if __name__ == "__main__":
    main()
