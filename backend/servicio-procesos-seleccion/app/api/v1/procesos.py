"""Rutas de las postulaciones (un postulante en un anuncio).

Rutas (prefijo /procesos). El navegador las llama a través del Gateway, como
/api/v1/procesos...:
    GET    /procesos?postulanteId=...                                   → ver en qué anuncios postuló y su etapa (Admin, RRHH, Supervisor)
    GET    /procesos/mias                                               → las postulaciones del postulante con sesión (app ANUNCIOS)
    GET    /procesos/postulantes-ocultos                                → ids de postulantes que el usuario no debe ver (lo usa servicio-postulantes)
    POST   /procesos                                                    → registrar que se presentó a un anuncio (Admin, RRHH, Supervisor o el propio postulante)
    PATCH  /procesos/postulante/{id}/anuncio/{id}/estado                → moverlo de etapa (Admin, RRHH, Supervisor)

Un postulante puede tener VARIAS postulaciones, cada una en una etapa distinta
(ej. "Entrevista" en un anuncio y "Contratado" en otro).

RRHH y Supervisor solo ven (y tocan) las postulaciones a anuncios de las empresas que un
Admin les asignó; lo demás responde como si no existiera (404).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.comunes import buscar_proceso
from app.api.deps import obtener_usuario_actual, requerir_rol
from app.api.visibilidad import anuncio_que_admite_postulantes, anuncios_visibles, postulantes_ocultos
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.procesos import validar_transicion
from app.domain.seleccion import ESTADOS_CONTRATACION_VIVOS
from app.infrastructure.models import Contratacion, HistorialEstado, ProcesoPostulacion
from app.schemas.proceso import (
    CambiarEstadoProceso,
    HistorialRespuesta,
    ProcesoCrear,
    ProcesoPostulanteRespuesta,
    ProcesoRespuesta,
)
from shared_kernel.exceptions import ConflictoDeEstado, RecursoNoEncontrado

router = APIRouter(prefix="/procesos", tags=["procesos"])

# Nombre que se guarda en el historial si, por algún motivo, no llega el nombre del usuario.
_USUARIO_POR_DEFECTO = "Usuario RRHH"


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------
def _consulta_con_historial():
    """Postulaciones con su historial, en una sola consulta, de la más antigua a la más reciente."""
    return (
        select(ProcesoPostulacion)
        .options(joinedload(ProcesoPostulacion.historial))
        .order_by(ProcesoPostulacion.fecha_postulacion)
    )


@router.get("", response_model=list[ProcesoRespuesta])
async def listar_procesos(
    postulanteId: str | None = None,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[ProcesoPostulacion]:
    """Vista del personal del ERP: historial completo, con comentarios y responsables."""
    visibles = await anuncios_visibles(usuario)
    consulta = _consulta_con_historial()
    if postulanteId:
        consulta = consulta.where(ProcesoPostulacion.postulante_id == postulanteId)
    if visibles is not None:
        consulta = consulta.where(ProcesoPostulacion.anuncio_id.in_(list(visibles)))
    resultado = await sesion.execute(consulta)
    return list(resultado.unique().scalars().all())


@router.get("/mias", response_model=list[ProcesoPostulanteRespuesta])
async def listar_mis_procesos(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol("Postulante")),
) -> list[ProcesoPostulacion]:
    """Vista del POSTULANTE (app ANUNCIOS): solo SUS postulaciones (el id sale de su token, no de la
    URL) y un historial sin los comentarios internos ni los nombres del personal de RRHH."""
    if not usuario.get("postulante_id"):
        raise HTTPException(status_code=403, detail="Token de postulante inválido")
    consulta = _consulta_con_historial().where(ProcesoPostulacion.postulante_id == usuario["postulante_id"])
    resultado = await sesion.execute(consulta)
    return list(resultado.unique().scalars().all())


@router.get("/postulantes-ocultos", response_model=list[str])
async def listar_postulantes_ocultos(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
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
    usuario: dict = Depends(obtener_usuario_actual),
) -> ProcesoPostulacion:
    # --- Validación por rol ---
    if usuario["rol"] == "Postulante":
        # Un postulante solo puede postularse a sí mismo
        if not usuario.get("postulante_id") or datos.postulanteId != usuario["postulante_id"]:
            raise HTTPException(status_code=403, detail="Solo puedes postularte tú mismo")
    elif usuario["rol"] not in ("Admin", "RRHH", "Supervisor"):
        raise HTTPException(status_code=403, detail="Rol no autorizado")

    # PASO 0: el anuncio debe admitir postulaciones. Un postulante solo a anuncios publicados
    # (abiertos y vigentes); el personal del ERP, a anuncios de sus empresas que no estén cerrados.
    await anuncio_que_admite_postulantes(usuario, datos.anuncioId)

    # PASO 1: no se puede postular dos veces al mismo anuncio.
    if await buscar_proceso(sesion, datos.postulanteId, datos.anuncioId) is not None:
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
    try:
        await sesion.commit()
    except IntegrityError:
        # Dos clics casi simultáneos: la base de datos (uq_postulante_anuncio) frenó el segundo.
        await sesion.rollback()
        raise ConflictoDeEstado("Este postulante ya está postulado a ese anuncio") from None
    return proceso


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
    # PASO 1: la postulación debe existir (y ser de una empresa visible) y el cambio de etapa debe
    # respetar el flujo de selección (ver validar_transicion en domain/procesos.py).
    visibles = await anuncios_visibles(usuario)
    proceso = await buscar_proceso(sesion, postulante_id, anuncio_id)
    if proceso is None or (visibles is not None and anuncio_id not in visibles):
        raise RecursoNoEncontrado("Ese postulante no está postulado a ese anuncio")
    validar_transicion(proceso.estado_actual, datos.estado, datos.comentario)

    # PASO 1b: si la postulación estaba "Contratado" y se revierte esa decisión, su contratación se cancela
    # (y los controles que quedaban pendientes se omiten): ya no hay a quién hacerle seguimiento.
    if proceso.estado_actual == "CONTRATADO" and datos.estado != "CONTRATADO":
        contratacion = (
            await sesion.execute(
                select(Contratacion)
                .options(joinedload(Contratacion.seguimientos))
                .where(Contratacion.proceso_id == proceso.id)
            )
        ).unique().scalar_one_or_none()
        if contratacion is not None and contratacion.estado in ESTADOS_CONTRATACION_VIVOS:
            contratacion.estado = "Cancelado"
            for seguimiento in contratacion.seguimientos:
                if seguimiento.estado == "Pendiente":
                    seguimiento.estado = "Omitido"

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
    return registro  # ya trae su id y su fecha
