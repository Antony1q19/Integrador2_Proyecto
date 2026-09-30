"""Reglas de negocio de Anuncio. Las rutas (api/v1/anuncios.py) llaman a estas
funciones; ellas no saben nada de HTTP, solo de SQLAlchemy y las reglas mismas.
"""
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import Anuncio
from app.schemas.anuncio import AnuncioActualizar, AnuncioCrear
from shared_kernel.exceptions import SolicitudInvalida


def verificar_empresa_visible(empresa_id: int, usuario: dict) -> None:
    """Confirma que la empresa indicada es una de las que el usuario puede
    usar (si tiene restricción de empresas). Lanza SolicitudInvalida si no."""
    if usuario["empresas"] is not None and empresa_id not in usuario["empresas"]:
        raise SolicitudInvalida(
            f"No tienes acceso a la empresa {empresa_id}, o no existe"
        )


async def crear_anuncio(
    sesion: AsyncSession, datos: AnuncioCrear, usuario: dict
) -> Anuncio:
    """Crea un anuncio nuevo, siempre con estado 'Abierto'. Lanza
    SolicitudInvalida si la empresa no existe o no es visible para el usuario."""
    verificar_empresa_visible(datos.empresaId, usuario)

    anuncio = Anuncio(
        empresa_id=datos.empresaId,
        cargo=datos.cargo,
        descripcion=datos.descripcion,
        requisitos=datos.requisitos,
        numero_vacantes=datos.numeroVacantes,
        salario_min=datos.salarioMin,
        salario_max=datos.salarioMax,
        fecha_limite=datos.fechaLimite,
        estado="Abierto",  # criterio de aceptación: estado inicial por defecto
    )
    sesion.add(anuncio)
    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        raise SolicitudInvalida(f"La empresa {datos.empresaId} no existe")
    return anuncio


async def actualizar_anuncio(
    sesion: AsyncSession, anuncio: Anuncio, datos: AnuncioActualizar, usuario: dict
) -> Anuncio:
    """Sobrescribe los datos de un anuncio existente (sin tocar su estado)."""
    verificar_empresa_visible(datos.empresaId, usuario)

    anuncio.empresa_id = datos.empresaId
    anuncio.cargo = datos.cargo
    anuncio.descripcion = datos.descripcion
    anuncio.requisitos = datos.requisitos
    anuncio.numero_vacantes = datos.numeroVacantes
    anuncio.salario_min = datos.salarioMin
    anuncio.salario_max = datos.salarioMax
    anuncio.fecha_limite = datos.fechaLimite

    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        raise SolicitudInvalida(f"La empresa {datos.empresaId} no existe")
    return anuncio


async def cambiar_estado(sesion: AsyncSession, anuncio: Anuncio, nuevo_estado: str) -> Anuncio:
    """Cambia únicamente el estado de un anuncio."""
    anuncio.estado = nuevo_estado
    await sesion.commit()
    return anuncio


async def eliminar_anuncio(sesion: AsyncSession, anuncio: Anuncio) -> None:
    """Marca un anuncio como eliminado (borrado lógico)."""
    anuncio.eliminado = True
    await sesion.commit()