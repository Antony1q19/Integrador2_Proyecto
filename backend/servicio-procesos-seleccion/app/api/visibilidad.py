"""Qué postulaciones y postulantes puede ver el usuario según sus empresas asignadas.

Las postulaciones guardan el `anuncio_id`, pero no saben de qué empresa es cada anuncio
(eso vive en servicio-empresas-vacantes). Por eso se le pregunta a ese servicio qué anuncios
puede ver el usuario: él ya aplica el filtro de empresas. Ver shared_kernel/visibilidad.py.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.models import ProcesoPostulacion
from shared_kernel.visibilidad import llamar_a_servicio


async def anuncios_visibles(usuario: dict) -> set[int] | None:
    """Ids de los anuncios que el usuario puede ver; None = todos (no tiene filtro)."""
    if usuario["empresas"] is None:
        return None
    anuncios = await llamar_a_servicio(
        settings.url_servicio_empresas_vacantes, "/anuncios", usuario, settings.gateway_shared_secret
    )
    return {anuncio["id"] for anuncio in anuncios}


async def postulantes_ocultos(sesion: AsyncSession, usuario: dict) -> set[str]:
    """Ids de los postulantes que el usuario NO debe ver.

    Un postulante queda oculto cuando ya postuló a algo, pero SOLO a anuncios de empresas que
    el usuario no puede ver. (Quien aún no ha postulado a nada no pertenece a ninguna empresa,
    así que no se oculta.)
    """
    visibles = await anuncios_visibles(usuario)
    if visibles is None:
        return set()

    todos = (await sesion.execute(select(ProcesoPostulacion.postulante_id).distinct())).scalars().all()
    con_alguno_visible = (
        (
            await sesion.execute(
                select(ProcesoPostulacion.postulante_id)
                .where(ProcesoPostulacion.anuncio_id.in_(list(visibles)))
                .distinct()
            )
        )
        .scalars()
        .all()
    )
    return set(todos) - set(con_alguno_visible)
