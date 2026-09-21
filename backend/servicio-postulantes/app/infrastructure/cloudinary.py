"""Cliente mínimo de Cloudinary: subir y eliminar archivos.

¿Qué es Cloudinary? Un servicio en internet donde se guardan archivos (imágenes,
PDF...). Nuestra base de datos NO guarda el archivo, solo su dirección (URL).

¿Cómo se sube un archivo de forma segura? Cada llamada a Cloudinary se FIRMA con
el "API secret" (una clave que solo conoce este servidor). Cloudinary recalcula la
firma y, si coincide, acepta la operación. Por eso el navegador nunca ve la clave:
sube el archivo a nuestro backend, y el backend lo reenvía a Cloudinary firmado.

Documentación oficial de la firma: https://cloudinary.com/documentation/authentication_signatures
"""
import hashlib
import logging
import time
from dataclasses import dataclass

import httpx

from app.core.config import settings
from shared_kernel.exceptions import ServicioNoDisponible

logger = logging.getLogger(__name__)

_TIEMPO_MAXIMO_SEGUNDOS = 30


@dataclass
class ArchivoSubido:
    """Lo que Cloudinary nos devuelve cuando guarda un archivo."""

    url: str  # dirección https pública del archivo
    public_id: str  # identificador dentro de Cloudinary (sirve para borrarlo después)
    tipo_recurso: str  # "image" o "raw" (también se necesita para borrarlo)
    bytes: int  # tamaño real que guardó Cloudinary


def firmar_parametros(parametros: dict[str, str], api_secret: str) -> str:
    """Calcula la firma de una llamada a Cloudinary.

    Regla oficial: se ordenan los parámetros por nombre, se unen como
    "nombre=valor&nombre=valor", se les pega el API secret al final y se calcula
    el SHA-1 de todo. (Los parámetros vacíos no cuentan.)
    """
    texto = "&".join(f"{nombre}={valor}" for nombre, valor in sorted(parametros.items()) if valor not in ("", None))
    return hashlib.sha1((texto + api_secret).encode("utf-8")).hexdigest()


def _comprobar_configuracion() -> None:
    """Si falta algún dato de Cloudinary en el .env, responde 503 con un mensaje claro."""
    faltan = [
        nombre
        for nombre, valor in (
            ("CLOUDINARY_CLOUD_NAME", settings.cloudinary_cloud_name),
            ("CLOUDINARY_API_KEY", settings.cloudinary_api_key),
            ("CLOUDINARY_API_SECRET", settings.cloudinary_api_secret),
        )
        if not valor
    ]
    if faltan:
        raise ServicioNoDisponible(
            "Cloudinary no está configurado. Falta en backend/servicio-postulantes/.env: " + ", ".join(faltan)
        )


async def subir_archivo(
    contenido: bytes, nombre_archivo: str, tipo_de_archivo: str, subcarpeta: str
) -> ArchivoSubido:
    """Sube un archivo a Cloudinary (carpeta configurada + `subcarpeta`) y devuelve su URL."""
    _comprobar_configuracion()

    # Estos parámetros se firman. "resource_type=auto" va en la dirección y deja que
    # Cloudinary decida si es imagen o archivo (por eso no forma parte de la firma).
    parametros = {
        "folder": f"{settings.cloudinary_carpeta}/{subcarpeta}",
        "timestamp": str(int(time.time())),
    }
    datos = {
        **parametros,
        "api_key": settings.cloudinary_api_key,
        "signature": firmar_parametros(parametros, settings.cloudinary_api_secret),
    }
    direccion = f"{settings.cloudinary_api_base}/{settings.cloudinary_cloud_name}/auto/upload"

    async with httpx.AsyncClient(timeout=_TIEMPO_MAXIMO_SEGUNDOS) as cliente:
        try:
            respuesta = await cliente.post(
                direccion, data=datos, files={"file": (nombre_archivo, contenido, tipo_de_archivo)}
            )
        except httpx.HTTPError as exc:
            raise ServicioNoDisponible("No se pudo conectar con Cloudinary. Intenta nuevamente.") from exc

    if respuesta.status_code != 200:
        try:
            motivo = respuesta.json()["error"]["message"]
        except Exception:
            motivo = f"respuesta {respuesta.status_code}"
        raise ServicioNoDisponible(f"Cloudinary rechazó el archivo: {motivo}")

    resultado = respuesta.json()
    return ArchivoSubido(
        url=resultado["secure_url"],
        public_id=resultado["public_id"],
        tipo_recurso=resultado["resource_type"],
        bytes=resultado["bytes"],
    )


