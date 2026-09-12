"""JWT y verificación de la firma del Gateway.

El Gateway concentra el login y la emisión de JWT (ADR-002). Cada
microservicio de dominio solo necesita: (1) verificar que el token sea
válido, y (2) confirmar que la petición realmente pasó por el Gateway
-y no llegó directo, saltándose CORS y la capa de transporte cifrado que
el Gateway aplica-. Eso es lo que resuelven las funciones de este módulo.
"""
import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

ALGORITMO_POR_DEFECTO = "HS256"
TOLERANCIA_FIRMA_SEGUNDOS = 30


def crear_token_acceso(
    datos: dict[str, Any],
    secreto: str,
    minutos_expiracion: int = 60,
    algoritmo: str = ALGORITMO_POR_DEFECTO,
) -> str:
    payload = datos.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=minutos_expiracion)
    return jwt.encode(payload, secreto, algorithm=algoritmo)


def decodificar_token(
    token: str, secreto: str, algoritmo: str = ALGORITMO_POR_DEFECTO
) -> dict[str, Any]:
    """Lanza `jose.JWTError` si el token es inválido o expiró; cada
    servicio la traduce a un HTTP 401 en su propio `api/deps.py`."""
    return jwt.decode(token, secreto, algorithms=[algoritmo])


def firmar_peticion_gateway(secreto: str, timestamp: str) -> str:
    """HMAC-SHA256 sobre el timestamp de la petición. El Gateway lo calcula
    al reenviar y lo manda en `X-Gateway-Signature`; el microservicio lo
    recalcula y compara."""
    return hmac.new(secreto.encode(), timestamp.encode(), hashlib.sha256).hexdigest()


def verificar_firma_gateway(
    secreto: str,
    timestamp: str,
    firma_recibida: str,
    tolerancia_segundos: int = TOLERANCIA_FIRMA_SEGUNDOS,
) -> bool:
    try:
        antiguedad = abs(time.time() - float(timestamp))
    except ValueError:
        return False
    if antiguedad > tolerancia_segundos:
        return False
    firma_esperada = firmar_peticion_gateway(secreto, timestamp)
    return hmac.compare_digest(firma_esperada, firma_recibida)


__all__ = [
    "JWTError",
    "crear_token_acceso",
    "decodificar_token",
    "firmar_peticion_gateway",
    "verificar_firma_gateway",
]
