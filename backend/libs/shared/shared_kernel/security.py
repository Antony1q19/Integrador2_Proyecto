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

   La firma cubre: la hora, un número único de un solo uso (nonce), el método (GET,
   POST...), la ruta y las cabeceras de identidad (X-Usuario-Id, X-Usuario-Rol...).
   Así, aunque alguien capture una petición firmada:
     - no puede cambiarle el rol, el usuario ni la ruta (la firma ya no coincidiría), y
     - no puede repetirla (el microservicio recuerda los nonce ya usados).
"""
import hashlib
import hmac
import time
from collections.abc import Mapping
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
    ahora = datetime.now(timezone.utc)
    if "iat" not in payload:
        payload["iat"] = int(ahora.timestamp())
    # "iat" (estándar) solo tiene segundos. Con milisegundos se puede invalidar con exactitud un token
    # emitido en el MISMO segundo en que se cambió la contraseña (ver gateway/app/api/deps.py).
    payload.setdefault("iat_ms", int(ahora.timestamp() * 1000))
    payload["exp"] = ahora + timedelta(minutes=minutos_expiracion)
    return jwt.encode(payload, secreto, algorithm=algoritmo)


def decodificar_token(
    token: str,
    secreto: str,
    algoritmo: str = ALGORITMO_POR_DEFECTO,
    aud: str | None = None,
) -> dict[str, Any]:
    """Lee un token y devuelve sus datos.

    Si se pasa `aud`, exige que el token tenga esa audiencia exacta.
    Si el token es falso, fue modificado o ya venció, lanza `JWTError`; quien
    llama a esta función la convierte en un error HTTP 401.
    """
    opciones = {"verify_aud": aud is not None}
    kwargs: dict[str, Any] = {"options": opciones}
    if aud is not None:
        kwargs["audience"] = aud
    return jwt.decode(token, secreto, algorithms=[algoritmo], **kwargs)


# ---------------------------------------------------------------------------
# 2) FIRMA DEL GATEWAY
# ---------------------------------------------------------------------------
# Cabeceras que dicen QUIÉN hace la petición. Todas entran en la firma.
CABECERAS_DE_IDENTIDAD = (
    "x-usuario-id",
    "x-usuario-rol",
    "x-usuario-nombre",
    "x-usuario-empresas",
    "x-usuario-postulante-id",
)

# nonce -> momento (time.time) en que deja de importar. Ver `_nonce_ya_usado`.
_nonces_vistos: dict[str, float] = {}


def firmar_peticion_gateway(
    secreto: str,
    timestamp: str,
    nonce: str,
    metodo: str,
    ruta: str,
    identidad: Mapping[str, str],
) -> str:
    """Calcula la firma de una petición (la usa el Gateway, y un servicio al llamar a otro).

    `identidad` son las cabeceras de la petición (se toman solo las de CABECERAS_DE_IDENTIDAD,
    sin importar mayúsculas); la que falta cuenta como texto vacío.
    """
    normalizadas = {clave.lower(): valor for clave, valor in identidad.items()}
    texto = "\n".join(
        [timestamp, nonce, metodo.upper(), ruta, *(normalizadas.get(c, "") for c in CABECERAS_DE_IDENTIDAD)]
    )
    return hmac.new(secreto.encode(), texto.encode(), hashlib.sha256).hexdigest()


def _nonce_ya_usado(nonce: str, tolerancia_segundos: int) -> bool:
    """Anota el nonce y dice si ya se había visto. Solo hace falta recordarlo mientras la
    firma siga vigente: pasada la tolerancia, la petición se rechaza igual por vieja."""
    ahora = time.time()
    if len(_nonces_vistos) > 50_000:  # limpieza ocasional
        for viejo in [n for n, vence in _nonces_vistos.items() if vence < ahora]:
            del _nonces_vistos[viejo]
    if _nonces_vistos.get(nonce, 0) >= ahora:
        return True
    _nonces_vistos[nonce] = ahora + 2 * tolerancia_segundos
    return False


def verificar_firma_gateway(
    secreto: str,
    timestamp: str,
    nonce: str,
    firma_recibida: str,
    metodo: str,
    ruta: str,
    identidad: Mapping[str, str],
    tolerancia_segundos: int = TOLERANCIA_FIRMA_SEGUNDOS,
) -> bool:
    """Comprueba la firma (la usa el microservicio al recibir). True = válida."""
    # ¿La hora que trae la petición es un número válido?
    try:
        antiguedad = abs(time.time() - float(timestamp))
    except ValueError:
        return False

    # ¿Es demasiado vieja (o del futuro)? Entonces se rechaza.
    if antiguedad > tolerancia_segundos or not nonce:
        return False

    # Recalculamos la firma nosotros y la comparamos con la recibida.
    # compare_digest compara de forma segura (sin filtrar pistas por el tiempo).
    firma_esperada = firmar_peticion_gateway(secreto, timestamp, nonce, metodo, ruta, identidad)
    if not hmac.compare_digest(firma_esperada, firma_recibida):
        return False

    # Firma correcta: falta que no sea una petición REPETIDA (capturada y reenviada).
    return not _nonce_ya_usado(nonce, tolerancia_segundos)


__all__ = [
    "JWTError",
    "crear_token_acceso",
    "decodificar_token",
    "CABECERAS_DE_IDENTIDAD",
    "firmar_peticion_gateway",
    "verificar_firma_gateway",
]
