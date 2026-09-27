"""Reglas de negocio de Empresa. Las rutas (api/v1/empresas.py) llaman a estas
funciones; ellas no saben nada de HTTP, solo de SQLAlchemy y las reglas mismas.
"""
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import Anuncio, Empresa
from app.schemas.empresa import EmpresaActualizar, EmpresaCrear
from shared_kernel.exceptions import ConflictoDeEstado


async def crear_empresa(sesion: AsyncSession, datos: EmpresaCrear) -> Empresa:
    """Crea una empresa nueva. Lanza ConflictoDeEstado si el RUC ya existe."""
    empresa = Empresa(
        razon_social=datos.razonSocial,
        ruc=datos.ruc,
        contacto_nombre=datos.contactoNombre,
        contacto_email=datos.contactoEmail,
        contacto_telefono=datos.contactoTelefono,
        sector=datos.sector,
    )
    sesion.add(empresa)
    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        raise ConflictoDeEstado(f"Ya existe una empresa con RUC {datos.ruc}")
    return empresa


async def actualizar_empresa(
    sesion: AsyncSession, empresa: Empresa, datos: EmpresaActualizar
) -> Empresa:
    """Sobrescribe los datos de una empresa existente. Lanza ConflictoDeEstado
    si el nuevo RUC ya pertenece a otra empresa."""
    empresa.razon_social = datos.razonSocial
    empresa.ruc = datos.ruc
    empresa.contacto_nombre = datos.contactoNombre
    empresa.contacto_email = datos.contactoEmail
    empresa.contacto_telefono = datos.contactoTelefono
    empresa.sector = datos.sector

    try:
        await sesion.commit()
    except IntegrityError:
        await sesion.rollback()
        raise ConflictoDeEstado(f"Ya existe una empresa con RUC {datos.ruc}")
    return empresa


async def eliminar_empresa(sesion: AsyncSession, empresa: Empresa) -> None:
    """Marca una empresa como eliminada (borrado lógico). Lanza
    ConflictoDeEstado si todavía tiene anuncios activos (no eliminados)."""
    tiene_anuncios_activos = await sesion.execute(
        select(Anuncio.id)
        .where(Anuncio.empresa_id == empresa.id, Anuncio.eliminado.is_(False))
        .limit(1)
    )
    if tiene_anuncios_activos.first() is not None:
        raise ConflictoDeEstado(
            "No se puede eliminar la empresa: todavía tiene anuncios activos"
        )

    empresa.eliminado = True
    await sesion.commit()