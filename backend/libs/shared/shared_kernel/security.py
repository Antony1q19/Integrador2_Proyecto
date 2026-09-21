"""Seguridad común: tokens de login (JWT) y firma entre servicios.

Hay DOS mecanismos distintos en este archivo. No los confundas:

1) TOKEN JWT  →  "¿quién eres tú, usuario?"
   Cuando alguien inicia sesión, el Gateway le entrega un token: un texto
   largo que dice quién es (id, correo, rol) y hasta cuándo vale. Va firmado
   con JWT_SECRET, así que si alguien lo modifica, la firma ya no coincide y
   el token se rechaza. El usuario lo manda en cada petición.

2) FIRMA DEL GATEWAY  →  "¿esta petición viene realmente del Gateway?"
   Es una firma secreta que el Gateway agrega a cada petición que reenvía a un
   microservicio (usa GATEWAY_SHARED_SECRET). Sirve para que un microservicio
   rechace a cualquiera que intente llamarlo directo, sin pasar por el Gateway.
   (Técnicamente se llama HMAC-SHA256: una "huella" calculada con una clave.)
"""
import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

ALGORITMO_POR_DEFECTO = "HS256"

# Una firma del Gateway solo vale unos segundos: así, aunque alguien la
# copie, no le sirve para siempre.
TOLERANCIA_FIRMA_SEGUNDOS = 30


# ---------------------------------------------------------------------------
# 1) TOKEN JWT
# ---------------------------------------------------------------------------
def crear_token_acceso(
    datos: dict[str, Any],
    secreto: str,
    minutos_expiracion: int = 60,
    algoritmo: str = ALGORITMO_POR_DEFECTO,
) -> str:
    """Crea y firma un token con `datos` dentro. Solo lo usa el Gateway."""
    payload = datos.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=minutos_expiracion)
    return jwt.encode(payload, secreto, algorithm=algoritmo)


def decodificar_token(
    token: str, secreto: str, algoritmo: str = ALGORITMO_POR_DEFECTO
) -> dict[str, Any]:
    """Lee un token y devuelve sus datos.

    Si el token es falso, fue modificado o ya venció, lanza `JWTError`; quien
    llama a esta función la convierte en un error HTTP 401.
    """
    return jwt.decode(token, secreto, algorithms=[algoritmo])


# ---------------------------------------------------------------------------
# 2) FIRMA DEL GATEWAY
# ---------------------------------------------------------------------------
def firmar_peticion_gateway(secreto: str, timestamp: str) -> str:
    """Calcula la firma de una petición (la usa el Gateway al reenviar)."""
    return hmac.new(secreto.encode(), timestamp.encode(), hashlib.sha256).hexdigest()


def verificar_firma_gateway(
    secreto: str,
    timestamp: str,
    firma_recibida: str,
    tolerancia_segundos: int = TOLERANCIA_FIRMA_SEGUNDOS,
) -> bool:
    """Comprueba la firma (la usa el microservicio al recibir). True = válida."""
    # ¿La hora que trae la petición es un número válido?
    try:
        antiguedad = abs(time.time() - float(timestamp))
    except ValueError:
        return False

    # ¿Es demasiado vieja (o del futuro)? Entonces se rechaza.
    if antiguedad > tolerancia_segundos:
        return False

    # Recalculamos la firma nosotros y la comparamos con la recibida.
    # compare_digest compara de forma segura (sin filtrar pistas por el tiempo).
    firma_esperada = firmar_peticion_gateway(secreto, timestamp)
    return hmac.compare_digest(firma_esperada, firma_recibida)


__all__ = [
    "JWTError",
    "crear_token_acceso",
    "decodificar_token",
    "firmar_peticion_gateway",
    "verificar_firma_gateway",
]
