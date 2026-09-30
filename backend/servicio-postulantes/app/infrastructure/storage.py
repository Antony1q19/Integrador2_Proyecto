"""Cliente mínimo de Supabase Storage: subir, descargar y eliminar los archivos de los postulantes.

¿Qué es Supabase Storage? El "disco en la nube" de Supabase (el mismo proyecto de la base de datos).
Los archivos (CV, DNI, certificados) se guardan dentro de un "bucket" (una carpeta grande) PRIVADO:
nadie puede abrirlos con un enlace. Solo este servicio, que tiene la clave secreta, los lee y los sirve
a quien tiene sesión y rol en el ERP. Nuestra base de datos guarda solo la ruta del archivo.

Rutas de la API de Storage que se usan (documentación: https://supabase.com/docs/guides/storage):
    POST   /storage/v1/object/<bucket>/<ruta>                   subir
    GET    /storage/v1/object/authenticated/<bucket>/<ruta>     descargar (bucket privado)
    DELETE /storage/v1/object/<bucket>/<ruta>                   eliminar
    GET    /storage/v1/bucket/<bucket>  y  POST /storage/v1/bucket    ver / crear el bucket
"""
import logging
import uuid
from dataclasses import dataclass
from urllib.parse import quote

import httpx

from app.core.config import settings
from shared_kernel.exceptions import ServicioNoDisponible

logger = logging.getLogger(__name__)

_TIEMPO_MAXIMO_SEGUNDOS = 30

# Extensión con la que se guarda cada tipo de archivo permitido (el nombre original queda en la base de datos).
_EXTENSION_POR_TIPO = {"application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png"}

# Un solo cliente HTTP reutilizado: así no se repite el saludo de seguridad (TLS) con Supabase en cada archivo.
_cliente: httpx.AsyncClient | None = None


def _obtener_cliente() -> httpx.AsyncClient:
    global _cliente
    if _cliente is None:
        _cliente = httpx.AsyncClient(timeout=_TIEMPO_MAXIMO_SEGUNDOS)
    return _cliente


async def cerrar_cliente() -> None:
    """Se llama al apagar el servicio."""
    global _cliente
    if _cliente is not None:
        await _cliente.aclose()
        _cliente = None


@dataclass
class ArchivoSubido:
    """Lo que queda guardado cuando Storage recibe un archivo."""

    ruta: str  # ruta dentro del bucket, ej. "<postulante_id>/3f2b....pdf" (sirve para descargarlo y borrarlo)
    tipo_contenido: str  # ej. "application/pdf"
    bytes: int


def _comprobar_configuracion() -> None:
    """Si falta algún dato de Supabase en el .env, responde 503 con un mensaje claro."""
    faltan = [
        nombre
        for nombre, valor in (
            ("SUPABASE_URL", settings.supabase_url),
            ("SUPABASE_SERVICE_KEY", settings.supabase_service_key),
        )
        if not valor
    ]
    if faltan:
        raise ServicioNoDisponible(
            "El almacenamiento de archivos no está configurado. Falta en backend/servicio-postulantes/.env: "
            + ", ".join(faltan)
        )


def _cabeceras(extra: dict[str, str] | None = None) -> dict[str, str]:
    # La clave secreta va en las dos cabeceras: Supabase acepta cualquiera de las dos formas de identificarse.
    cabeceras = {"apikey": settings.supabase_service_key, "Authorization": f"Bearer {settings.supabase_service_key}"}
    if extra:
        cabeceras.update(extra)
    return cabeceras


def _url(*partes: str) -> str:
    return settings.supabase_url.rstrip("/") + "/storage/v1/" + "/".join(partes)


def _url_objeto(ruta: str, autenticado: bool = False) -> str:
    base = ("object", "authenticated") if autenticado else ("object",)
    return _url(*base, quote(settings.supabase_bucket, safe=""), quote(ruta, safe="/"))


def _motivo(respuesta: httpx.Response) -> str:
    try:
        cuerpo = respuesta.json()
        return str(cuerpo.get("message") or cuerpo.get("error") or respuesta.status_code)
    except Exception:  # noqa: BLE001
        return f"respuesta {respuesta.status_code}"


