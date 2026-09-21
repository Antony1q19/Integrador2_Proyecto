"""Rutas de empresas (solo lectura por ahora).

Rutas (prefijo /empresas). El navegador las llama a través del Gateway, como
/api/v1/empresas...:
    GET  /empresas   → listar las empresas que el usuario puede ver

Un Admin ve todas; RRHH y Supervisor solo las que un Admin les asignó en /perfil
(ver shared_kernel/visibilidad.py).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import requerir_rol
from app.core.database import obtener_sesion
from app.infrastructure.models import Anuncio, Empresa
from app.schemas.empresa import EmpresaRespuesta

router = APIRouter(prefix="/empresas", tags=["empresas"])


@router.get("", response_model=list[EmpresaRespuesta])
async def listar_empresas(
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[EmpresaRespuesta]:
    # Cuántos anuncios "no cerrados" tiene cada empresa (se calcula en la misma consulta).
    activos = (
        select(func.count(Anuncio.id))
        .where(Anuncio.empresa_id == Empresa.id, Anuncio.estado != "Cerrado")
        .scalar_subquery()
    )
    consulta = select(Empresa, activos).order_by(Empresa.id)
    if usuario["empresas"] is not None:  # RRHH / Supervisor: solo las asignadas
        consulta = consulta.where(Empresa.id.in_(list(usuario["empresas"])))

    resultado = await sesion.execute(consulta)
    return [
        EmpresaRespuesta(
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
        for e, cantidad in resultado.all()
    ]
