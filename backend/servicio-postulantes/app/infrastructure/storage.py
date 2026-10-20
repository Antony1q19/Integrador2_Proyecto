"""Archivos de los postulantes (CV, DNI, certificados): subir, descargar y eliminar.

Se guardan en un bucket PRIVADO de Amazon S3 (S3_BUCKET_DOCUMENTOS). Nadie puede abrir los archivos
con un enlace: solo este servicio, con el rol de IAM de su tarea (sin claves en el código), los lee y
los sirve a quien tiene sesión y rol en el ERP.
Nuestra base de datos guarda solo la ruta del archivo (documentos.ruta_archivo), su tipo y su tamaño.
"""
import asyncio
import logging
import uuid
from dataclasses import dataclass

from app.core.config import settings
from shared_kernel.exceptions import ServicioNoDisponible

logger = logging.getLogger(__name__)

# Extensión con la que se guarda cada tipo de archivo permitido (el nombre original queda en la base de datos).
_EXTENSION_POR_TIPO = {"application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png"}

# Cliente de S3 (boto3) reutilizado. boto3 no es asíncrono: cada llamada corre en un hilo aparte
# (asyncio.to_thread) para no frenar al resto de peticiones mientras sube o baja un archivo.
_cliente_s3 = None


def _s3():
    global _cliente_s3
    if not settings.s3_bucket_documentos:
        raise ServicioNoDisponible("El almacenamiento de archivos no está configurado: falta S3_BUCKET_DOCUMENTOS")
    if _cliente_s3 is None:
        import boto3

        _cliente_s3 = boto3.client("s3", region_name=settings.aws_region)
    return _cliente_s3


async def cerrar_cliente() -> None:
    """Se llama al apagar el servicio (boto3 no necesita cerrar nada; se mantiene por compatibilidad)."""


@dataclass
class ArchivoSubido:
    """Lo que queda guardado cuando se recibe un archivo."""

    ruta: str  # ruta dentro del bucket, ej. "<postulante_id>/3f2b....pdf"
    tipo_contenido: str  # ej. "application/pdf"
    bytes: int


async def asegurar_bucket(tamano_maximo_bytes: int, tipos_permitidos: set[str]) -> None:  # noqa: ARG001
    """Comprueba al encender que el bucket esté accesible. Lo crea CloudFormation (privado y cifrado);
    aquí solo se verifica el acceso. Si falla, solo avisa en el log."""
    try:
        await asyncio.to_thread(_s3().head_bucket, Bucket=settings.s3_bucket_documentos)
    except Exception as error:  # noqa: BLE001
        logger.warning("El almacenamiento de archivos no está disponible: %s", error)


async def subir_archivo(contenido: bytes, tipo_de_archivo: str, subcarpeta: str) -> ArchivoSubido:
    """Guarda el archivo dentro de `subcarpeta` (una por postulante), con un nombre único."""
    ruta = f"{subcarpeta}/{uuid.uuid4().hex}{_EXTENSION_POR_TIPO.get(tipo_de_archivo, '')}"
    try:
        await asyncio.to_thread(
            _s3().put_object,
            Bucket=settings.s3_bucket_documentos,
            Key=ruta,
            Body=contenido,
            ContentType=tipo_de_archivo,
        )
    except ServicioNoDisponible:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error("No se pudo guardar el archivo: %s", exc)
        raise ServicioNoDisponible("No se pudo guardar el archivo. Intenta nuevamente.") from exc
    return ArchivoSubido(ruta=ruta, tipo_contenido=tipo_de_archivo, bytes=len(contenido))


async def descargar_archivo(ruta: str) -> tuple[bytes, str]:
    """Lee un archivo del bucket y devuelve (contenido, tipo_de_archivo)."""
    try:
        objeto = await asyncio.to_thread(_s3().get_object, Bucket=settings.s3_bucket_documentos, Key=ruta)
        contenido = await asyncio.to_thread(objeto["Body"].read)
        return contenido, objeto.get("ContentType") or "application/octet-stream"
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
        await asyncio.to_thread(_s3().delete_object, Bucket=settings.s3_bucket_documentos, Key=ruta)
    except Exception as exc:  # noqa: BLE001 — a propósito: borrar es "mejor esfuerzo"
        logger.warning("No se pudo borrar %s: %s", ruta, exc)
