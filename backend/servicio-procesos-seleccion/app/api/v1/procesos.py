"""Rutas de las postulaciones (un postulante en un anuncio).

Rutas (prefijo /procesos). El navegador las llama a través del Gateway, como
/api/v1/procesos...:
    GET    /procesos?postulanteId=...                                   → ver en qué anuncios postuló y su etapa
    GET    /procesos/postulantes-ocultos                                → ids de postulantes que el usuario no debe ver (lo usa servicio-postulantes)
    POST   /procesos                                                    → registrar que se presentó a un anuncio (Admin, RRHH)
    PATCH  /procesos/postulante/{id}/anuncio/{id}/estado                → moverlo de etapa (Admin, RRHH, Supervisor)

Un postulante puede tener VARIAS postulaciones, cada una en una etapa distinta
(ej. "Entrevista" en un anuncio y "Contratado" en otro).

RRHH y Supervisor solo ven (y tocan) las postulaciones a anuncios de las empresas que un
Admin les asignó; lo demás responde como si no existiera (404).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import requerir_rol
from app.api.visibilidad import anuncios_visibles, postulantes_ocultos
from app.core.database import obtener_sesion
from app.domain.procesos import validar_estado_proceso
from app.infrastructure.models import HistorialEstado, ProcesoPostulacion
from app.schemas.proceso import (
    CambiarEstadoProceso,
    HistorialRespuesta,
    ProcesoCrear,
    ProcesoRespuesta,
)
from shared_kernel.exceptions import ConflictoDeEstado, RecursoNoEncontrado

router = APIRouter(prefix="/procesos", tags=["procesos"])

# Nombre que se guarda en el historial si, por algún motivo, no llega el nombre del usuario.
_USUARIO_POR_DEFECTO = "Usuario RRHH"


async def _buscar_proceso(
    sesion: AsyncSession, postulante_id: str, anuncio_id: int
) -> ProcesoPostulacion | None:
    """Busca la postulación de ese postulante a ese anuncio (o None si no existe).

    `selectinload` trae también su historial en la misma consulta: con la base
    de datos asíncrona no se puede pedir "después" (daría error).
    """
    resultado = await sesion.execute(
        select(ProcesoPostulacion)
        .options(selectinload(ProcesoPostulacion.historial))
        .where(
            ProcesoPostulacion.postulante_id == postulante_id,
            ProcesoPostulacion.anuncio_id == anuncio_id,
        )
    )
    return resultado.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------
@router.get("", response_model=list[ProcesoRespuesta])
async def listar_procesos(
    postulanteId: str | None = None,  # opcional: si se envía, solo las de ese postulante
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[ProcesoPostulacion]:
    visibles = await anuncios_visibles(usuario)
    consulta = (
        select(ProcesoPostulacion)
        .options(selectinload(ProcesoPostulacion.historial))
        .order_by(ProcesoPostulacion.fecha_postulacion)
    )
    if postulanteId:
        consulta = consulta.where(ProcesoPostulacion.postulante_id == postulanteId)
    if visibles is not None:  # RRHH / Supervisor: solo anuncios de sus empresas
        consulta = consulta.where(ProcesoPostulacion.anuncio_id.in_(list(visibles)))
    resultado = await sesion.execute(consulta)
    return list(resultado.scalars().all())


@router.get("/postulantes-ocultos", response_model=list[str])
async def listar_postulantes_ocultos(
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[str]:
    """Ids de los postulantes que este usuario no puede ver (lo consulta servicio-postulantes)."""
    return sorted(await postulantes_ocultos(sesion, usuario))


# ---------------------------------------------------------------------------
# Crear
# ---------------------------------------------------------------------------
@router.post("", response_model=ProcesoRespuesta, status_code=status.HTTP_201_CREATED)
async def crear_proceso(
    datos: ProcesoCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH")),
) -> ProcesoPostulacion:
    # PASO 0: el anuncio debe ser de una empresa que el usuario puede ver.
    visibles = await anuncios_visibles(usuario)
    if visibles is not None and datos.anuncioId not in visibles:
        raise RecursoNoEncontrado("Anuncio no encontrado")

    # PASO 1: no se puede postular dos veces al mismo anuncio.
    if await _buscar_proceso(sesion, datos.postulanteId, datos.anuncioId) is not None:
        raise ConflictoDeEstado("Este postulante ya está postulado a ese anuncio")

    # PASO 2: crear la postulación en la primera etapa, con su primera línea de historial.
    proceso = ProcesoPostulacion(
        postulante_id=datos.postulanteId,
        anuncio_id=datos.anuncioId,
        estado_actual="POSTULADO",
    )
    proceso.historial.append(
        HistorialEstado(estado="POSTULADO", usuario_responsable=usuario["nombre"] or _USUARIO_POR_DEFECTO)
    )
    sesion.add(proceso)
    await sesion.commit()

    # PASO 3: volver a leerla (ya con su id y su historial) para devolverla.
    return await _buscar_proceso(sesion, datos.postulanteId, datos.anuncioId)


# ---------------------------------------------------------------------------
# Cambiar de etapa
# ---------------------------------------------------------------------------
@router.patch(
    "/postulante/{postulante_id}/anuncio/{anuncio_id}/estado",
    response_model=HistorialRespuesta,
)
async def cambiar_estado_proceso(
    postulante_id: str,
    anuncio_id: int,
    datos: CambiarEstadoProceso,
    sesion: AsyncSession = Depends(obtener_sesion),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> HistorialEstado:
    # PASO 1: la etapa debe ser válida y la postulación debe existir (y ser de una empresa visible).
    validar_estado_proceso(datos.estado)
    visibles = await anuncios_visibles(usuario)
    proceso = await _buscar_proceso(sesion, postulante_id, anuncio_id)
    if proceso is None or (visibles is not None and anuncio_id not in visibles):
        raise RecursoNoEncontrado("Ese postulante no está postulado a ese anuncio")

    # PASO 2: cambiar la etapa actual y dejar constancia en el historial.
    registro = HistorialEstado(
        proceso_id=proceso.id,
        estado=datos.estado,
        usuario_responsable=usuario["nombre"] or _USUARIO_POR_DEFECTO,
        comentario=datos.comentario or None,
    )
    proceso.estado_actual = datos.estado
    sesion.add(registro)
    await sesion.commit()
    await sesion.refresh(registro)  # vuelve a leerlo (trae su id y su fecha)
    return registro
