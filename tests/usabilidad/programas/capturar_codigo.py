"""Capturas del código ANTES y DESPUÉS de cada corrección de usabilidad, sacadas de git.

    python tests/usabilidad/programas/capturar_codigo.py [commit_correccion]

ANTES = <commit>^ (versión desplegada el 01-11) · DESPUÉS = archivo actual en disco.
Salida: tests/usabilidad/evidencias/codigo/<ID>-codigo-antes.png y <ID>-codigo-despues.png
"""
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
SALIDA = RAIZ / "tests" / "usabilidad" / "evidencias" / "codigo"
sys.path.insert(0, str(RAIZ / "tests" / "demostracion"))
import demostrar_errores as base  # noqa: E402

# (ID, archivo, texto a marcar ANTES, texto a marcar DESPUÉS[, versión ANTES; por defecto <commit>^])
CAMBIOS = [
    ("CP-USAB-01", "frontend/ERP/middleware.ts",
     "return NextResponse.redirect(new URL(inicio, request.url));",
     "return NextResponse.redirect(new URL(`${inicio}?acceso_denegado=dashboard`, request.url));"),
    ("CP-USAB-02", "frontend/ERP/features/postulantes/components/PostulanteForm/SectionNavigation.tsx",
     '<div className="flex items-center justify-center gap-2">',
     "Paso {currentSection + 1} de {totalSections}"),
    ("CP-USAB-03", "frontend/ERP/features/anuncios/components/AnunciosView.tsx",
     "if (anuncios.length === 0) {", "Crear Primer Anuncio"),
    ("CP-USAB-07", "frontend/ERP/features/postulantes/hooks/usePostulanteForm.ts",
     "// RETORNO", 'window.addEventListener("beforeunload", handleBeforeUnload);'),
    ("CP-USAB-12", "frontend/ANUNCIOS/features/anuncios/components/JobDetailPanel.tsx",
     "{postulando ? 'Postulando...' : 'Postularme a esta oferta'}", "Ya postulado", "HEAD"),  # hallazgo nuevo
    ("CP-USAB-13", "frontend/ERP/features/postulantes/components/PostulanteForm/DatosPersonalesSection.tsx",
     '<label className="block text-sm font-medium text-slate-700">',
     "<label htmlFor={nombresId}"),
    ("CP-USAB-16", "frontend/ANUNCIOS/app/not-found.tsx", None, "Página o vacante no encontrada"),
    ("CP-USAB-18", "frontend/ERP/app/(dashboard)/layout.tsx",
     '<p className="text-xs text-slate-400">', '<p className="text-xs text-slate-600">'),
    ("CP-USAB-18b","frontend/ANUNCIOS/app/registro/page.tsx",
     'Teléfono <span className="text-gray-400 font-normal">(Opcional)</span>',
     'Teléfono <span className="text-gray-600 font-normal">(Opcional)</span>'),
    ("CP-USAB-22", "frontend/ANUNCIOS/features/anuncios/components/AnunciosBuscador.tsx",
     "min-h-[36px] sm:min-h-[32px]", "min-h-[44px] sm:min-h-[32px]", "8dabb68"),  # hallazgo nuevo: 36 px
]


def _fragmento(texto: str, marca: str, contexto: int = 4) -> dict:
    texto = texto.replace("\r\n", "\n")
    lineas = texto.split("\n")
    linea = texto.count("\n", 0, texto.index(marca)) + 1
    desde, hasta = max(1, linea - contexto), min(len(lineas), linea + contexto)
    return {"lineas": [(n, lineas[n - 1]) for n in range(desde, hasta + 1)], "marcada": linea}


def main(commit: str) -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    trabajos, informe = [], {}
    for cp, archivo, marca_antes, marca_despues, *version in CAMBIOS:
        despues = (RAIZ / archivo).read_text(encoding="utf-8")
        r = subprocess.run(["git", "show", f"{version[0] if version else commit + chr(94)}:{archivo}"], cwd=RAIZ, capture_output=True, text=True, encoding="utf-8")
        antes = r.stdout if r.returncode == 0 else None
        e = SimpleNamespace(archivo=archivo, con_error=marca_antes or "", correcto=marca_despues)
        piezas = []
        if antes is not None and marca_antes:
            f = _fragmento(antes, marca_antes)
            piezas.append(("codigo-antes", base.html_codigo(e, f, True).replace("ANTES · código con el error", ("ANTES · versión del 05-11 (36 px)" if cp == "CP-USAB-22" else "ANTES · versión desplegada") if version else "ANTES · versión del 01-11"), f["marcada"]))
        f = _fragmento(despues, marca_despues)
        piezas.append(("codigo-despues", base.html_codigo(e, f, False).replace("DESPUÉS · código corregido", "DESPUÉS · código actual"), f["marcada"]))
        informe[cp] = {"archivo": archivo, "existia_antes": antes is not None, **{n: l for n, _, l in piezas}}
        for nombre, contenido, _ in piezas:
            pagina = SALIDA / f"{cp}-{nombre}.html"
            pagina.write_text(contenido.replace("</style>", "</style><style>.ventana{width:1150px} pre{font-size:17px}</style>", 1), encoding="utf-8")
            trabajos.append({"html": str(pagina), "salida": str(pagina.with_suffix(".png"))})
    lista = SALIDA / ".trabajos.json"
    lista.write_text(json.dumps(trabajos), encoding="utf-8")
    subprocess.run(["node", str(RAIZ / "tests/demostracion/capturar.cjs"), str(lista)], check=True, capture_output=True)
    lista.unlink()
    for t in trabajos:
        Path(t["html"]).unlink()
    (SALIDA / "lineas.json").write_text(json.dumps(informe, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(informe, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "8dabb68")
