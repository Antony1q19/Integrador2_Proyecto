"""Límite de peticiones por IP, para las rutas públicas (las que no piden sesión).

Sin sesión no sabemos QUIÉN pide, así que alguien podría bombardear el servidor con miles de
peticiones por segundo. Esto lo frena: cada IP puede hacer como máximo N peticiones por minuto;
si se pasa, recibe 429 ("demasiadas peticiones") hasta que pase el minuto.

Se guarda en memoria (un diccionario), así que vale para UN proceso del Gateway: suficiente
para este proyecto. Con varias copias del Gateway habría que llevarlo a Redis o similar.

¿De quién es la IP?
Los navegadores NO llaman al Gateway directo: llaman al servidor de Next.js (ERP o ANUNCIOS) y
ese servidor llama al Gateway. Para el Gateway, entonces, "la IP que llama" es SIEMPRE la del
servidor de Next.js, la misma para todos los usuarios. Si se contara esa, 5 contraseñas mal
escritas por una sola persona bloquearían el login de TODOS.
Por eso Next.js manda la IP real del usuario en la cabecera `X-Cliente-IP`, junto con una clave
compartida (`X-Proxy-Secret` = FRONTEND_PROXY_SECRET). El Gateway solo cree esa IP si la clave
coincide; si no (alguien llamando directo al puerto 8000 con una IP inventada), usa la IP real
de la conexión. `X-Forwarded-For` ya NO se usa: cualquiera puede escribir lo que quiera ahí.
"""
import hmac
import time
from collections import deque

from fastapi import HTTPException, Request, status

from app.core.config import settings

_VENTANA_SEGUNDOS = 60


def obtener_ip_cliente(request: Request) -> str:
    """La IP del usuario final (ver la explicación de arriba)."""
    secreto = settings.frontend_proxy_secret
    ip_declarada = (request.headers.get("x-cliente-ip") or "").strip()
    clave_recibida = request.headers.get("x-proxy-secret") or ""
    if secreto and ip_declarada and hmac.compare_digest(clave_recibida.encode(), secreto.encode()):
        return ip_declarada[:45]  # 45 = largo máximo de una IPv6 escrita
    return request.client.host if request.client else "desconocida"


def limitar_por_ip(maximo_por_minuto: int):
    """Dependencia de FastAPI: responde 429 si la IP ya hizo `maximo_por_minuto` peticiones
    en el último minuto. Uso:  dependencies=[Depends(limitar_por_ip(60))]

    Cada límite lleva su PROPIA cuenta: ver 20 anuncios no gasta los intentos de login."""

    # ip -> horas (en segundos) de sus últimas peticiones dentro de la ventana
    _peticiones_por_ip: dict[str, deque[float]] = {}

    async def dependencia(request: Request) -> None:
        ip = obtener_ip_cliente(request)
        ahora = time.monotonic()
        historial = _peticiones_por_ip.setdefault(ip, deque())

        # Se olvidan las peticiones que ya salieron de la ventana de 1 minuto.
        while historial and ahora - historial[0] > _VENTANA_SEGUNDOS:
            historial.popleft()

        if len(historial) >= maximo_por_minuto:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiadas peticiones. Intenta nuevamente en un minuto.",
                headers={"Retry-After": str(_VENTANA_SEGUNDOS)},
            )
        historial.append(ahora)

        # Limpieza ocasional: que el diccionario no crezca para siempre con IPs que ya no vuelven.
        if len(_peticiones_por_ip) > 10_000:
            for otra_ip in [i for i, h in _peticiones_por_ip.items() if not h or ahora - h[-1] > _VENTANA_SEGUNDOS]:
                del _peticiones_por_ip[otra_ip]

    return dependencia


# ---------------------------------------------------------------------------
# Bloqueo temporal por intentos fallidos de login (fuerza bruta)
# Regla: tras 5 fallos en 15 minutos (por IP o por correo) -> 429 con Retry-After.
# ---------------------------------------------------------------------------
_VENTANA_BLOQUEO_LOGIN_SEGUNDOS = 15 * 60  # 15 minutos
_MAX_FALLOS_LOGIN = 5

