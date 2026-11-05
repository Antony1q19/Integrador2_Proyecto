"""Código ANTES (git) y DESPUÉS (archivo actual) de cada defecto encontrado en las pruebas de funcionalidad.

    python tests/funcionalidad/programas/capturar_codigo.py
Salida: tests/funcionalidad/evidencias/codigo/<ID>-codigo-antes.png y -despues.png
"""
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

RAIZ = Path(__file__).resolve().parents[3]
SALIDA = RAIZ / "tests" / "funcionalidad" / "evidencias" / "codigo"
sys.path.insert(0, str(RAIZ / "tests" / "demostracion"))
import demostrar_errores as base  # noqa: E402

ARCHIVO = "frontend/ERP/features/entrevistas/components/EntrevistaModal.tsx"
CAMBIOS = [  # (ID, archivo, versión antes, marca antes, marca después)
    ("F09-aviso", ARCHIVO, "HEAD", "Puedes guardarla igual si estás registrando una entrevista anterior.", "{MENSAJE_FECHA_PASADA}\n"),
    ("F09-regla", ARCHIVO, "HEAD", 'setError("Elige el postulante, la vacante y la fecha y hora.");', "if (fechaNoPermitida) {"),
]


def fragmento(texto: str, marca: str, contexto: int = 5) -> dict:
    texto = texto.replace("\r\n", "\n")
    lineas = texto.split("\n")
    linea = texto.count("\n", 0, texto.index(marca)) + 1
    return {"lineas": [(n, lineas[n - 1]) for n in range(max(1, linea - contexto), min(len(lineas), linea + contexto) + 1)], "marcada": linea}


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    trabajos = []
    for cp, archivo, version, marca_a, marca_d in CAMBIOS:
        antes = subprocess.run(["git", "show", f"{version}:{archivo}"], cwd=RAIZ, capture_output=True, text=True, encoding="utf-8").stdout
        despues = (RAIZ / archivo).read_text(encoding="utf-8")
        e = SimpleNamespace(archivo=archivo, con_error=marca_a, correcto=marca_d.strip())
        for nombre, texto, marca, es_antes in (("codigo-antes", antes, marca_a, True), ("codigo-despues", despues, marca_d, False)):
            pagina = base.html_codigo(e, fragmento(texto, marca), es_antes)
            pagina = pagina.replace("ANTES · código con el error", "ANTES · versión desplegada").replace("DESPUÉS · código corregido", "DESPUÉS · corregido")
            pagina = pagina.replace("</style>", "</style><style>.ventana{width:1150px} pre{font-size:17px}</style>", 1)
            f = SALIDA / f"{cp}-{nombre}.html"
            f.write_text(pagina, encoding="utf-8")
            trabajos.append({"html": str(f), "salida": str(f.with_suffix(".png"))})
    lista = SALIDA / ".trabajos.json"
    lista.write_text(json.dumps(trabajos), encoding="utf-8")
    subprocess.run(["node", str(RAIZ / "tests/demostracion/capturar.cjs"), str(lista)], check=True, capture_output=True)
    lista.unlink()
    for t in trabajos:
        Path(t["html"]).unlink()
    print(len(trabajos), "capturas")


if __name__ == "__main__":
    main()
