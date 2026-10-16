"""Webhook de la WhatsApp Cloud API de Meta.

1. VERIFICACIÓN (GET), una sola vez, cuando se registra el webhook en Meta:
       ?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=<número>
   Si el token coincide, se devuelve el challenge tal cual.

2. NOTIFICACIONES (POST), con este formato:
    {
      "object": "whatsapp_business_account",
      "entry": [{"changes": [{"value": {
          "messages": [{"from": "51947757081", "id": "wamid...", "timestamp": "1791500424",
                        "type": "text", "text": {"body": "el texto"}}],
          "statuses": [{"id": "wamid...", "status": "sent" | "delivered" | "read" | "failed"}]
      }}]}]
    }
   "messages" son mensajes del postulante; "statuses", el avance de los que enviamos nosotros.
"""
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import obtener_sesion
from app.domain.mensajes import motivo_del_fallo, normalizar_telefono, ocultar_telefono
from app.infrastructure.models import Conversacion, Mensaje
from shared_kernel.exceptions import ServicioNoDisponible
from shared_kernel.visibilidad import llamar_a_servicio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook/whatsapp", tags=["webhook"])

# Estado de Meta -> estado del mensaje en nuestra base.
_ESTADOS = {"sent": "enviado", "delivered": "entregado", "read": "leido", "failed": "fallido"}
# Un estado nunca retrocede (Meta puede mandar "delivered" después de "read").
_ORDEN = {"enviado": 1, "entregado": 2, "leido": 3}


