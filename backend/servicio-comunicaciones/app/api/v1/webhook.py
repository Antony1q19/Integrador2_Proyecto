"""Webhook para recibir mensajes entrantes del emulador (o Meta en prod).

El emulador envía el payload con este formato:
    {
      "message": {
        "id": "wamid.emu.xxxxx",
        "timestamp": "1791500424",
        "type": "text",
        "kapso": {
          "direction": "inbound" | "outbound",
          "whatsapp_conversation_id": "conv-emu-...",
          "content": "el texto del mensaje"
        }
      },
      "conversation": {
        "phone_number": "51987654321",
        "phone_number_id": "555111222333"
      }
    }

Cuando se pase a Meta real, el payload tendrá otra forma, pero eso lo
ajustaremos después. Por ahora solo procesamos el formato del emulador.
"""
import hashlib
import hmac
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import obtener_sesion
from app.domain.mensajes import normalizar_telefono
from app.infrastructure.models import Conversacion, Mensaje

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook/whatsapp", tags=["webhook"])


def _verificar_firma(raw_body: bytes, firma_recibida: str) -> bool:
    """Verifica la firma HMAC-SHA256 con el secreto configurado."""
    if not firma_recibida:
        return False
    esperada = hmac.new(
        settings.whatsapp_webhook_secret.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(esperada, firma_recibida)


@router.post("")
async def recibir_webhook(
    request: Request,
    sesion: AsyncSession = Depends(obtener_sesion),
) -> dict:
    """Recibe webhooks del emulador/Meta y guarda los mensajes en la base."""
    raw_body = await request.body()
    firma = request.headers.get("x-webhook-signature", "")

    # ---- 1. Verificar firma (opcional en desarrollo) ----
    # if not _verificar_firma(raw_body, firma):
    #     logger.warning("Webhook con firma inválida")
    #     raise HTTPException(status_code=401, detail="Firma inválida")

    # ---- 2. Parsear el payload ----
    try:
        payload = await request.json()
    except Exception as error:
        logger.error("Error al parsear JSON: %s", error)
        return {"ok": False, "error": "JSON inválido"}

    message = payload.get("message", {})
    conversacion_data = payload.get("conversation", {})
    kapso = message.get("kapso", {})

    direction = kapso.get("direction")
    contenido = kapso.get("content", "")
    telefono = conversacion_data.get("phone_number", "")
    wamid = message.get("id")
    timestamp = message.get("timestamp")

    logger.info("Webhook recibido: direction=%s, from=%s, content=%s",
                direction, telefono, contenido)

    # ---- 3. Solo procesamos mensajes entrantes (del postulante) ----
    if direction != "inbound":
        logger.info("Mensaje saliente (outbound), ignorado")
        return {"ok": True, "ignorado": "outbound"}

    if not telefono or not contenido:
        logger.warning("Datos incompletos en el webhook")
        return {"ok": False, "error": "Datos incompletos"}

    # ---- 4. Buscar la conversación por teléfono ----
    telefono_normalizado = normalizar_telefono(telefono)

    consulta = select(Conversacion).where(Conversacion.telefono == telefono_normalizado)
    conversacion = (await sesion.execute(consulta)).scalar_one_or_none()

    if conversacion is None:
        logger.warning("No existe conversación para el teléfono %s", telefono_normalizado)
        return {"ok": False, "error": "Conversación no encontrada"}

    # ---- 5. Crear el mensaje entrante ----
    fecha = datetime.fromtimestamp(int(timestamp), tz=timezone.utc) if timestamp else datetime.now(timezone.utc)

    mensaje = Mensaje(
        conversacion_id=conversacion.id,
        remitente="contacto",
        texto=contenido,
        estado="entregado",  # el mensaje entrante ya está "entregado"
        wamid=wamid,
        fecha=fecha,
    )
    sesion.add(mensaje)

    # ---- 6. Actualizar la conversación ----
    conversacion.ultima_actividad = fecha
    conversacion.no_leidos = (conversacion.no_leidos or 0) + 1

    await sesion.commit()
    await sesion.refresh(mensaje)

    logger.info("✅ Mensaje entrante guardado: id=%s", mensaje.id)
    return {"ok": True, "mensaje_id": mensaje.id}