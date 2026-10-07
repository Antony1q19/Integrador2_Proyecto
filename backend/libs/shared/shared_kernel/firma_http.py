"""La firma del Gateway aplicada a peticiones HTTP reales (ver shared_kernel/security.py, parte 2).

Dos piezas, una para cada lado:

  - `gancho_de_firma(secreto)`: se instala en el cliente httpx de quien LLAMA (el Gateway, o un
    microservicio que le pregunta algo a otro). Firma cada petición justo antes de enviarla, con su
    método, su ruta y sus cabeceras de identidad ya definitivos. Así nadie tiene que acordarse de
    firmar a mano en cada llamada.

  - `peticion_firmada_por_gateway(request, secreto)`: la usa el microservicio que RECIBE para
    comprobar esa firma (ver `verificar_peticion_del_gateway` en app/api/deps.py de cada servicio).
"""
import time
import uuid
from collections.abc import Awaitable, Callable

import httpx
from starlette.requests import Request

from shared_kernel.security import firmar_peticion_gateway, verificar_firma_gateway


def gancho_de_firma(secreto: str) -> Callable[[httpx.Request], Awaitable[None]]:
    """Devuelve un "event hook" de httpx que firma cada petición saliente. Uso:
        httpx.AsyncClient(event_hooks={"request": [gancho_de_firma(secreto)]})"""

    async def firmar(request: httpx.Request) -> None:
        timestamp = str(time.time())
        nonce = uuid.uuid4().hex
        request.headers["X-Gateway-Timestamp"] = timestamp
        request.headers["X-Gateway-Nonce"] = nonce
        request.headers["X-Gateway-Signature"] = firmar_peticion_gateway(
            secreto, timestamp, nonce, request.method, request.url.path, request.headers
        )

    return firmar


def peticion_firmada_por_gateway(request: Request, secreto: str) -> bool:
    """True si la petición trae una firma válida, vigente y no repetida."""
    cabeceras = request.headers
    return verificar_firma_gateway(
        secreto,
        cabeceras.get("x-gateway-timestamp", ""),
        cabeceras.get("x-gateway-nonce", ""),
        cabeceras.get("x-gateway-signature", ""),
        request.method,
        request.scope["path"],
        cabeceras,
    )