@router.get("", response_model=None)
async def verificar_webhook(
    modo: str = Query("", alias="hub.mode"),
    token: str = Query("", alias="hub.verify_token"),
    desafio: str = Query("", alias="hub.challenge"),
) -> Response:
    """Meta llama aquí al registrar el webhook: si el verify token coincide, se le devuelve el
    "challenge" tal cual y Meta da el webhook por válido."""
    if (
        modo == "subscribe"
        and settings.meta_verify_token
        and hmac.compare_digest(token, settings.meta_verify_token)
    ):
        return Response(content=desafio, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verify token inválido")


def _firma_valida(raw_body: bytes, firma_recibida: str) -> bool:
    """X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(App Secret, cuerpo crudo)."""
    esperada = "sha256=" + hmac.new(settings.meta_app_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperada, firma_recibida)


@router.post("")
async def recibir_webhook(
    request: Request,
    sesion: AsyncSession = Depends(obtener_sesion),
) -> dict:
    """Guarda los mensajes entrantes y actualiza el estado de los enviados."""
    raw_body = await request.body()

    if settings.meta_app_secret:
        if not _firma_valida(raw_body, request.headers.get("x-hub-signature-256", "")):
            logger.warning("Webhook con firma inválida: rechazado")
            raise HTTPException(status_code=401, detail="Firma inválida")
    elif settings.entorno != "desarrollo":
        # Fuera de desarrollo, sin la clave no hay forma de saber si la llamada viene de Meta:
        # se rechaza todo antes que aceptar mensajes falsos.
        logger.error("META_APP_SECRET no está configurado: webhook rechazado")
        raise HTTPException(status_code=503, detail="Webhook no configurado")

    try:
        payload = json.loads(raw_body)
    except ValueError as error:
        logger.error("Error al parsear JSON: %s", error)
        return {"ok": False, "error": "JSON inválido"}

    guardados = actualizados = 0
    for entrada in payload.get("entry", []):
        for cambio in entrada.get("changes", []):
            valor = cambio.get("value", {})
            # Nombre de perfil de WhatsApp de quien escribe (sirve si no es un postulante registrado).
            perfiles = {
                c.get("wa_id"): (c.get("profile") or {}).get("name", "") for c in valor.get("contacts", [])
            }
            for msg in valor.get("messages", []):
                guardados += await _guardar_mensaje_entrante(sesion, msg, perfiles.get(msg.get("from"), ""))
            for estado in valor.get("statuses", []):
                actualizados += await _actualizar_estado(sesion, estado)

    await sesion.commit()
    # Meta solo necesita un 200; si no lo recibe, reintenta el mismo webhook.
    return {"ok": True, "guardados": guardados, "estados": actualizados}


# Lo que se muestra en el chat cuando el mensaje no es texto (por ahora no se descargan archivos).
_SIN_TEXTO = {
    "image": "📷 Imagen",
    "audio": "🎤 Audio",
    "video": "🎬 Video",
    "document": "📄 Documento",
    "sticker": "Sticker",
    "location": "📍 Ubicación",
    "contacts": "👤 Contacto",
}


def _texto_del_mensaje(msg: dict) -> str:
    tipo = msg.get("type", "")
    if tipo == "text":
        return (msg.get("text") or {}).get("body", "")
    if tipo == "button":  # respuesta a un botón de plantilla
        return (msg.get("button") or {}).get("text", "")
    if tipo == "interactive":
        interactivo = msg.get("interactive") or {}
        respuesta = interactivo.get("button_reply") or interactivo.get("list_reply") or {}
        return respuesta.get("title", "")
    etiqueta = _SIN_TEXTO.get(tipo, "Mensaje no soportado")
    pie = (msg.get(tipo) or {}).get("caption") if isinstance(msg.get(tipo), dict) else None
    return f"{etiqueta}: {pie}" if pie else etiqueta


async def _guardar_mensaje_entrante(sesion: AsyncSession, msg: dict, nombre_perfil: str) -> int:
    """Guarda el mensaje en la conversación de ese teléfono (si no hay, la crea)."""
    contenido = _texto_del_mensaje(msg)
    # Sin el texto ni el teléfono completo en el log: son datos personales.
    logger.info("Webhook: mensaje %s de %s", msg.get("type"), ocultar_telefono(msg.get("from", "")))
    if not contenido or not msg.get("from"):
        return 0

    # Meta reintenta el webhook si tardamos en responder: no guardar el mismo mensaje dos veces.
    if msg.get("id") and (
        await sesion.execute(select(Mensaje.id).where(Mensaje.wamid == msg["id"]))
    ).first():
        return 0

    telefono = normalizar_telefono(msg["from"])
    consulta = select(Conversacion).where(Conversacion.telefono == telefono)
    conversacion = (await sesion.execute(consulta)).scalars().first()
    if conversacion is None:
        conversacion = await _crear_conversacion_por_telefono(sesion, telefono, nombre_perfil)

    fecha = (
        datetime.fromtimestamp(int(msg["timestamp"]), tz=timezone.utc)
        if msg.get("timestamp") else datetime.now(timezone.utc)
    )
    sesion.add(Mensaje(
        conversacion_id=conversacion.id,
        remitente="contacto",
        texto=contenido,
        estado="entregado",  # el mensaje entrante ya está "entregado"
        wamid=msg.get("id"),
        fecha=fecha,
    ))
    conversacion.ultima_actividad = fecha
    conversacion.no_leidos = (conversacion.no_leidos or 0) + 1

    logger.info("Mensaje entrante guardado de %s", ocultar_telefono(telefono))
    return 1


# Quién "pregunta" a servicio-postulantes cuando no hay un usuario detrás (lo llama Meta).
_USUARIO_SISTEMA = {"id": "servicio-comunicaciones", "rol": "Admin", "nombre": "WhatsApp"}


async def _crear_conversacion_por_telefono(sesion: AsyncSession, telefono: str, nombre_perfil: str) -> Conversacion:
    """Primer mensaje de un número sin conversación. Si es el teléfono de UN postulante, el chat
    queda a su nombre; si no (no es de nadie, es de varios o postulantes no responde), se abre
    igual como "no registrado" (postulante_id vacío) con el nombre de su perfil de WhatsApp: así
    nadie se pierde un mensaje. Cuando se abra el chat desde la ficha del postulante, lo adopta."""
    encontrados: list[dict] = []
    try:
        encontrados = await llamar_a_servicio(
            settings.url_servicio_postulantes,
            f"/postulantes/por-telefono/{telefono}",
            _USUARIO_SISTEMA,
            settings.gateway_shared_secret,
        )
    except ServicioNoDisponible:
        logger.error("No se pudo consultar servicio-postulantes por el teléfono %s", ocultar_telefono(telefono))

    if len(encontrados) == 1:
        postulante = encontrados[0]
        postulante_id = postulante["id"]
        nombre = f"{postulante['nombres']} {postulante['apellidos']}".strip()
    else:
        if len(encontrados) > 1:
            logger.warning(
                "%s postulantes tienen el teléfono %s: se abre sin asociar", len(encontrados), ocultar_telefono(telefono)
            )
        postulante_id = ""
        nombre = nombre_perfil.strip() or f"+{telefono}"

    conversacion = Conversacion(postulante_id=postulante_id, nombre=nombre, telefono=telefono)
    sesion.add(conversacion)
    await sesion.flush()  # para que tenga id antes de colgarle el mensaje
    logger.info("Conversación nueva con %s", ocultar_telefono(telefono))
    return conversacion


async def _actualizar_estado(sesion: AsyncSession, estado: dict) -> int:
    """Avanza el estado de un mensaje que enviamos (buscado por su wamid)."""
    nuevo = _ESTADOS.get(estado.get("status", ""))
    if not nuevo or not estado.get("id"):
        return 0

    consulta = select(Mensaje).where(Mensaje.wamid == estado["id"])
    mensaje = (await sesion.execute(consulta)).scalar_one_or_none()
    if mensaje is None:
        return 0

    if nuevo == "fallido":
        mensaje.error = motivo_del_fallo(estado.get("errors") or [])
        logger.warning("WhatsApp no entregó un mensaje: %s", mensaje.error)
    elif _ORDEN.get(nuevo, 0) <= _ORDEN.get(mensaje.estado, 0):
        return 0
    mensaje.estado = nuevo
    return 1
