"""Cliente HTTP: lo que usa el Gateway para "llamar por teléfono" a los
microservicios.

Aquí también se instala la firma secreta que se pega a cada llamada interna
(ver `shared_kernel/security.py`, parte 2), para que el microservicio sepa
que la llamada viene del Gateway. La pone un "gancho" del cliente justo antes de
enviar cada petición (ver shared_kernel/firma_http.py): ninguna ruta tiene que
acordarse de firmar.
"""
import httpx

from app.core.config import settings
from shared_kernel.firma_http import gancho_de_firma

# Se guarda UN solo cliente y se reutiliza (crear uno por petición sería lento).
_cliente: httpx.AsyncClient | None = None


def obtener_cliente() -> httpx.AsyncClient:
    """Devuelve el cliente compartido; lo crea la primera vez que se pide."""
    global _cliente
    if _cliente is None:
        _cliente = httpx.AsyncClient(
            timeout=15.0,  # 15 s máximo de espera
            event_hooks={"request": [gancho_de_firma(settings.gateway_shared_secret)]},
        )
    return _cliente


async def cerrar_cliente() -> None:
    """Cierra el cliente al apagar el Gateway."""
    global _cliente
    if _cliente is not None:
        await _cliente.aclose()
        _cliente = None


def cabeceras_firmadas(cabeceras_extra: dict[str, str] | None = None) -> dict[str, str]:
    """Arma las cabeceras de una llamada interna (identidad del usuario, Content-Type...).

    La firma (hora + nonce + firma) NO se pone aquí: la agrega el cliente de `obtener_cliente()`
    al enviar, ya con el método y la ruta definitivos. Por eso estas cabeceras solo sirven con ese
    cliente. Una "cabecera" es un dato extra que viaja junto a la petición HTTP.
    """
    return dict(cabeceras_extra or {})
