"""Rutas de anuncios (solo lectura por ahora).

Rutas (prefijo /anuncios). El navegador las llama a través del Gateway, como
/api/v1/anuncios...:
    GET  /anuncios        → listar todos los anuncios (con el nombre de su empresa)
    GET  /anuncios/{id}   → ver uno
Las pueden usar Admin, RRHH y Supervisor. RRHH y Supervisor solo ven los anuncios de las
empresas que un Admin les asignó (los demás anuncios ni aparecen ni se pueden abrir: 404).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import requerir_rol
from app.core.database import obtener_sesion
from app.infrastructure.models import Anuncio, Empresa
from app.schemas.anuncio import AnuncioRespuesta
from shared_kernel.exceptions import RecursoNoEncontrado

router = APIRouter(prefix="/anuncios", tags=["anuncios"])


def _a_respuesta(a: Anuncio, razon_social: str) -> AnuncioRespuesta:
    """Convierte una fila de la base de datos (columnas con guion bajo) al JSON del frontend."""
    return AnuncioRespuesta(
        id=a.id,
        empresaId=a.empresa_id,
        empresaRazonSocial=razon_social,
        cargo=a.cargo,
        descripcion=a.descripcion,
        requisitos=a.requisitos,
        numeroVacantes=a.numero_vacantes,
        salarioMin=a.salario_min,
        salarioMax=a.salario_max,
        fechaLimite=a.fecha_limite,
        estado=a.estado,
        fechaCreacion=a.fecha_creacion,
    )


# "join" = unir dos tablas: aquí, cada anuncio con su empresa, para traer el
# nombre de la empresa en la misma consulta.
_ANUNCIOS_CON_EMPRESA = select(Anuncio, Empresa.razon_social).join(Empresa, Anuncio.empresa_id == Empresa.id)


def _solo_los_visibles(consulta, usuario: dict):
    """Si el usuario tiene empresas asignadas (RRHH/Supervisor), deja solo los anuncios de ellas."""
    if usuario["empresas"] is not None:
        consulta = consulta.where(Anuncio.empresa_id.in_(list(usuario["empresas"])))
    return consulta


@router.get("", response_model=list[AnuncioRespuesta])
async def listar_anuncios(
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[AnuncioRespuesta]:
    resultado = await sesion.execute(_solo_los_visibles(_ANUNCIOS_CON_EMPRESA, usuario).order_by(Anuncio.id))
    return [_a_respuesta(anuncio, razon) for anuncio, razon in resultado.all()]


@router.get("/{anuncio_id}", response_model=AnuncioRespuesta)
async def obtener_anuncio(
    anuncio_id: int,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> AnuncioRespuesta:
    resultado = await sesion.execute(_solo_los_visibles(_ANUNCIOS_CON_EMPRESA, usuario).where(Anuncio.id == anuncio_id))
    fila = resultado.first()
    if fila is None:
        raise RecursoNoEncontrado(f"Anuncio {anuncio_id} no encontrado")
    return _a_respuesta(*fila)
