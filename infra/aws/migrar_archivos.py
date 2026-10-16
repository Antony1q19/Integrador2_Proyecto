"""Copia ÚNICA de los documentos de los postulantes desde Supabase Storage a S3 (la llama prender.sh
la primera vez). Mantiene la misma ruta de cada archivo, así la base de datos no cambia.

Uso:  python migrar_archivos.py <bucket-s3>     (lee infra/aws/.migracion.env)
Solo usa la librería estándar de Python y la AWS CLI (aws s3 cp).
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path


def leer_env(ruta: Path) -> dict[str, str]:
    valores = {}
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        if linea.strip() and not linea.startswith("#") and "=" in linea:
            clave, valor = linea.split("=", 1)
            valores[clave.strip()] = valor.strip()
    return valores


def pedir(url: str, clave: str, cuerpo: dict | None = None) -> bytes:
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    peticion = urllib.request.Request(
        url,
        data=datos,
        headers={"apikey": clave, "Authorization": f"Bearer {clave}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(peticion, timeout=60) as respuesta:
        return respuesta.read()


def listar(base: str, clave: str, bucket: str, carpeta: str = "") -> list[str]:
    """Todas las rutas de archivos del bucket (recorre las carpetas)."""
    rutas, desde = [], 0
    while True:
        items = json.loads(pedir(f"{base}/storage/v1/object/list/{bucket}", clave,
                                 {"prefix": carpeta, "limit": 1000, "offset": desde}))
        for item in items:
            ruta = f"{carpeta}/{item['name']}" if carpeta else item["name"]
            if item.get("id") is None:  # es una carpeta
                rutas.extend(listar(base, clave, bucket, ruta))
            else:
                rutas.append(ruta)
        if len(items) < 1000:
            return rutas
        desde += 1000


def main() -> None:
    bucket_s3 = sys.argv[1]
    config = leer_env(Path(__file__).with_name(".migracion.env"))
    base = config["SUPABASE_STORAGE_URL"].rstrip("/")
    clave = config["SUPABASE_SERVICE_KEY"]
    bucket = config.get("SUPABASE_BUCKET", "postulantes-documentos")

    rutas = listar(base, clave, bucket)
    print(f"    {len(rutas)} archivos en Supabase Storage")
    tipos = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
    for ruta in rutas:
        contenido = pedir(f"{base}/storage/v1/object/authenticated/{bucket}/{ruta}", clave)
        tipo = tipos.get(Path(ruta).suffix.lower(), "application/octet-stream")
        subprocess.run(
            ["aws", "s3", "cp", "-", f"s3://{bucket_s3}/{ruta}", "--content-type", tipo, "--only-show-errors"],
            input=contenido,
            check=True,
        )
    print(f"    {len(rutas)} archivos copiados a s3://{bucket_s3}")


if __name__ == "__main__":
    main()
