"""Rutas PÚBLICAS: las que la app ANUNCIOS usa SIN que la persona inicie sesión.

    GET /api/v1/publico/anuncios          → anuncios publicados (?limite=50&desde=0)
    GET /api/v1/publico/anuncios/{id}     → un anuncio publicado

A diferencia del resto del Gateway (api/v1/proxy.py), aquí NO se pide token. Por eso cada ruta
se declara a mano y es estrecha a propósito:
  - Solo GET (no hay forma de crear, editar ni borrar nada desde aquí).
  - Solo estas dos direcciones: no es un "comodín" que reenvíe cualquier cosa.
  - Solo se reenvían los parámetros conocidos (limite, desde); el resto se descarta.
  - Límite de peticiones por IP (core/limite_peticiones.py).
  - El microservicio solo entrega anuncios abiertos y vigentes, con campos públicos
    (servicio-empresas-vacantes/app/api/v1/publico.py).
"""
from fastapi import APIRouter, Depends, Query, Response

from app.core.config import settings
from app.core.http_client import cabeceras_firmadas, obtener_cliente
from app.core.limite_peticiones import limitar_por_ip

router = APIRouter(
    prefix="/publico",
    tags=["publico"],
    dependencies=[Depends(limitar_por_ip(60))],  # 60 peticiones por minuto por IP
)

# Los navegadores y el servidor de ANUNCIOS pueden guardar la respuesta 60 s: los anuncios no
# cambian a cada segundo y así casi ninguna visita llega hasta la base de datos.
_CACHE_PUBLICO = "public, max-age=60"


async def _pedir_a_empresas_vacantes(ruta: str, params: dict | None = None) -> Response:
    """Reenvía un GET firmado a servicio-empresas-vacantes, sin datos de usuario (no hay sesión)."""
    if settings.url_servicio_empresas_vacantes is None:
        return Response(content=b'{"detail": "Servicio no encontrado"}', status_code=404, media_type="application/json")

    respuesta = await obtener_cliente().get(
        f"{settings.url_servicio_empresas_vacantes}{ruta}",
        params=params,
        headers=cabeceras_firmadas(),
    )
    cabeceras = {"Cache-Control": _CACHE_PUBLICO} if respuesta.status_code == 200 else {}
    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        media_type="application/json",
        headers=cabeceras,
    )


@router.get("/anuncios")
async def listar_anuncios_publicos(
    limite: int = Query(default=50, ge=1, le=100),
    desde: int = Query(default=0, ge=0),
) -> Response:
    return await _pedir_a_empresas_vacantes("/publico/anuncios", {"limite": limite, "desde": desde})


@router.get("/anuncios/{anuncio_id}")
async def obtener_anuncio_publico(anuncio_id: int) -> Response:
    # anuncio_id: int → FastAPI rechaza (422) cualquier cosa que no sea un número, así nadie
    # puede colar "../otra-ruta" hacia el microservicio.
    return await _pedir_a_empresas_vacantes(f"/publico/anuncios/{anuncio_id}")
