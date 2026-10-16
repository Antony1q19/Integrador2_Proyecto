"""Archivos de los postulantes (CV, DNI, certificados): subir, descargar y eliminar.

Dónde se guardan depende de ALMACENAMIENTO (.env):
  - "s3"    → un bucket PRIVADO de Amazon S3 (en AWS). Nadie puede abrir los archivos con un enlace:
              solo este servicio, con el rol de IAM de su tarea (sin claves en el código), los lee y
              los sirve a quien tiene sesión y rol en el ERP.
  - "local" → una carpeta del contenedor (desarrollo en la PC, sin depender de AWS).
Nuestra base de datos guarda solo la ruta del archivo (documentos.ruta_archivo), su tipo y su tamaño.
"""
import asyncio
import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings
from shared_kernel.exceptions import ServicioNoDisponible

logger = logging.getLogger(__name__)

# Extensión con la que se guarda cada tipo de archivo permitido (el nombre original queda en la base de datos).
_EXTENSION_POR_TIPO = {"application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png"}
_TIPO_POR_EXTENSION = {extension: tipo for tipo, extension in _EXTENSION_POR_TIPO.items()}

# Cliente de S3 (boto3) reutilizado. boto3 no es asíncrono: cada llamada corre en un hilo aparte
# (asyncio.to_thread) para no frenar al resto de peticiones mientras sube o baja un archivo.
_cliente_s3 = None


def _s3():
    global _cliente_s3
    if _cliente_s3 is None:
        import boto3  # solo hace falta en modo "s3"

        _cliente_s3 = boto3.client("s3", region_name=settings.aws_region)
    return _cliente_s3


async def cerrar_cliente() -> None:
    """Se llama al apagar el servicio (boto3 no necesita cerrar nada; se mantiene por compatibilidad)."""


@dataclass
class ArchivoSubido:
    """Lo que queda guardado cuando se recibe un archivo."""

    ruta: str  # ruta dentro del almacenamiento, ej. "<postulante_id>/3f2b....pdf"
    tipo_contenido: str  # ej. "application/pdf"
    bytes: int


def _usa_s3() -> bool:
    if settings.almacenamiento == "s3":
        if not settings.s3_bucket_documentos:
            raise ServicioNoDisponible("El almacenamiento de archivos no está configurado: falta S3_BUCKET_DOCUMENTOS")
        return True
    return False


def _ruta_local(ruta: str) -> Path:
    base = Path(settings.carpeta_archivos_local).resolve()
    destino = (base / ruta).resolve()
    if base not in destino.parents:  # nunca fuera de la carpeta (ej. "../../etc/passwd")
        raise ServicioNoDisponible("Ruta de archivo inválida")
    return destino


async def asegurar_bucket(tamano_maximo_bytes: int, tipos_permitidos: set[str]) -> None:  # noqa: ARG001
    """Comprueba al encender que el almacenamiento esté listo. En AWS el bucket lo crea CloudFormation
    (privado y cifrado); aquí solo se verifica el acceso. Si falla, solo avisa en el log."""
    try:
        if _usa_s3():
            await asyncio.to_thread(_s3().head_bucket, Bucket=settings.s3_bucket_documentos)
        else:
            Path(settings.carpeta_archivos_local).mkdir(parents=True, exist_ok=True)
    except Exception as error:  # noqa: BLE001
        logger.warning("El almacenamiento de archivos no está disponible: %s", error)


async def subir_archivo(contenido: bytes, tipo_de_archivo: str, subcarpeta: str) -> ArchivoSubido:
    """Guarda el archivo dentro de `subcarpeta` (una por postulante), con un nombre único."""
    ruta = f"{subcarpeta}/{uuid.uuid4().hex}{_EXTENSION_POR_TIPO.get(tipo_de_archivo, '')}"
    try:
        if _usa_s3():
            await asyncio.to_thread(
                _s3().put_object,
                Bucket=settings.s3_bucket_documentos,
                Key=ruta,
                Body=contenido,
                ContentType=tipo_de_archivo,
            )
        else:
            destino = _ruta_local(ruta)
            destino.parent.mkdir(parents=True, exist_ok=True)
            await asyncio.to_thread(destino.write_bytes, contenido)
    except ServicioNoDisponible:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error("No se pudo guardar el archivo: %s", exc)
        raise ServicioNoDisponible("No se pudo guardar el archivo. Intenta nuevamente.") from exc
    return ArchivoSubido(ruta=ruta, tipo_contenido=tipo_de_archivo, bytes=len(contenido))


async def descargar_archivo(ruta: str) -> tuple[bytes, str]:
    """Lee un archivo del almacenamiento y devuelve (contenido, tipo_de_archivo)."""
    try:
        if _usa_s3():
            objeto = await asyncio.to_thread(_s3().get_object, Bucket=settings.s3_bucket_documentos, Key=ruta)
            contenido = await asyncio.to_thread(objeto["Body"].read)
            return contenido, objeto.get("ContentType") or "application/octet-stream"
        destino = _ruta_local(ruta)
        contenido = await asyncio.to_thread(destino.read_bytes)
        return contenido, _TIPO_POR_EXTENSION.get(destino.suffix, "application/octet-stream")
    except ServicioNoDisponible:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo obtener el archivo %s: %s", ruta, exc)
        raise ServicioNoDisponible("No se pudo obtener el archivo desde el almacenamiento.") from exc


async def eliminar_archivo(ruta: str | None) -> None:
    """Borra un archivo. Si falla, solo lo anota en el log y sigue.

    (No es crítico: en el peor caso queda un archivo huérfano, pero el usuario no debe ver un error
    solo porque no se pudo limpiar.)
    """
    if not ruta:
        return  # documento de ejemplo, sin archivo real
    try:
        if _usa_s3():
            await asyncio.to_thread(_s3().delete_object, Bucket=settings.s3_bucket_documentos, Key=ruta)
        else:
            _ruta_local(ruta).unlink(missing_ok=True)
    except Exception as exc:  # noqa: BLE001 — a propósito: borrar es "mejor esfuerzo"
        logger.warning("No se pudo borrar %s: %s", ruta, exc)
