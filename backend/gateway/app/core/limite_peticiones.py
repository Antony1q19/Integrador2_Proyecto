"""Límite de peticiones por IP, para las rutas públicas (las que no piden sesión).

Sin sesión no sabemos QUIÉN pide, así que alguien podría bombardear el servidor con miles de
peticiones por segundo. Esto lo frena: cada IP puede hacer como máximo N peticiones por minuto;
si se pasa, recibe 429 ("demasiadas peticiones") hasta que pase el minuto.

Se guarda en memoria (un diccionario), así que vale para UN proceso del Gateway: suficiente
para este proyecto. Con varias copias del Gateway habría que llevarlo a Redis o similar.
"""
import time
from collections import deque

from fastapi import HTTPException, Request, status

_VENTANA_SEGUNDOS = 60

# ip -> horas (en segundos) de sus últimas peticiones dentro de la ventana
_peticiones_por_ip: dict[str, deque[float]] = {}


def limitar_por_ip(maximo_por_minuto: int):
    """Dependencia de FastAPI: responde 429 si la IP ya hizo `maximo_por_minuto` peticiones
    en el último minuto. Uso:  dependencies=[Depends(limitar_por_ip(60))]"""

    async def dependencia(request: Request) -> None:
        ip = request.client.host if request.client else "desconocida"
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
