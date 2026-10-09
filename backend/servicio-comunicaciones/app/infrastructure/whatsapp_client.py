"""Cliente HTTP para enviar mensajes al emulador (o Meta en producción).

El emulador expone las mismas rutas que Meta:
    POST {WHATSAPP_API_URL}/meta/whatsapp/v23.0/{phone_number_id}/messages

Cuando se pase a producción, solo cambia WHATSAPP_API_URL y WHATSAPP_API_KEY.
"""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def enviar_mensaje_texto(telefono_destino: str, texto: str) -> dict:
    """Envía un mensaje de texto. Devuelve la respuesta del emulador/Meta.

    Respuesta típica:
        {"messaging_product": "whatsapp",
         "contacts": [{"input": "...", "wa_id": "..."}],
         "messages": [{"id": "wamid.xxx"}]}
    """
    url = (
        f"{settings.whatsapp_api_url}/meta/whatsapp/v23.0/"
        f"{settings.whatsapp_phone_number_id}/messages"
    )
    cuerpo = {
        "messaging_product": "whatsapp",
        "to": telefono_destino,
        "type": "text",
        "text": {"body": texto},
    }
    cabeceras = {
        "Content-Type": "application/json",
        "X-API-Key": settings.whatsapp_api_key,
        # Para Meta real se necesita: "Authorization": f"Bearer {settings.whatsapp_api_key}"
    }

    async with httpx.AsyncClient(timeout=15.0) as cliente:
        respuesta = await cliente.post(url, json=cuerpo, headers=cabeceras)
        respuesta.raise_for_status()
        return respuesta.json()