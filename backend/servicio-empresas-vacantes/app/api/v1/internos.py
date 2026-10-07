"""Rutas INTERNAS: solo las llaman otros microservicios, nunca el navegador.

    POST /internos/anuncios/{id}/cerrar-por-vacantes   → cerrar un anuncio que ya cubrió sus vacantes

¿Por qué no basta con PATCH /anuncios/{id}/estado? Porque esa ruta es solo para Admin y Supervisor,
pero quien registra la última contratación puede ser alguien de RRHH. Cerrar el anuncio al llenarse
es una regla del sistema (la aplica servicio-procesos-seleccion al registrar una contratación), no
una decisión de esa persona.

Seguridad: el Gateway NO reenvía nada que empiece con "/internos" (no está en su tabla de servicios,
ver gateway/app/api/v1/proxy.py → responde 404), así que solo se llega aquí con la firma del Gateway
desde dentro de la red de Docker. Igual se respeta la visibilidad del usuario en cuyo nombre se llama.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import obtener_usuario_actual
from app.core.database import obtener_sesion
from app.infrastructure.models import Anuncio
from shared_kernel.exceptions import RecursoNoEncontrado

router = APIRouter(prefix="/internos", tags=["internos"])


@router.post("/anuncios/{anuncio_id}/cerrar-por-vacantes")
async def cerrar_por_vacantes(
    anuncio_id: int,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(obtener_usuario_actual),
) -> dict:
    consulta = select(Anuncio).where(Anuncio.id == anuncio_id, Anuncio.eliminado.is_(False))
    if usuario["empresas"] is not None:
        consulta = consulta.where(Anuncio.empresa_id.in_(list(usuario["empresas"])))
    anuncio = (await sesion.execute(consulta)).scalar_one_or_none()
    if anuncio is None:
        raise RecursoNoEncontrado(f"Anuncio {anuncio_id} no encontrado")
    anuncio.estado = "Cerrado"
    await sesion.commit()
    return {"id": anuncio.id, "estado": anuncio.estado}
