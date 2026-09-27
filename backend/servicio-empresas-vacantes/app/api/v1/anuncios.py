"""Rutas de anuncios (solo lectura por ahora).

Rutas (prefijo /anuncios). El navegador las llama a través del Gateway, como
/api/v1/anuncios...:
    GET  /anuncios        → listar todos los anuncios (con el nombre de su empresa)
    GET  /anuncios/{id}   → ver uno
    POST   /anuncios              → crear uno (Admin, RRHH)
    PUT    /anuncios/{id}         → editar uno (Admin, RRHH)
    PATCH  /anuncios/{id}/estado  → cambiar solo el estado (Admin, RRHH)
    DELETE /anuncios/{id}         → eliminar uno (Admin, RRHH) — borrado lógico

Lectura: Admin, RRHH y Supervisor. Escritura: solo Admin y RRHH.
RRHH y Supervisor solo ven/editan los anuncios de las empresas que un Admin
les asignó (los demás anuncios ni aparecen ni se pueden abrir: 404).

Un anuncio "eliminado" (borrado lógico) nunca aparece en estas consultas, como
si de verdad no existiera.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import requerir_rol
from app.core.database import obtener_sesion_lectura, obtener_sesion
from app.infrastructure.models import Anuncio, Empresa
from app.schemas.anuncio import AnuncioRespuesta, AnuncioActualizar, AnuncioCambiarEstado, AnuncioCrear
from app.domain import anuncios as anuncios_domain
from shared_kernel.exceptions import RecursoNoEncontrado, SolicitudInvalida

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
# nombre de la empresa en la misma consulta. Se excluyen los anuncios
# eliminados (borrado lógico) para que nunca aparezcan, como si no existieran.
_ANUNCIOS_CON_EMPRESA = (
    select(Anuncio, Empresa.razon_social)
    .join(Empresa, Anuncio.empresa_id == Empresa.id)
    .where(Anuncio.eliminado.is_(False))
)


def _solo_los_visibles(consulta, usuario: dict):
    """Si el usuario tiene empresas asignadas (RRHH/Supervisor), deja solo los anuncios de ellas."""
    if usuario["empresas"] is not None:
        consulta = consulta.where(Anuncio.empresa_id.in_(list(usuario["empresas"])))
    return consulta

def _verificar_empresa_visible(empresa_id: int, usuario: dict) -> None:
    """Antes de crear/editar un anuncio, confirma que la empresa indicada es
    una de las que el usuario puede usar (si tiene restricción de empresas)."""
    if usuario["empresas"] is not None and empresa_id not in usuario["empresas"]:
        raise SolicitudInvalida(
            f"No tienes acceso a la empresa {empresa_id}, o no existe"
        )

async def _buscar_anuncio_o_404(
    sesion: AsyncSession, anuncio_id: int, usuario: dict
) -> Anuncio:
    """Trae la fila real de Anuncio (no el schema de respuesta), respetando
    visibilidad y borrado lógico. La usan PUT, PATCH y DELETE."""
    consulta = _solo_los_visibles(
        select(Anuncio).where(Anuncio.eliminado.is_(False)), usuario
    ).where(Anuncio.id == anuncio_id)
    resultado = await sesion.execute(consulta)
    anuncio = resultado.scalar_one_or_none()
    if anuncio is None:
        raise RecursoNoEncontrado(f"Anuncio {anuncio_id} no encontrado")
    return anuncio

async def _razon_social_de(sesion: AsyncSession, empresa_id: int) -> str:
    """Trae solo el nombre de la empresa, para armar la respuesta tras crear/editar."""
    resultado = await sesion.execute(
        select(Empresa.razon_social).where(Empresa.id == empresa_id)
    )
    return resultado.scalar_one()

@router.get("", response_model=list[AnuncioRespuesta])
async def listar_anuncios(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[AnuncioRespuesta]:
    resultado = await sesion.execute(_solo_los_visibles(_ANUNCIOS_CON_EMPRESA, usuario).order_by(Anuncio.id))
    return [_a_respuesta(anuncio, razon) for anuncio, razon in resultado.all()]


@router.get("/{anuncio_id}", response_model=AnuncioRespuesta)
async def obtener_anuncio(
    anuncio_id: int,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> AnuncioRespuesta:
    resultado = await sesion.execute(_solo_los_visibles(_ANUNCIOS_CON_EMPRESA, usuario).where(Anuncio.id == anuncio_id))
    fila = resultado.first()
    if fila is None:
        raise RecursoNoEncontrado(f"Anuncio {anuncio_id} no encontrado")
    return _a_respuesta(*fila)

@router.post("", response_model=AnuncioRespuesta, status_code=201)
async def crear_anuncio(
    datos: AnuncioCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> AnuncioRespuesta:
    anuncio = await anuncios_domain.crear_anuncio(sesion, datos, usuario)
    razon_social = await _razon_social_de(sesion, datos.empresaId)
    return _a_respuesta(anuncio, razon_social)


@router.put("/{anuncio_id}", response_model=AnuncioRespuesta)
async def actualizar_anuncio(
    anuncio_id: int,
    datos: AnuncioActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> AnuncioRespuesta:
    anuncio = await _buscar_anuncio_o_404(sesion, anuncio_id, usuario)
    await anuncios_domain.actualizar_anuncio(sesion, anuncio, datos, usuario)
    razon_social = await _razon_social_de(sesion, datos.empresaId)
    return _a_respuesta(anuncio, razon_social)


@router.patch("/{anuncio_id}/estado", response_model=AnuncioRespuesta)
async def cambiar_estado_anuncio(
    anuncio_id: int,
    datos: AnuncioCambiarEstado,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> AnuncioRespuesta:
    anuncio = await _buscar_anuncio_o_404(sesion, anuncio_id, usuario)
    await anuncios_domain.cambiar_estado(sesion, anuncio, datos.estado)
    razon_social = await _razon_social_de(sesion, anuncio.empresa_id)
    return _a_respuesta(anuncio, razon_social)


@router.delete("/{anuncio_id}", status_code=204)
async def eliminar_anuncio(
    anuncio_id: int,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> None:
    anuncio = await _buscar_anuncio_o_404(sesion, anuncio_id, usuario)
    await anuncios_domain.eliminar_anuncio(sesion, anuncio)
