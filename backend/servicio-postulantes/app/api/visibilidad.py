"""Qué postulantes puede ver el usuario según las empresas que tiene asignadas.

Las postulaciones (y por tanto la empresa a la que postuló cada persona) viven en
servicio-procesos-seleccion; por eso se le pregunta a ese servicio cuáles postulantes debe
ocultar. Un Admin no tiene filtro. Ver shared_kernel/visibilidad.py.
"""
from fastapi import Depends

from app.api.deps import obtener_usuario_actual
from app.core.config import settings
from shared_kernel.exceptions import RecursoNoEncontrado
from shared_kernel.visibilidad import llamar_a_servicio


async def postulantes_ocultos(usuario: dict) -> set[str]:
    """Ids de los postulantes que el usuario NO debe ver (vacío si no tiene filtro)."""
    if usuario["empresas"] is None:
        return set()
    ids = await llamar_a_servicio(
        settings.url_servicio_procesos_seleccion,
        "/procesos/postulantes-ocultos",
        usuario,
        settings.gateway_shared_secret,
    )
    return set(ids)


async def exigir_postulante_visible(
    postulante_id: str, usuario: dict = Depends(obtener_usuario_actual)
) -> None:
    """Dependencia para las rutas de UN postulante: responde 404 si es de una empresa que
    el usuario no puede ver (igual que si no existiera)."""
    if postulante_id in await postulantes_ocultos(usuario):
        raise RecursoNoEncontrado(f"Postulante {postulante_id} no encontrado")
