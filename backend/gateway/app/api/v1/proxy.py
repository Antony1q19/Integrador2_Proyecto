"""Proxy reverso del Gateway hacia los microservicios de dominio.

Todo lo que el Front-End llame bajo `/api/v1/{servicio}/...` (salvo
`/api/v1/auth/...`) llega acá, se valida el JWT y se reenvía al
microservicio correspondiente con la identidad del usuario ya resuelta
(`X-Usuario-Id` / `X-Usuario-Rol`) y firmada con el secreto compartido, de
forma que el microservicio pueda confiar en esos headers sin volver a
validar el JWT él mismo.
"""
from fastapi import APIRouter, Depends, Request, Response

from app.api.deps import obtener_usuario_actual
from app.core.config import settings
from app.core.http_client import cabeceras_firmadas, obtener_cliente

router = APIRouter()

# Prefijo público -> URL interna del microservicio dueño de ese dominio.
# "empresas"/"anuncios"/"procesos"/"evaluaciones" se agregan cuando
# existan sus microservicios (ver ADR-002); hoy solo corre postulantes.
_MAPA_SERVICIOS = {
    "postulantes": lambda: settings.url_servicio_postulantes,
}

_CABECERAS_A_NO_REENVIAR = {"host", "content-length", "authorization"}


@router.api_route(
    # Sin "/" literal entre los dos parámetros: así "/postulantes" (sin
    # nada más) también matchea, con ruta="" -si hubiera un "/" fijo acá,
    # Starlette solo matchearía "/postulantes/algo", nunca la ruta pelada
    # que usa el listado (`GET /api/v1/postulantes`)-.
    "/{servicio}{ruta:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def reenviar(
    servicio: str,
    ruta: str,
    request: Request,
    usuario: dict = Depends(obtener_usuario_actual),
) -> Response:
    obtener_url_base = _MAPA_SERVICIOS.get(servicio)
    if obtener_url_base is None:
        return Response(
            content=b'{"detail": "Servicio no encontrado"}',
            status_code=404,
            media_type="application/json",
        )

    cabeceras = cabeceras_firmadas(
        {
            "X-Usuario-Id": str(usuario.get("sub", "")),
            "X-Usuario-Rol": str(usuario.get("rol", "")),
            "Content-Type": request.headers.get("content-type", "application/json"),
        }
    )

    # El microservicio monta sus routers bajo "/<servicio>" (ver
    # `servicio-postulantes/app/api/v1/postulantes.py`: prefix="/postulantes"),
    # así que hay que reenviar conservando ese segmento -no solo `ruta`-.
    cliente = obtener_cliente()
    respuesta = await cliente.request(
        request.method,
        f"{obtener_url_base()}/{servicio}{ruta}",
        params=request.query_params,
        content=await request.body(),
        headers=cabeceras,
    )
    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        media_type=respuesta.headers.get("content-type"),
    )
