"""Rutas de conversaciones y mensajes."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.mensaje import (
    ConversacionCrear,
    ConversacionRespuesta,
    MensajeCrear,
    MensajeRespuesta,
)

from app.api.deps import requerir_rol
from app.api.visibilidad import exigir_conversacion_visible, postulantes_ocultos
from app.core.database import obtener_sesion, obtener_sesion_lectura
from app.domain.mensajes import normalizar_telefono, validar_texto
from app.infrastructure.models import Conversacion, Mensaje
from app.infrastructure.whatsapp_client import enviar_mensaje_texto, marcar_como_leido
from shared_kernel.exceptions import RecursoNoEncontrado

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/comunicaciones", tags=["comunicaciones"])


# Quién puede ESCRIBIR (enviar, abrir chats): Admin y RRHH. El Supervisor solo lee, igual que en
# entrevistas y contrataciones.
_PUEDEN_ESCRIBIR = ("Admin", "RRHH")
_PUEDEN_LEER = ("Admin", "RRHH", "Supervisor")


# ---------------------------------------------------------------------------
# Listar conversaciones
# ---------------------------------------------------------------------------
@router.get("/conversaciones", response_model=list[ConversacionRespuesta])
async def listar_conversaciones(
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    usuario: dict = Depends(requerir_rol(*_PUEDEN_LEER)),
) -> list[ConversacionRespuesta]:
    """Todas las conversaciones, las más recientes primero, con el último mensaje de cada una
    (en la misma consulta: un solo viaje a la base)."""
    ultimo = (
        select(Mensaje.texto)
        .where(Mensaje.conversacion_id == Conversacion.id)
        .order_by(Mensaje.fecha.desc())
        .limit(1)
        .scalar_subquery()
    )
    ultimo_entrante = (
        select(func.max(Mensaje.fecha))
        .where(Mensaje.conversacion_id == Conversacion.id, Mensaje.remitente == "contacto")
        .scalar_subquery()
    )
    consulta = select(Conversacion, ultimo, ultimo_entrante).order_by(Conversacion.ultima_actividad.desc())
    resultado, ocultos = await sesion.execute(consulta), await postulantes_ocultos(usuario)
    return [
        ConversacionRespuesta(
            id=c.id,
            postulante_id=c.postulante_id,
            nombre=c.nombre,
            telefono=c.telefono,
            ultima_actividad=c.ultima_actividad,
            no_leidos=c.no_leidos,
            ultimo_mensaje=texto,
            registrado=bool(c.postulante_id),
            ultimo_entrante=entrante,
        )
        for c, texto, entrante in resultado.all()
        if not (c.postulante_id and c.postulante_id in ocultos)  # solo los chats de SUS empresas
    ]


# ---------------------------------------------------------------------------
# Marcar como leída (al abrir el chat en el ERP)
# ---------------------------------------------------------------------------
@router.post(
    "/conversaciones/{conversacion_id}/leer",
    status_code=204,
    dependencies=[Depends(exigir_conversacion_visible)],
)
async def marcar_leida(
    conversacion_id: str,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol(*_PUEDEN_LEER)),
) -> None:
    """Pone en 0 los no leídos y avisa a WhatsApp, para que el postulante vea los ✓✓ azules."""
    conversacion = await sesion.get(Conversacion, conversacion_id)
    if conversacion is None:
        raise RecursoNoEncontrado("Conversación no encontrada")
    if not conversacion.no_leidos:
        return

    conversacion.no_leidos = 0
    ultimo_recibido = (
        await sesion.execute(
            select(Mensaje.wamid)
            .where(Mensaje.conversacion_id == conversacion_id, Mensaje.remitente == "contacto")
            .order_by(Mensaje.fecha.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    await sesion.commit()

    if ultimo_recibido:
        try:
            await marcar_como_leido(ultimo_recibido)
        except Exception as error:  # noqa: BLE001 — el visto azul es un extra: si falla, no se rompe nada
            logger.warning("No se pudo enviar el visto a WhatsApp: %s", error)


# ---------------------------------------------------------------------------
# Listar mensajes de una conversación
# ---------------------------------------------------------------------------
@router.get(
    "/conversaciones/{conversacion_id}/mensajes",
    response_model=list[MensajeRespuesta],
    dependencies=[Depends(exigir_conversacion_visible)],
)
async def listar_mensajes(
    conversacion_id: str,
    sesion: AsyncSession = Depends(obtener_sesion_lectura),
    _usuario: dict = Depends(requerir_rol(*_PUEDEN_LEER)),
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
    usuario: dict = Depends(requerir_rol(*_PUEDEN_ESCRIBIR)),
) -> Conversacion:
    """Crea una conversación o devuelve la existente con ese postulante."""
    if datos.postulante_id in await postulantes_ocultos(usuario):
        raise RecursoNoEncontrado(f"Postulante {datos.postulante_id} no encontrado")
    telefono = normalizar_telefono(datos.telefono)  # con +51 si no trae código de país
    existente = (
        await sesion.execute(
            select(Conversacion).where(Conversacion.postulante_id == datos.postulante_id)
        )
    ).scalar_one_or_none()
    if existente:
        # El postulante pudo cambiar de nombre o de teléfono desde que se abrió el chat.
        if (existente.telefono, existente.nombre) != (telefono, datos.nombre):
            existente.telefono, existente.nombre = telefono, datos.nombre
            await sesion.commit()
            await sesion.refresh(existente)
        return existente

    # Si ese número ya escribió antes de estar registrado, se le "adopta" su chat (con su historial)
    # en vez de abrir otro con el mismo teléfono.
    sin_registrar = (
        await sesion.execute(
            select(Conversacion).where(Conversacion.telefono == telefono, Conversacion.postulante_id == "")
        )
    ).scalars().first()
    if sin_registrar:
        sin_registrar.postulante_id, sin_registrar.nombre = datos.postulante_id, datos.nombre
        await sesion.commit()
        await sesion.refresh(sin_registrar)
        return sin_registrar

    conversacion = Conversacion(
        postulante_id=datos.postulante_id,
        nombre=datos.nombre,
        telefono=telefono,
    )
    sesion.add(conversacion)
    await sesion.commit()
    await sesion.refresh(conversacion)
    return conversacion


# ---------------------------------------------------------------------------
# Enviar mensaje
# ---------------------------------------------------------------------------
@router.post(
    "/conversaciones/{conversacion_id}/mensajes",
    response_model=MensajeRespuesta,
    status_code=201,
    dependencies=[Depends(exigir_conversacion_visible)],
)
async def enviar_mensaje(
    conversacion_id: str,
    datos: MensajeCrear,
    sesion: AsyncSession = Depends(obtener_sesion),
    _usuario: dict = Depends(requerir_rol(*_PUEDEN_ESCRIBIR)),
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

    # 2. Enviarlo por WhatsApp (Meta Cloud API)
    try:
        respuesta = await enviar_mensaje_texto(conversacion.telefono, datos.texto)
        # Guardar el wamid que devuelve
        mensajes = respuesta.get("messages", [])
        if mensajes:
            mensaje.wamid = mensajes[0].get("id")
    except Exception as error:  # noqa: BLE001 — se guarda como "fallido" con el motivo, sin romper la pantalla
        mensaje.estado = "fallido"
        mensaje.error = str(error)[:300]
        logger.error("Error al enviar a WhatsApp: %s", error)

    # 3. Actualizar última actividad de la conversación
    conversacion.ultima_actividad = datetime.now(timezone.utc)

    await sesion.commit()
    await sesion.refresh(mensaje)
    return mensaje