_fallos_login_por_ip: dict[str, deque[float]] = {}
_fallos_login_por_email: dict[str, deque[float]] = {}


def verificar_bloqueo_login(ip: str, email: str) -> None:
    """Verifica si la IP o el correo están bloqueados por demasiados intentos fallidos."""
    ahora = time.monotonic()
    email_limpio = email.strip().lower()

    for clave, diccionario, tipo in [
        (ip, _fallos_login_por_ip, "esta dirección IP"),
        (email_limpio, _fallos_login_por_email, "esta cuenta de correo"),
    ]:
        historial = diccionario.setdefault(clave, deque())
        while historial and ahora - historial[0] > _VENTANA_BLOQUEO_LOGIN_SEGUNDOS:
            historial.popleft()

        if len(historial) >= _MAX_FALLOS_LOGIN:
            segundos_restantes = max(1, int(_VENTANA_BLOQUEO_LOGIN_SEGUNDOS - (ahora - historial[0])))
            minutos = max(1, (segundos_restantes + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos fallidos para {tipo}. Acceso bloqueado temporalmente por {minutos} minuto(s).",
                headers={"Retry-After": str(segundos_restantes)},
            )


def registrar_fallo_login(ip: str, email: str) -> None:
    """Anota un intento fallido de inicio de sesión."""
    ahora = time.monotonic()
    email_limpio = email.strip().lower()

    historial_ip = _fallos_login_por_ip.setdefault(ip, deque())
    historial_ip.append(ahora)

    historial_email = _fallos_login_por_email.setdefault(email_limpio, deque())
    historial_email.append(ahora)


def limpiar_fallos_login(email: str) -> None:
    """Al iniciar sesión con éxito, se restablece el contador de fallos para ese correo."""
    email_limpio = email.strip().lower()
    if email_limpio in _fallos_login_por_email:
        _fallos_login_por_email[email_limpio].clear()


# ---------------------------------------------------------------------------
# Límite para recuperar contraseña (evitar bombardeo / spam de correos)
# Regla: máx 3 por correo/hora y 10 por IP/hora -> 429 con Retry-After.
# ---------------------------------------------------------------------------
_VENTANA_RECUPERACION_SEGUNDOS = 60 * 60  # 1 hora
_MAX_RECUPERACION_POR_EMAIL = 3
_MAX_RECUPERACION_POR_IP = 10

_recuperaciones_por_ip: dict[str, deque[float]] = {}
_recuperaciones_por_email: dict[str, deque[float]] = {}


def verificar_limite_recuperacion(ip: str, email: str) -> None:
    """Revisa si se superó el tope de solicitudes de recuperación por hora."""
    ahora = time.monotonic()
    email_limpio = email.strip().lower()

    for clave, diccionario, limite, tipo in [
        (ip, _recuperaciones_por_ip, _MAX_RECUPERACION_POR_IP, "esta IP"),
        (email_limpio, _recuperaciones_por_email, _MAX_RECUPERACION_POR_EMAIL, "este correo"),
    ]:
        historial = diccionario.setdefault(clave, deque())
        while historial and ahora - historial[0] > _VENTANA_RECUPERACION_SEGUNDOS:
            historial.popleft()

        if len(historial) >= limite:
            segundos_restantes = max(1, int(_VENTANA_RECUPERACION_SEGUNDOS - (ahora - historial[0])))
            minutos = max(1, (segundos_restantes + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Límite de solicitudes de recuperación alcanzado para {tipo}. Intenta nuevamente en {minutos} minuto(s).",
                headers={"Retry-After": str(segundos_restantes)},
            )


def registrar_solicitud_recuperacion(ip: str, email: str) -> None:
    """Anota una solicitud de recuperación de contraseña."""
    ahora = time.monotonic()
    email_limpio = email.strip().lower()

    _recuperaciones_por_ip.setdefault(ip, deque()).append(ahora)
    _recuperaciones_por_email.setdefault(email_limpio, deque()).append(ahora)
