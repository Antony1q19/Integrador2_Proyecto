"""Qué conversaciones puede ver el usuario según las empresas que tiene asignadas.

Es la MISMA regla que el resto del ERP (ver shared_kernel/visibilidad.py y el README del backend):
  - Admin ve todo.
  - RRHH y Supervisor solo ven a los postulantes que postularon a anuncios de SUS empresas.
  - Un postulante que todavía no postuló a nada (o un número no registrado) no pertenece a ninguna
    empresa: lo ven todos.
Cuáles postulantes ocultar lo sabe servicio-procesos-seleccion (dueño de las postulaciones).
"""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import obtener_usuario_actual
from app.core.config import settings
from app.core.database import obtener_sesion_lectura
from app.infrastructure.models import Conversacion
from shared_kernel.exceptions import RecursoNoEncontrado
from shared_kernel.visibilidad import llamar_a_servicio


async def postulantes_ocultos(usuario: dict) -> set[str]:
    """Ids de los postulantes que el usuario NO debe ver (vacío si no tiene filtro)."""
    if usuario.get("empresas") is None:
        return set()
    ids = await llamar_a_servicio(
        settings.url_servicio_procesos_seleccion,
        "/procesos/postulantes-ocultos",
        usuario,
        settings.gateway_shared_secret,
    )
    return set(ids)


async def exigir_conversacion_visible(
    conversacion_id: str,
    usuario: dict = Depends(obtener_usuario_actual),
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
) -> None:
    """Dependencia para las rutas de UNA conversación: 404 si no existe o si es de un postulante
    de una empresa que el usuario no puede ver (igual que si no existiera)."""
    conversacion = await sesion.get(Conversacion, conversacion_id)
    if conversacion is None or (
        conversacion.postulante_id and conversacion.postulante_id in await postulantes_ocultos(usuario)
    ):
        raise RecursoNoEncontrado("Conversación no encontrada")
