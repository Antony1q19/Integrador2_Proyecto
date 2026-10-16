"""Cliente HTTP para la WhatsApp Cloud API de Meta.

    Mensajes:   POST https://graph.facebook.com/{META_API_VERSION}/{META_PHONE_NUMBER_ID}/messages
    Plantillas: GET/POST/DELETE https://graph.facebook.com/{META_API_VERSION}/{META_WABA_ID}/message_templates
    Siempre con "Authorization: Bearer {META_ACCESS_TOKEN}".
"""
import logging
from typing import Any

import httpx

from app.core.config import settings
from shared_kernel.exceptions import ServicioNoDisponible, SolicitudInvalida

logger = logging.getLogger(__name__)

_CAMPOS_PLANTILLA = "name,status,category,language,components,rejected_reason"


async def enviar_mensaje_texto(telefono_destino: str, texto: str) -> dict:
    """Envía un mensaje de texto. El teléfono va con código de país (ej. 51947757081).

    Respuesta típica:
        {"messaging_product": "whatsapp",
         "contacts": [{"input": "...", "wa_id": "..."}],
         "messages": [{"id": "wamid.xxx"}]}

    Ojo: WhatsApp solo entrega texto libre si la persona escribió en las últimas 24 horas.
    Si no, Meta lo acepta igual pero luego avisa por webhook que falló (error 131047).
    """
    return await _enviar({"to": telefono_destino, "type": "text", "text": {"body": texto}})


async def enviar_plantilla(
    telefono_destino: str, plantilla: str, idioma: str, variables: list[str] | None = None
) -> dict:
    """Envía una plantilla aprobada, rellenando sus {{1}}, {{2}}... con `variables`. Es la única
    forma de escribirle a alguien que no ha mandado un mensaje en las últimas 24 horas."""
    template: dict[str, Any] = {"name": plantilla, "language": {"code": idioma}}
    if variables:
        template["components"] = [{
            "type": "body",
            "parameters": [{"type": "text", "text": valor} for valor in variables],
        }]
    return await _enviar({"to": telefono_destino, "type": "template", "template": template})


async def marcar_como_leido(wamid: str) -> None:
    """Le dice a WhatsApp que leímos ese mensaje (y los anteriores): el postulante ve ✓✓ azules."""
    await _enviar({"status": "read", "message_id": wamid})


async def listar_plantillas(nombre: str | None = None) -> list[dict]:
    """Las plantillas de la cuenta de WhatsApp Business (con su estado de aprobación)."""
    params = {"fields": _CAMPOS_PLANTILLA, "limit": 100}
    if nombre:
        params["name"] = nombre
    respuesta = await _pedir("GET", f"{_waba()}/message_templates", params=params)
    return respuesta.get("data", [])


async def crear_plantilla(nombre: str, categoria: str, idioma: str, cuerpo: str, ejemplos: list[str]) -> dict:
    """La manda a revisión de Meta (queda PENDING; suele aprobarse en minutos)."""
    componente: dict[str, Any] = {"type": "BODY", "text": cuerpo}
    if ejemplos:
        # Meta exige un ejemplo de cada variable para poder revisar la plantilla.
        componente["example"] = {"body_text": [ejemplos]}
    return await _pedir("POST", f"{_waba()}/message_templates", json={
        "name": nombre,
        "category": categoria,
        "language": idioma,
        "components": [componente],
    })


async def eliminar_plantilla(nombre: str) -> None:
    await _pedir("DELETE", f"{_waba()}/message_templates", params={"name": nombre})


async def _enviar(mensaje: dict) -> dict:
    if not settings.meta_phone_number_id:
        raise ServicioNoDisponible("WhatsApp no está configurado: falta META_PHONE_NUMBER_ID")
    return await _pedir(
        "POST", f"{settings.meta_phone_number_id}/messages",
        json={"messaging_product": "whatsapp", **mensaje},
    )


def _waba() -> str:
    if not settings.meta_waba_id:
        raise ServicioNoDisponible("Las plantillas no están configuradas: falta META_WABA_ID")
    return settings.meta_waba_id


async def _pedir(metodo: str, ruta: str, **kwargs: Any) -> dict:
    """Llama a la Graph API. Si Meta rechaza algo, se responde con SU motivo (en español si lo trae)."""
    if not settings.meta_access_token:
        raise ServicioNoDisponible("WhatsApp no está configurado: falta META_ACCESS_TOKEN")

    try:
        async with httpx.AsyncClient(timeout=15.0) as cliente:
            respuesta = await cliente.request(
                metodo,
                f"https://graph.facebook.com/{settings.meta_api_version}/{ruta}",
                headers={"Authorization": f"Bearer {settings.meta_access_token}"},
                **kwargs,
            )
    except httpx.HTTPError as error:
        logger.error("No se pudo conectar con Meta: %s", error)
        raise ServicioNoDisponible("No se pudo conectar con WhatsApp. Intenta nuevamente.") from error

    if respuesta.status_code >= 400:
        # Ej. 131030: el número no está en la lista de destinatarios de prueba; 190: el token venció.
        logger.error("Meta rechazó la petición (%s): %s", respuesta.status_code, respuesta.text)
        error = respuesta.json().get("error", {}) if respuesta.content else {}
        motivo = error.get("error_user_msg") or error.get("message") or "WhatsApp rechazó la petición"
        if error.get("code") == 190:
            raise ServicioNoDisponible("El token de WhatsApp (META_ACCESS_TOKEN) venció: hay que renovarlo")
        raise SolicitudInvalida(motivo)
    return respuesta.json() if respuesta.content else {}
