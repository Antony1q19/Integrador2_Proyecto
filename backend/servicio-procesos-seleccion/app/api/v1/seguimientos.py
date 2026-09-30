"""Rutas del seguimiento post-ingreso (los controles a los 30, 60 y 90 días de que alguien ingresó).

Rutas (prefijo /seguimientos). El navegador las llama a través del Gateway, como /api/v1/seguimientos...:
    GET    /seguimientos?postulanteId=&contratacionId=&estado=&soloVencidos=   → listar controles
    POST   /seguimientos                                                       → agregar un control adicional (Admin, RRHH)
    PATCH  /seguimientos/{id}                                                  → registrar cómo salió o reprogramar (Admin, RRHH)

Los controles de 30, 60 y 90 días se crean solos al registrar la contratación (ver contrataciones.py).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager, joinedload

from app.api.comunes import USUARIO_POR_DEFECTO, seguimiento_a_respuesta
from app.api.deps import requerir_rol
from app.api.visibilidad import anuncios_visibles
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.seleccion import (
    ESTADOS_SEGUIMIENTO,
    VALORACIONES_SEGUIMIENTO,
    fecha_de_seguimiento,
    hoy_en_peru,
    validar_cierre_de_seguimiento,
    validar_opcion,
)
from app.infrastructure.models import Contratacion, ProcesoPostulacion, SeguimientoPostingreso
from app.schemas.seleccion import SeguimientoActualizar, SeguimientoCrear, SeguimientoRespuesta
from shared_kernel.exceptions import ConflictoDeEstado, RecursoNoEncontrado

router = APIRouter(prefix="/seguimientos", tags=["seguimientos"])


async def _cargar(sesion: AsyncSession, seguimiento_id: str, usuario: dict) -> SeguimientoPostingreso:
    """Busca un seguimiento con su contratación y postulación; 404 si no existe o es de otra empresa."""
    resultado = await sesion.execute(
        select(SeguimientoPostingreso)
        .options(joinedload(SeguimientoPostingreso.contratacion).joinedload(Contratacion.proceso))
        .where(SeguimientoPostingreso.id == seguimiento_id)
    )
    seguimiento = resultado.scalar_one_or_none()
    visibles = await anuncios_visibles(usuario)
    if seguimiento is None or (visibles is not None and seguimiento.contratacion.proceso.anuncio_id not in visibles):
        raise RecursoNoEncontrado("Seguimiento no encontrado")
    return seguimiento


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------
@router.get("", response_model=list[SeguimientoRespuesta])
async def listar_seguimientos(
    postulanteId: str | None = None,
    contratacionId: str | None = None,
    estado: str | None = None,
    soloVencidos: bool = False,  # solo los pendientes cuya fecha ya pasó
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[SeguimientoRespuesta]:
    validar_opcion(estado, ESTADOS_SEGUIMIENTO, "Estado")
    visibles = await anuncios_visibles(usuario)

    consulta = (
        select(SeguimientoPostingreso)
        .join(Contratacion, SeguimientoPostingreso.contratacion_id == Contratacion.id)
        .join(ProcesoPostulacion, Contratacion.proceso_id == ProcesoPostulacion.id)
        .options(contains_eager(SeguimientoPostingreso.contratacion).contains_eager(Contratacion.proceso))
        .order_by(SeguimientoPostingreso.fecha_programada)
    )
    if postulanteId:
        consulta = consulta.where(ProcesoPostulacion.postulante_id == postulanteId)
    if contratacionId:
        consulta = consulta.where(SeguimientoPostingreso.contratacion_id == contratacionId)
    if estado:
        consulta = consulta.where(SeguimientoPostingreso.estado == estado)
    if soloVencidos:
        consulta = consulta.where(
            SeguimientoPostingreso.estado == "Pendiente", SeguimientoPostingreso.fecha_programada < hoy_en_peru()
        )
    if visibles is not None:
        consulta = consulta.where(ProcesoPostulacion.anuncio_id.in_(list(visibles)))

    resultado = await sesion.execute(consulta)
    return [seguimiento_a_respuesta(s, s.contratacion.proceso) for s in resultado.scalars().all()]


# ---------------------------------------------------------------------------
# Agregar un control adicional
# ---------------------------------------------------------------------------
@router.post("", response_model=SeguimientoRespuesta, status_code=status.HTTP_201_CREATED)
async def agregar_seguimiento(
    datos: SeguimientoCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> SeguimientoRespuesta:
    resultado = await sesion.execute(
        select(Contratacion).options(joinedload(Contratacion.proceso)).where(Contratacion.id == datos.contratacionId)
    )
    contratacion = resultado.scalar_one_or_none()
    visibles = await anuncios_visibles(usuario)
    if contratacion is None or (visibles is not None and contratacion.proceso.anuncio_id not in visibles):
        raise RecursoNoEncontrado("Contratación no encontrada")
    if contratacion.estado in ("Cancelado", "Finalizado"):
        raise ConflictoDeEstado("Esta contratación ya está cerrada")

    seguimiento = SeguimientoPostingreso(
        contratacion=contratacion,
        hito_dias=datos.hitoDias,
        fecha_programada=datos.fechaProgramada or fecha_de_seguimiento(contratacion.fecha_ingreso, datos.hitoDias),
        observaciones=datos.observaciones or None,
    )
    sesion.add(seguimiento)
    await sesion.commit()
    return seguimiento_a_respuesta(seguimiento, contratacion.proceso)


# ---------------------------------------------------------------------------
# Registrar cómo salió / reprogramar
# ---------------------------------------------------------------------------
@router.patch("/{seguimiento_id}", response_model=SeguimientoRespuesta)
async def actualizar_seguimiento(
    seguimiento_id: str,
    datos: SeguimientoActualizar,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> SeguimientoRespuesta:
    seguimiento = await _cargar(sesion, seguimiento_id, usuario)
    cambios = datos.model_dump(exclude_unset=True)
    validar_opcion(cambios.get("estado"), ESTADOS_SEGUIMIENTO, "Estado")
    validar_opcion(cambios.get("valoracion"), VALORACIONES_SEGUIMIENTO, "Valoración")

    estado_final = cambios.get("estado", seguimiento.estado)
    valoracion_final = cambios.get("valoracion", seguimiento.valoracion)
    validar_cierre_de_seguimiento(estado_final, valoracion_final)

    if cambios.get("fechaProgramada"):
        seguimiento.fecha_programada = cambios["fechaProgramada"]
    if "observaciones" in cambios:
        seguimiento.observaciones = cambios["observaciones"] or None
    seguimiento.estado = estado_final
    if estado_final == "Realizado":
        # Quien lo registra queda como responsable; si no se indica la fecha, es hoy.
        seguimiento.valoracion = valoracion_final
        seguimiento.fecha_realizada = cambios.get("fechaRealizada") or seguimiento.fecha_realizada or hoy_en_peru()
        seguimiento.realizado_por = usuario["nombre"] or USUARIO_POR_DEFECTO
    else:
        # Volver a "Pendiente" u "Omitido" borra el registro de cómo salió.
        seguimiento.valoracion = None
        seguimiento.fecha_realizada = None
        seguimiento.realizado_por = None

    await sesion.commit()
    return seguimiento_a_respuesta(seguimiento, seguimiento.contratacion.proceso)
