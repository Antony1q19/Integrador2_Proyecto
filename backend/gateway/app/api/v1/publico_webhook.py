"""Webhook público de WhatsApp (Meta WhatsApp Cloud API).

No requiere token porque lo llama Meta, no el navegador. La seguridad está en el
servicio-comunicaciones: el verify token (GET) y la firma X-Hub-Signature-256 (POST).

URL que se registra en Meta (WhatsApp > Configuration > Webhook):
    https://<dominio público>/api/v1/publico/webhook/whatsapp
"""
from fastapi import APIRouter, Depends, Request, Response

from app.core.config import settings
from app.core.http_client import obtener_cliente
from app.core.limite_peticiones import limitar_por_ip

# Límite por IP como el resto de rutas públicas. Es holgado (Meta puede mandar ráfagas de estados),
# pero frena a quien intente saturar el webhook.
router = APIRouter(
    prefix="/publico/webhook",
    tags=["publico-webhook"],
    dependencies=[Depends(limitar_por_ip(600))],
)

def _sin_servicio() -> Response:
    return Response(content=b'{"detail":"Servicio no configurado"}', status_code=503, media_type="application/json")


@router.get("/whatsapp")
async def verificar_webhook_whatsapp(request: Request) -> Response:
    """Verificación de Meta al registrar el webhook (hub.mode, hub.verify_token, hub.challenge)."""
    if not settings.url_servicio_comunicaciones:
        return _sin_servicio()

    respuesta = await obtener_cliente().get(
        f"{settings.url_servicio_comunicaciones}/webhook/whatsapp",
        params=request.query_params,
    )
    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        media_type=respuesta.headers.get("content-type", "text/plain"),
    )


@router.post("/whatsapp")
async def recibir_webhook_whatsapp(request: Request) -> Response:
    """Recibe la notificación de Meta y la reenvía al servicio-comunicaciones."""
    if not settings.url_servicio_comunicaciones:
        return _sin_servicio()

    # El cuerpo va sin tocar (byte por byte): la firma de Meta se calcula sobre él.
    cabeceras = {"Content-Type": "application/json"}
    if "x-hub-signature-256" in request.headers:
        cabeceras["X-Hub-Signature-256"] = request.headers["x-hub-signature-256"]

    respuesta = await obtener_cliente().post(
        f"{settings.url_servicio_comunicaciones}/webhook/whatsapp",
        content=await request.body(),
        headers=cabeceras,
    )
    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        media_type="application/json",
    )
