"""Cliente HTTP: lo que usa el Gateway para "llamar por teléfono" a los
microservicios.

Aquí también se arma la firma secreta que se pega a cada llamada interna
(ver `shared_kernel/security.py`, parte 2), para que el microservicio sepa
que la llamada viene del Gateway.
"""
import time

import httpx

from app.core.config import settings
from shared_kernel.security import firmar_peticion_gateway

# Se guarda UN solo cliente y se reutiliza (crear uno por petición sería lento).
_cliente: httpx.AsyncClient | None = None


def obtener_cliente() -> httpx.AsyncClient:
    """Devuelve el cliente compartido; lo crea la primera vez que se pide."""
    global _cliente
    if _cliente is None:
        _cliente = httpx.AsyncClient(timeout=15.0)  # 15 s máximo de espera
    return _cliente


async def cerrar_cliente() -> None:
    """Cierra el cliente al apagar el Gateway."""
    global _cliente
    if _cliente is not None:
        await _cliente.aclose()
        _cliente = None


def cabeceras_firmadas(cabeceras_extra: dict[str, str] | None = None) -> dict[str, str]:
    """Arma las cabeceras de una llamada interna: hora actual + firma.

    Una "cabecera" es un dato extra que viaja junto a la petición HTTP.
    """
    timestamp = str(time.time())
    firma = firmar_peticion_gateway(settings.gateway_shared_secret, timestamp)
    cabeceras = {"X-Gateway-Timestamp": timestamp, "X-Gateway-Signature": firma}
    if cabeceras_extra:
        cabeceras.update(cabeceras_extra)
    return cabeceras
