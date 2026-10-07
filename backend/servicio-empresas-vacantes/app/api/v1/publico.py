"""Rutas PÚBLICAS de anuncios: las que ve cualquier persona en la app ANUNCIOS, sin sesión.

Rutas (prefijo /publico/anuncios). El Gateway las expone como /api/v1/publico/anuncios...:
    GET  /publico/anuncios        → listar los anuncios publicados
    GET  /publico/anuncios/{id}   → ver uno publicado

Seguridad (por qué es seguro que no pidan sesión):
  - Solo LECTURA: aquí no hay rutas para crear, editar ni borrar.
  - Solo lo PUBLICABLE: anuncios "Abierto", con fecha límite vigente, no eliminados y de una
    empresa no eliminada. Un anuncio "En proceso", "Cerrado" o vencido responde 404, como si
    no existiera.
  - Solo campos PÚBLICOS: la respuesta usa `AnuncioPublico` (lista blanca), nunca el RUC ni
    los contactos de la empresa.
  - Igual exige la FIRMA del Gateway: nadie puede llamar a este servicio directo; el límite de
    peticiones por IP lo aplica el Gateway (ver gateway/app/api/v1/publico.py).
"""
from shared_kernel.fechas import hoy_en_peru

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import verificar_peticion_del_gateway
from app.core.database import obtener_sesion_lectura
from app.infrastructure.models import Anuncio, Empresa
from app.schemas.anuncio import AnuncioPublico
from shared_kernel.exceptions import RecursoNoEncontrado

router = APIRouter(
    prefix="/publico/anuncios",
    tags=["publico"],
    dependencies=[Depends(verificar_peticion_del_gateway)],  # sin usuario, pero sí con la firma
)

# Máximo de anuncios por página: así nadie puede pedir "toda la tabla" de una vez.
_LIMITE_MAXIMO = 100


def _publicados():
    """Consulta base: SOLO los anuncios que se pueden mostrar al público (ver arriba)."""
    return (
        select(Anuncio, Empresa.razon_social, Empresa.sector)
        .join(Empresa, Anuncio.empresa_id == Empresa.id)
        .where(
            Anuncio.eliminado.is_(False),
            Empresa.eliminado.is_(False),
            Anuncio.estado == "Abierto",
            Anuncio.fecha_limite >= hoy_en_peru(),  # hora de Perú (el servidor corre en UTC)
        )
    )


def _a_publico(a: Anuncio, razon_social: str, sector: str | None) -> AnuncioPublico:
    return AnuncioPublico(
        id=a.id,
        cargo=a.cargo,
        empresaNombre=razon_social,
        empresaSector=sector,
        descripcion=a.descripcion,
        requisitos=a.requisitos,
        numeroVacantes=a.numero_vacantes,
        salarioMin=a.salario_min,
        salarioMax=a.salario_max,
        fechaLimite=a.fecha_limite,
        fechaPublicacion=a.fecha_creacion,
    )


@router.get("", response_model=list[AnuncioPublico])
async def listar_anuncios_publicos(
    limite: int = Query(default=50, ge=1, le=_LIMITE_MAXIMO),
    desde: int = Query(default=0, ge=0),
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
) -> list[AnuncioPublico]:
    """Los más recientes primero, de a `limite` (máx. 100), saltando los primeros `desde`."""
    consulta = _publicados().order_by(Anuncio.fecha_creacion.desc(), Anuncio.id.desc()).limit(limite).offset(desde)
    resultado = await sesion.execute(consulta)
    return [_a_publico(a, razon_social, sector) for a, razon_social, sector in resultado.all()]


@router.get("/{anuncio_id}", response_model=AnuncioPublico)
async def obtener_anuncio_publico(
    anuncio_id: int, sesion: AsyncSession = Depends(obtener_sesion_lectura)
) -> AnuncioPublico:
    fila = (await sesion.execute(_publicados().where(Anuncio.id == anuncio_id))).first()
    if fila is None:
        raise RecursoNoEncontrado(f"Anuncio {anuncio_id} no encontrado")
    return _a_publico(*fila)
