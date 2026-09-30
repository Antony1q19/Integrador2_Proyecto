"""Rutas de empresas (solo lectura por ahora).

Rutas (prefijo /empresas). El navegador las llama a través del Gateway, como
/api/v1/empresas...:
    GET    /empresas        → listar las empresas que el usuario puede ver
    GET    /empresas/{id}   → ver una
    POST   /empresas        → crear una
    PUT    /empresas/{id}   → editar una
    DELETE /empresas/{id}   → eliminar una (borrado lógico)

Un Admin ve todas; RRHH y Supervisor solo las que un Admin les asignó en /perfil
(ver shared_kernel/visibilidad.py).

Un Admin ve/edita todas las empresas; RRHH solo las que un Admin le asignó en
/perfil (ver shared_kernel/visibilidad.py).

Una empresa "eliminada" (borrado lógico) nunca aparece en estas consultas, como
si de verdad no existiera.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import requerir_rol
from app.core.database import obtener_sesion_lectura, obtener_sesion
from app.infrastructure.models import Anuncio, Empresa
from app.schemas.empresa import EmpresaRespuesta, EmpresaActualizar, EmpresaCrear
from app.domain import empresas as empresas_domain
from shared_kernel.exceptions import RecursoNoEncontrado, ConflictoDeEstado

router = APIRouter(prefix="/empresas", tags=["empresas"])

def _consulta_con_conteo():
    """Arma la consulta base: cada empresa + cuántos anuncios 'no cerrados' y
    'no eliminados' tiene. Se usa tanto en el listado como en el detalle."""
    activos = (
        select(func.count(Anuncio.id))
        .where(
            Anuncio.empresa_id == Empresa.id,
            Anuncio.estado != "Cerrado",
            Anuncio.eliminado.is_(False),
        )
        .scalar_subquery()
    )
    return select(Empresa, activos).where(Empresa.eliminado.is_(False))

def _a_respuesta(e: Empresa, cantidad: int | None) -> EmpresaRespuesta:
    return EmpresaRespuesta(
        id=e.id,
        razonSocial=e.razon_social,
        ruc=e.ruc,
        contactoNombre=e.contacto_nombre,
        contactoEmail=e.contacto_email,
        contactoTelefono=e.contacto_telefono,
        sector=e.sector,
        fechaRegistro=e.fecha_registro,
        anunciosActivos=cantidad or 0,
    )

def _solo_las_visibles(consulta, usuario: dict):
    """Si el usuario tiene empresas asignadas (RRHH/Supervisor), deja solo esas."""
    if usuario["empresas"] is not None:
        consulta = consulta.where(Empresa.id.in_(list(usuario["empresas"])))
    return consulta

async def _buscar_empresa_o_404(
    sesion: AsyncSession, empresa_id: int, usuario: dict
) -> Empresa:
    """Trae la fila real de Empresa (no el schema de respuesta), respetando
    visibilidad y borrado lógico. La usan PUT y DELETE, que necesitan el
    objeto del modelo para modificarlo, no el schema ya armado."""
    consulta = _solo_las_visibles(
        select(Empresa).where(Empresa.eliminado.is_(False)), usuario
    ).where(Empresa.id == empresa_id)
    resultado = await sesion.execute(consulta)
    empresa = resultado.scalar_one_or_none()
    if empresa is None:
        raise RecursoNoEncontrado(f"Empresa {empresa_id} no encontrada")
    return empresa

@router.get("", response_model=list[EmpresaRespuesta])
async def listar_empresas(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[EmpresaRespuesta]:
    consulta = _solo_las_visibles(_consulta_con_conteo(), usuario).order_by(Empresa.id)
    resultado = await sesion.execute(consulta)
    return [_a_respuesta(e, cantidad) for e, cantidad in resultado.all()]

@router.get("/{empresa_id}", response_model=EmpresaRespuesta)
async def obtener_empresa(
    empresa_id: int,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> EmpresaRespuesta:
    consulta = _solo_las_visibles(_consulta_con_conteo(), usuario).where(Empresa.id == empresa_id)
    resultado = await sesion.execute(consulta)
    fila = resultado.first()
    if fila is None:
        raise RecursoNoEncontrado(f"Empresa {empresa_id} no encontrada")
    return _a_respuesta(*fila)

@router.post("", response_model=EmpresaRespuesta, status_code=201)
async def crear_empresa(
    datos: EmpresaCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> EmpresaRespuesta:
    empresa = await empresas_domain.crear_empresa(sesion, datos)
    return _a_respuesta(empresa, 0)

@router.put("/{empresa_id}", response_model=EmpresaRespuesta)
async def actualizar_empresa(
    empresa_id: int,
    datos: EmpresaActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> EmpresaRespuesta:
    empresa = await _buscar_empresa_o_404(sesion, empresa_id, usuario)
    await empresas_domain.actualizar_empresa(sesion, empresa, datos)

    consulta = _consulta_con_conteo().where(Empresa.id == empresa_id)
    fila = (await sesion.execute(consulta)).first()
    return _a_respuesta(*fila)

@router.delete("/{empresa_id}", status_code=204)
async def eliminar_empresa(
    empresa_id: int,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> None:
    empresa = await _buscar_empresa_o_404(sesion, empresa_id, usuario)
    await empresas_domain.eliminar_empresa(sesion, empresa)