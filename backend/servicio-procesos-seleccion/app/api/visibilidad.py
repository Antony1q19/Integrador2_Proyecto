"""Qué postulaciones y postulantes puede ver el usuario según sus empresas asignadas.

Las postulaciones guardan el `anuncio_id`, pero no saben de qué empresa es cada anuncio
(eso vive en servicio-empresas-vacantes). Por eso se le pregunta a ese servicio qué anuncios
puede ver el usuario: él ya aplica el filtro de empresas. Ver shared_kernel/visibilidad.py.
"""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.models import ProcesoPostulacion
from shared_kernel.exceptions import ConflictoDeEstado, RecursoNoEncontrado
from shared_kernel.visibilidad import llamar_a_servicio


async def anuncios_visibles(usuario: dict) -> set[int] | None:
    """Ids de los anuncios que el usuario puede ver; None = todos (no tiene filtro)."""
    if usuario["empresas"] is None:
        return None
    anuncios = await llamar_a_servicio(
        settings.url_servicio_empresas_vacantes, "/anuncios", usuario, settings.gateway_shared_secret
    )
    return {anuncio["id"] for anuncio in anuncios}


async def anuncio_que_admite_postulantes(usuario: dict, anuncio_id: int) -> None:
    """Comprueba que se pueda postular a ese anuncio; si no, lanza el error que corresponde.

    - Postulante (app ANUNCIOS): el anuncio debe estar PUBLICADO (Abierto, con fecha límite vigente,
      no eliminado). Se le pregunta a la ruta pública de empresas-vacantes, que aplica esas reglas.
    - Personal del ERP: el anuncio debe existir, ser de una empresa que el usuario puede ver y no
      estar "Cerrado".
    """
    if usuario["rol"] == "Postulante":
        publicado = await llamar_a_servicio(
            settings.url_servicio_empresas_vacantes,
            f"/publico/anuncios/{anuncio_id}",
            usuario,
            settings.gateway_shared_secret,
            permitir_404=True,
        )
        if publicado is None:
            raise ConflictoDeEstado("Este anuncio ya no recibe postulaciones (está cerrado, venció o no existe)")
        return

    anuncio = await obtener_anuncio(usuario, anuncio_id)
    if anuncio.get("estado") == "Cerrado":
        raise ConflictoDeEstado("El anuncio está cerrado: ya no se pueden agregar postulantes")


async def obtener_anuncio(usuario: dict, anuncio_id: int) -> dict:
    """El anuncio (con su estado y número de vacantes), si existe y es de una empresa que el usuario
    puede ver; si no, 404. Se le pregunta a servicio-empresas-vacantes en nombre del usuario."""
    anuncio = await llamar_a_servicio(
        settings.url_servicio_empresas_vacantes,
        f"/anuncios/{anuncio_id}",
        usuario,
        settings.gateway_shared_secret,
        permitir_404=True,
    )
    if anuncio is None:
        raise RecursoNoEncontrado("Anuncio no encontrado")
    return anuncio


async def cerrar_anuncio_por_vacantes(usuario: dict, anuncio_id: int) -> bool:
    """Pide a empresas-vacantes cerrar el anuncio porque ya cubrió sus vacantes (ruta interna).
    Devuelve True si se cerró. Si falla, solo se anota en el log: la contratación ya quedó
    registrada y el anuncio se puede cerrar a mano."""
    try:
        await llamar_a_servicio(
            settings.url_servicio_empresas_vacantes,
            f"/internos/anuncios/{anuncio_id}/cerrar-por-vacantes",
            usuario,
            settings.gateway_shared_secret,
            metodo="POST",
        )
        return True
    except Exception as error:  # noqa: BLE001
        logging.getLogger(__name__).warning("No se pudo cerrar el anuncio %s al cubrir vacantes: %s", anuncio_id, error)
        return False


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
