"""Cliente HTTP reutilizado para reenviar peticiones hacia los
microservicios internos, agregando siempre la firma HMAC que cada uno
exige (ver `shared_kernel.security.verificar_firma_gateway`)."""
import time

import httpx

from app.core.config import settings
from shared_kernel.security import firmar_peticion_gateway

_cliente: httpx.AsyncClient | None = None


def obtener_cliente() -> httpx.AsyncClient:
    global _cliente
    if _cliente is None:
        _cliente = httpx.AsyncClient(timeout=15.0)
    return _cliente


async def cerrar_cliente() -> None:
    global _cliente
    if _cliente is not None:
        await _cliente.aclose()
        _cliente = None


def cabeceras_firmadas(cabeceras_extra: dict[str, str] | None = None) -> dict[str, str]:
    timestamp = str(time.time())
    firma = firmar_peticion_gateway(settings.gateway_shared_secret, timestamp)
    cabeceras = {"X-Gateway-Timestamp": timestamp, "X-Gateway-Signature": firma}
    if cabeceras_extra:
        cabeceras.update(cabeceras_extra)
    return cabeceras