async def descargar_archivo(public_id: str, tipo_recurso: str, url: str) -> tuple[bytes, str]:
    """Descarga un archivo de Cloudinary y devuelve (contenido, tipo_de_archivo).

    ¿Por qué no se usa simplemente la URL pública? Porque Cloudinary bloquea la
    entrega pública de los PDF en las cuentas nuevas (da error 401). En cambio, la
    descarga FIRMADA con el API secret sí funciona siempre, y además así el archivo
    solo lo ve quien pasó por nuestro Gateway (con sesión y rol), no cualquiera que
    conozca el enlace.
    """
    _comprobar_configuracion()

    parametros = {"public_id": public_id, "type": "upload", "timestamp": str(int(time.time()))}
    # Las imágenes y PDF guardados como "image" necesitan su formato (pdf, png, jpg...),
    # que es la extensión de la URL. Los archivos "raw" ya lo traen en el public_id.
    extension = url.rsplit("/", 1)[-1].rsplit(".", 1)[-1].lower() if "." in url.rsplit("/", 1)[-1] else ""
    if tipo_recurso == "image" and extension:
        parametros["format"] = extension

    consulta = {
        **parametros,
        "api_key": settings.cloudinary_api_key,
        "signature": firmar_parametros(parametros, settings.cloudinary_api_secret),
    }
    direccion = f"{settings.cloudinary_api_base}/{settings.cloudinary_cloud_name}/{tipo_recurso}/download"

    async with httpx.AsyncClient(timeout=_TIEMPO_MAXIMO_SEGUNDOS, follow_redirects=True) as cliente:
        try:
            respuesta = await cliente.get(direccion, params=consulta)
        except httpx.HTTPError as exc:
            raise ServicioNoDisponible("No se pudo conectar con Cloudinary. Intenta nuevamente.") from exc

    if respuesta.status_code != 200:
        logger.warning("Cloudinary no entregó %s (respuesta %s)", public_id, respuesta.status_code)
        raise ServicioNoDisponible("No se pudo obtener el archivo desde Cloudinary.")

    tipo_de_archivo = respuesta.headers.get("content-type", "application/octet-stream")
    return respuesta.content, tipo_de_archivo


async def eliminar_archivo(public_id: str | None, tipo_recurso: str | None) -> None:
    """Borra un archivo de Cloudinary. Si falla, solo lo anota en el log y sigue.

    (No es crítico: en el peor caso queda un archivo huérfano en Cloudinary, pero
    el usuario no debe ver un error solo porque no se pudo limpiar.)
    """
    if not public_id or not tipo_recurso:
        return  # documento antiguo, sin archivo en Cloudinary
    try:
        _comprobar_configuracion()
        # invalidate=true: además de borrar el archivo, limpia su copia guardada en la
        # CDN de Cloudinary (si no, la URL podría seguir mostrándose un buen rato).
        parametros = {"public_id": public_id, "timestamp": str(int(time.time())), "invalidate": "true"}
        datos = {
            **parametros,
            "api_key": settings.cloudinary_api_key,
            "signature": firmar_parametros(parametros, settings.cloudinary_api_secret),
        }
        direccion = f"{settings.cloudinary_api_base}/{settings.cloudinary_cloud_name}/{tipo_recurso}/destroy"
        async with httpx.AsyncClient(timeout=_TIEMPO_MAXIMO_SEGUNDOS) as cliente:
            respuesta = await cliente.post(direccion, data=datos)
        if respuesta.status_code != 200:
            logger.warning("Cloudinary no pudo borrar %s (respuesta %s)", public_id, respuesta.status_code)
    except Exception as exc:  # noqa: BLE001 — a propósito: borrar es "mejor esfuerzo"
        logger.warning("No se pudo borrar %s de Cloudinary: %s", public_id, exc)
