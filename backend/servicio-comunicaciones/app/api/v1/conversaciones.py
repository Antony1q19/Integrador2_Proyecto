"""Rutas de conversaciones y mensajes."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.schemas.mensaje import (
    ConversacionCrear,        # ← NUEVO
    ConversacionRespuesta,
    MensajeCrear,
    MensajeRespuesta,
)

from app.api.deps import requerir_rol
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.mensajes import normalizar_telefono, validar_texto
from app.infrastructure.models import Conversacion, Mensaje
from app.infrastructure.whatsapp_client import enviar_mensaje_texto
from shared_kernel.exceptions import RecursoNoEncontrado

router = APIRouter(prefix="/comunicaciones", tags=["comunicaciones"])


# ---------------------------------------------------------------------------
# Listar conversaciones
# ---------------------------------------------------------------------------
@router.get("/conversaciones", response_model=list[ConversacionRespuesta])
async def listar_conversaciones(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[Conversacion]:
    """Todas las conversaciones activas, las más recientes primero."""
    consulta = select(Conversacion).order_by(Conversacion.ultima_actividad.desc())
    resultado = await sesion.execute(consulta)
    return list(resultado.scalars().all())


# ---------------------------------------------------------------------------
# Listar mensajes de una conversación
# ---------------------------------------------------------------------------
@router.get("/conversaciones/{conversacion_id}/mensajes", response_model=list[MensajeRespuesta])
async def listar_mensajes(
    conversacion_id: str,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> list[Mensaje]:
    conversacion = await sesion.get(Conversacion, conversacion_id)
    if conversacion is None:
        raise RecursoNoEncontrado("Conversación no encontrada")

    consulta = (
        select(Mensaje)
        .where(Mensaje.conversacion_id == conversacion_id)
        .order_by(Mensaje.fecha)
    )
    resultado = await sesion.execute(consulta)
    return list(resultado.scalars().all())


# ---------------------------------------------------------------------------
# Crear o recuperar conversación con un postulante
# ---------------------------------------------------------------------------
@router.post("/conversaciones", response_model=ConversacionRespuesta, status_code=201)
async def crear_conversacion(
    datos: ConversacionCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> Conversacion:
    """Crea una conversación o devuelve la existente con ese postulante."""
    existente = (
        await sesion.execute(
            select(Conversacion).where(Conversacion.postulante_id == datos.postulante_id)
        )
    ).scalar_one_or_none()
    if existente:
        return existente

    conversacion = Conversacion(
        postulante_id=datos.postulante_id,
        nombre=datos.nombre,
        telefono=normalizar_telefono(datos.telefono),
    )
    sesion.add(conversacion)
    await sesion.commit()
    await sesion.refresh(conversacion)
    return conversacion

@router.post("/conversaciones/{conversacion_id}/mensajes/{mensaje_id}/simular-estado")
async def simular_estado(
    conversacion_id: str,
    mensaje_id: str,
    estado: str,  # "enviado" | "entregado" | "leido"
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> dict:
    """Endpoint temporal para la demo: cambia el estado de un mensaje."""
    mensaje = await sesion.get(Mensaje, mensaje_id)
    if not mensaje:
        raise RecursoNoEncontrado("Mensaje no encontrado")
    mensaje.estado = estado
    await sesion.commit()
    return {"ok": True, "estado": estado}

# ---------------------------------------------------------------------------
# Enviar mensaje
# ---------------------------------------------------------------------------
@router.post("/conversaciones/{conversacion_id}/mensajes", response_model=MensajeRespuesta, status_code=201)
async def enviar_mensaje(
    conversacion_id: str,
    datos: MensajeCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol("Admin", "RRHH", "Supervisor")),
) -> Mensaje:
    conversacion = await sesion.get(Conversacion, conversacion_id)
    if conversacion is None:
        raise RecursoNoEncontrado("Conversación no encontrada")

    validar_texto(datos.texto)

    # 1. Crear el mensaje local en estado "enviado"
    mensaje = Mensaje(
        conversacion_id=conversacion.id,
        remitente="yo",
        texto=datos.texto,
        estado="enviado",
    )
    sesion.add(mensaje)

    # 2. Enviarlo a WhatsApp (emulador o Meta)
    try:
        respuesta = await enviar_mensaje_texto(conversacion.telefono, datos.texto)
        # Guardar el wamid que devuelve
        mensajes = respuesta.get("messages", [])
        if mensajes:
            mensaje.wamid = mensajes[0].get("id")
    except Exception as error:  # noqa: BLE001
        mensaje.estado = "fallido"
        import logging
        logging.getLogger(__name__).error("Error al enviar a WhatsApp: %s", error)

    # 3. Actualizar última actividad de la conversación
    from datetime import datetime, timezone
    conversacion.ultima_actividad = datetime.now(timezone.utc)

    await sesion.commit()
    await sesion.refresh(mensaje)
    return mensaje