async def asegurar_bucket(tamano_maximo_bytes: int, tipos_permitidos: set[str]) -> None:
    """Crea el bucket privado si todavía no existe. Se llama al encender el servicio; si falla, solo avisa
    (el resto del servicio sigue funcionando y subir un archivo dará un error claro)."""
    try:
        _comprobar_configuracion()
        cliente = _obtener_cliente()
        existente = await cliente.get(_url("bucket", quote(settings.supabase_bucket, safe="")), headers=_cabeceras())
        if existente.status_code == 200:
            return
        creado = await cliente.post(
            _url("bucket"),
            headers=_cabeceras({"Content-Type": "application/json"}),
            json={
                "id": settings.supabase_bucket,
                "name": settings.supabase_bucket,
                "public": False,  # PRIVADO: los archivos no tienen enlace público
                "file_size_limit": tamano_maximo_bytes,
                "allowed_mime_types": sorted(tipos_permitidos),
            },
        )
        if creado.status_code in (200, 201):
            logger.info("Bucket de Storage creado: %s", settings.supabase_bucket)
        else:
            logger.warning("No se pudo crear el bucket %s: %s", settings.supabase_bucket, _motivo(creado))
    except ServicioNoDisponible as error:
        logger.warning("Storage sin configurar: %s", error)
    except Exception as error:  # noqa: BLE001
        logger.warning("No se pudo preparar el bucket de Storage: %s", error)


async def subir_archivo(contenido: bytes, tipo_de_archivo: str, subcarpeta: str) -> ArchivoSubido:
    """Guarda el archivo en el bucket, dentro de `subcarpeta` (una por postulante), con un nombre único."""
    _comprobar_configuracion()
    ruta = f"{subcarpeta}/{uuid.uuid4().hex}{_EXTENSION_POR_TIPO.get(tipo_de_archivo, '')}"

    try:
        respuesta = await _obtener_cliente().post(
            _url_objeto(ruta),
            headers=_cabeceras({"Content-Type": tipo_de_archivo, "x-upsert": "false"}),
            content=contenido,
        )
    except httpx.HTTPError as exc:
        raise ServicioNoDisponible("No se pudo conectar con el almacenamiento de archivos. Intenta nuevamente.") from exc

    if respuesta.status_code not in (200, 201):
        raise ServicioNoDisponible(f"El almacenamiento rechazó el archivo: {_motivo(respuesta)}")
    return ArchivoSubido(ruta=ruta, tipo_contenido=tipo_de_archivo, bytes=len(contenido))


async def descargar_archivo(ruta: str) -> tuple[bytes, str]:
    """Descarga un archivo del bucket privado y devuelve (contenido, tipo_de_archivo)."""
    _comprobar_configuracion()
    try:
        respuesta = await _obtener_cliente().get(_url_objeto(ruta, autenticado=True), headers=_cabeceras())
    except httpx.HTTPError as exc:
        raise ServicioNoDisponible("No se pudo conectar con el almacenamiento de archivos. Intenta nuevamente.") from exc

    if respuesta.status_code != 200:
        logger.warning("Storage no entregó %s (respuesta %s)", ruta, respuesta.status_code)
        raise ServicioNoDisponible("No se pudo obtener el archivo desde el almacenamiento.")
    return respuesta.content, respuesta.headers.get("content-type", "application/octet-stream")


async def eliminar_archivo(ruta: str | None) -> None:
    """Borra un archivo del bucket. Si falla, solo lo anota en el log y sigue.

    (No es crítico: en el peor caso queda un archivo huérfano, pero el usuario no debe ver un error
    solo porque no se pudo limpiar.)
    """
    if not ruta:
        return  # documento de ejemplo, sin archivo real
    try:
        _comprobar_configuracion()
        respuesta = await _obtener_cliente().delete(_url_objeto(ruta), headers=_cabeceras())
        if respuesta.status_code not in (200, 204):
            logger.warning("Storage no pudo borrar %s (respuesta %s)", ruta, respuesta.status_code)
    except Exception as exc:  # noqa: BLE001 — a propósito: borrar es "mejor esfuerzo"
        logger.warning("No se pudo borrar %s de Storage: %s", ruta, exc)
