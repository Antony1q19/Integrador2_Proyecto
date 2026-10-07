"""Rutas públicas de procesos para postulantes (app ANUNCIOS).

A diferencia del proxy interno /api/v1/procesos (que solo acepta trabajadores del ERP),
estas rutas SÍ aceptan postulantes y se aseguran de que solo operen con sus propios procesos.

Los endpoints son:
  GET  /publico/procesos   → lista las postulaciones del postulante autenticado
  POST /publico/procesos   → crea una nueva postulación del postulante autenticado

El Gateway reenvía al microservicio servicio-procesos-seleccion, añadiendo las
cabeceras internas firmadas (X-Usuario-Id, X-Usuario-Rol, X-Usuario-Postulante-Id)
que ese servicio ya sabe interpretar.
"""
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.api.deps import obtener_postulante_actual
from app.core.config import settings
from app.core.http_client import cabeceras_firmadas, obtener_cliente

router = APIRouter(prefix="/publico/procesos", tags=["publico-procesos"])


def _cabeceras_internas(postulante: dict, incluir_content_type: bool = False) -> dict:
    """Cabeceras firmadas que se envían al microservicio servicio-procesos-seleccion."""
    cabeceras = {
        "X-Usuario-Id": str(postulante.get("sub", "")),
        "X-Usuario-Rol": "Postulante",
        # Codificado con quote() (ej. "José" → "Jos%C3%A9"): las cabeceras HTTP solo admiten
        # ASCII y un nombre con tilde o ñ haría fallar la petición. El microservicio lo decodifica.
        "X-Usuario-Nombre": quote(str(postulante.get("nombre", ""))),
        # Este es el dato clave: el microservicio lo usará para validar que el
        # postulante solo vea/crea SUS PROPIOS procesos.
        "X-Usuario-Postulante-Id": str(postulante.get("postulanteId", "")),
    }
    if incluir_content_type:
        cabeceras["Content-Type"] = "application/json"
    return cabeceras_firmadas(cabeceras)


def _reenviar(respuesta) -> Response:
    """Devuelve al navegador la respuesta del microservicio tal cual (con su status)."""
    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        media_type=respuesta.headers.get("content-type", "application/json"),
    )


@router.get("")
async def listar_mis_procesos(
    postulante: dict = Depends(obtener_postulante_actual),
) -> Response:
    """Lista las postulaciones del postulante autenticado."""
    postulante_id = str(postulante.get("postulanteId", ""))
    if not postulante_id:
        raise HTTPException(status_code=403, detail="Token sin postulanteId")

    cliente = obtener_cliente()
    # /procesos/mias: el microservicio toma el postulante de la cabecera firmada (no de la URL) y
    # devuelve el historial SIN comentarios internos ni nombres del personal de RRHH.
    respuesta = await cliente.get(
        f"{settings.url_servicio_procesos_seleccion}/procesos/mias",
        headers=_cabeceras_internas(postulante),
    )
    return _reenviar(respuesta)


@router.post("", status_code=201)
async def crear_mi_proceso(
    request: Request,
    postulante: dict = Depends(obtener_postulante_actual),
) -> Response:
    """Crea una postulación del postulante autenticado a un anuncio."""
    postulante_id = str(postulante.get("postulanteId", ""))
    if not postulante_id:
        raise HTTPException(status_code=403, detail="Token sin postulanteId")

    try:
        recibido = await request.json()
    except ValueError:
        recibido = None
    if not isinstance(recibido, dict):
        raise HTTPException(status_code=422, detail="Cuerpo inválido: se espera {\"anuncioId\": <número>}")
    # Solo se reenvía el anuncio; el postulanteId se fuerza al del token (evita que un
    # postulante postule por otro).
    cuerpo = {"postulanteId": postulante_id, "anuncioId": recibido.get("anuncioId")}

    cliente = obtener_cliente()
    respuesta = await cliente.post(
        f"{settings.url_servicio_procesos_seleccion}/procesos",
        json=cuerpo,
        headers=_cabeceras_internas(postulante, incluir_content_type=True),
    )
    return _reenviar(respuesta)