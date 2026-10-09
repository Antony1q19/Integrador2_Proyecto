"""Webhook público para recibir mensajes de WhatsApp (emulador o Meta).

No requiere token porque los webhooks vienen de Meta/Kapso, no del navegador.
La seguridad se basa en la firma HMAC que envía el emulador/Meta.
"""
from fastapi import APIRouter, Request, Response

from app.core.config import settings
from app.core.http_client import obtener_cliente

router = APIRouter(prefix="/publico/webhook", tags=["publico-webhook"])


@router.post("/whatsapp")
async def recibir_webhook_whatsapp(request: Request) -> Response:
    """Recibe el webhook y lo reenvía al servicio-comunicaciones."""
    if not settings.url_servicio_comunicaciones:
        return Response(
            content=b'{"detail":"Servicio no configurado"}',
            status_code=503,
            media_type="application/json",
        )

    cuerpo = await request.body()
    firma = request.headers.get("x-webhook-signature", "")

    cliente = obtener_cliente()
    respuesta = await cliente.post(
        f"{settings.url_servicio_comunicaciones}/webhook/whatsapp",
        content=cuerpo,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": firma,
        },
    )

    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        media_type="application/json",
    )