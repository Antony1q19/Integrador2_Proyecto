"""INTEROPERABILIDAD con Meta WhatsApp Cloud API — mensajes SALIENTES (app/infrastructure/whatsapp_client.py).

Casos de la matriz: A1 (formato de las peticiones y lectura de los errores de Meta) y A5 (versión de la
Graph API configurable). Criterio de aceptación: cada petición coincide con el formato que documenta
Meta y ningún error de Meta llega al usuario como un error genérico (500) ni como su culpa (400) cuando
no lo es.
"""
import json

import httpx
import pytest

from app.core.config import settings
from app.infrastructure import whatsapp_client
from shared_kernel.exceptions import ServicioNoDisponible, SolicitudInvalida

def error_de_meta(codigo: int, mensaje: str, **extra) -> dict:
    """Cuerpo de error con el formato que documenta Meta para la Graph API."""
    return {"error": {"message": mensaje, "type": "OAuthException", "code": codigo, "fbtrace_id": "AbCdEf123", **extra}}


RESPUESTA_ENVIO = {
    "messaging_product": "whatsapp",
    "contacts": [{"input": "51947757081", "wa_id": "51947757081"}],
    "messages": [{"id": "wamid.HBgLNTE5NDc3NTcwODEVAgARGBI"}],
}


def _cuerpo(llamada) -> dict:
    return json.loads(llamada.request.content)


# ------------------------------------------------------------------ formato de las peticiones (A1)
async def test_mensaje_de_texto_tiene_el_formato_de_la_cloud_api(meta):
    ruta = meta.router.post(f"{meta.graph}/{meta.telefono_id}/messages").respond(200, json=RESPUESTA_ENVIO)

    respuesta = await whatsapp_client.enviar_mensaje_texto("51947757081", "Hola, ¿cómo estás? 👋")

    assert respuesta["messages"][0]["id"].startswith("wamid.")
    peticion = ruta.calls.last.request
    assert peticion.headers["Authorization"] == f"Bearer {meta.token}"
    assert peticion.headers["Content-Type"] == "application/json"
    assert _cuerpo(ruta.calls.last) == {
        "messaging_product": "whatsapp",
        "to": "51947757081",
        "type": "text",
        "text": {"body": "Hola, ¿cómo estás? 👋"},  # UTF-8 y emojis llegan intactos
    }


async def test_plantilla_con_variables_las_manda_como_parametros_del_cuerpo(meta):
    ruta = meta.router.post(f"{meta.graph}/{meta.telefono_id}/messages").respond(200, json=RESPUESTA_ENVIO)

    await whatsapp_client.enviar_plantilla("51947757081", "entrevista_programada", "es", ["Ana", "lunes 10:00"])

    assert _cuerpo(ruta.calls.last) == {
        "messaging_product": "whatsapp",
        "to": "51947757081",
        "type": "template",
        "template": {
            "name": "entrevista_programada",
            "language": {"code": "es"},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": "Ana"}, {"type": "text", "text": "lunes 10:00"}],
            }],
        },
    }


async def test_plantilla_sin_variables_no_manda_componentes(meta):
    ruta = meta.router.post(f"{meta.graph}/{meta.telefono_id}/messages").respond(200, json=RESPUESTA_ENVIO)

    await whatsapp_client.enviar_plantilla("51947757081", "hello_world", "en_US")

    assert _cuerpo(ruta.calls.last)["template"] == {"name": "hello_world", "language": {"code": "en_US"}}


async def test_marcar_como_leido_usa_el_formato_de_estado_read(meta):
    ruta = meta.router.post(f"{meta.graph}/{meta.telefono_id}/messages").respond(200, json={"success": True})

    await whatsapp_client.marcar_como_leido("wamid.ABC")

    assert _cuerpo(ruta.calls.last) == {"messaging_product": "whatsapp", "status": "read", "message_id": "wamid.ABC"}


async def test_listar_plantillas_pide_los_campos_necesarios_a_la_cuenta_waba(meta):
    plantilla = {"name": "bienvenida", "status": "APPROVED", "category": "UTILITY", "language": "es",
                 "components": [{"type": "BODY", "text": "Hola {{1}}"}], "id": "123"}
    ruta = meta.router.get(f"{meta.graph}/{meta.waba_id}/message_templates").respond(200, json={"data": [plantilla], "paging": {}})

    plantillas = await whatsapp_client.listar_plantillas()

    assert plantillas == [plantilla]
    parametros = ruta.calls.last.request.url.params
    assert set(parametros["fields"].split(",")) == {"name", "status", "category", "language", "components", "rejected_reason"}
    assert parametros["limit"] == "100"


async def test_crear_plantilla_manda_un_ejemplo_por_variable(meta):
    ruta = meta.router.post(f"{meta.graph}/{meta.waba_id}/message_templates").respond(
        200, json={"id": "987", "status": "PENDING", "category": "UTILITY"}
    )

    await whatsapp_client.crear_plantilla("recordatorio", "UTILITY", "es", "Hola {{1}}, te esperamos el {{2}}", ["Ana", "lunes"])

    assert _cuerpo(ruta.calls.last) == {
        "name": "recordatorio",
        "category": "UTILITY",
        "language": "es",
        "components": [{
            "type": "BODY",
            "text": "Hola {{1}}, te esperamos el {{2}}",
            "example": {"body_text": [["Ana", "lunes"]]},
        }],
    }


async def test_eliminar_plantilla_la_identifica_por_nombre(meta):
    ruta = meta.router.delete(f"{meta.graph}/{meta.waba_id}/message_templates").respond(200, json={"success": True})

    await whatsapp_client.eliminar_plantilla("recordatorio")

    assert ruta.calls.last.request.url.params["name"] == "recordatorio"


# ------------------------------------------------------------------ lectura de los errores de Meta (A1)
@pytest.mark.parametrize(
    ("estado_http", "cuerpo", "excepcion", "texto_esperado"),
    [
        # Problemas del DATO enviado: son del usuario → 400 con el motivo de Meta.
        (400, error_de_meta(131030, "(#131030) Recipient phone number not in allowed list"),
         SolicitudInvalida, "Recipient phone number not in allowed list"),
        (400, error_de_meta(100, "(#100) Invalid parameter", error_user_msg="El número no es válido"),
         SolicitudInvalida, "El número no es válido"),
        # Problemas de la CUENTA o de Meta: no son culpa del usuario → 503 con un motivo claro.
        (401, error_de_meta(190, "Error validating access token: Session has expired"),
         ServicioNoDisponible, "venció"),
        (400, error_de_meta(200, "API access blocked."), ServicioNoDisponible, "bloqueó el acceso"),
        (403, error_de_meta(10, "(#10) Application does not have permission for this action"),
         ServicioNoDisponible, "bloqueó el acceso"),
        (400, error_de_meta(131031, "Account has been locked"), ServicioNoDisponible, "bloqueó el acceso"),
        (429, error_de_meta(130429, "Rate limit hit"), ServicioNoDisponible, "demasiadas peticiones"),
        (400, error_de_meta(4, "(#4) Application request limit reached"), ServicioNoDisponible, "demasiadas peticiones"),
        (500, error_de_meta(1, "An unknown error occurred"), ServicioNoDisponible, "no está respondiendo"),
        # Un intermediario responde una página HTML (no JSON): no debe romper el servicio.
        (502, "<html><body>502 Bad Gateway</body></html>", ServicioNoDisponible, "no está respondiendo"),
    ],
    ids=["131030-destinatario", "100-parametro", "190-token-vencido", "200-api-bloqueada", "10-sin-permiso",
         "131031-cuenta-bloqueada", "130429-limite", "4-limite-app", "500-error-meta", "502-html"],
)
async def test_cada_error_de_meta_se_traduce_al_codigo_correcto(meta, estado_http, cuerpo, excepcion, texto_esperado):
    if isinstance(cuerpo, dict):
        meta.router.post(f"{meta.graph}/{meta.telefono_id}/messages").respond(estado_http, json=cuerpo)
    else:
        meta.router.post(f"{meta.graph}/{meta.telefono_id}/messages").respond(estado_http, text=cuerpo, headers={"Content-Type": "text/html"})

    with pytest.raises(excepcion) as error:
        await whatsapp_client.enviar_mensaje_texto("51947757081", "Hola")

    assert texto_esperado in str(error.value)


@pytest.mark.parametrize("falla", [httpx.ConnectTimeout("tiempo agotado"), httpx.ConnectError("sin red")],
                         ids=["timeout", "sin-conexion"])
async def test_si_meta_no_responde_se_avisa_sin_romper_el_servicio(meta, falla):
    meta.router.post(f"{meta.graph}/{meta.telefono_id}/messages").mock(side_effect=falla)

    with pytest.raises(ServicioNoDisponible, match="No se pudo conectar con WhatsApp"):
        await whatsapp_client.enviar_mensaje_texto("51947757081", "Hola")


@pytest.mark.parametrize("campo", ["meta_access_token", "meta_phone_number_id"])
async def test_sin_configuracion_no_se_llama_a_meta(meta, monkeypatch, campo):
    monkeypatch.setattr(settings, campo, None)

    with pytest.raises(ServicioNoDisponible, match="no está configurado"):
        await whatsapp_client.enviar_mensaje_texto("51947757081", "Hola")

    assert not meta.router.calls  # ninguna petición salió hacia Meta


# ------------------------------------------------------------------ versión de la Graph API (A5)
async def test_la_version_de_la_graph_api_se_cambia_solo_con_configuracion(meta, monkeypatch):
    """Meta retira cada versión ~2 años después de publicarla: migrar debe ser cambiar META_API_VERSION."""
    monkeypatch.setattr(settings, "meta_api_version", "v24.0")
    ruta = meta.router.post(f"https://graph.facebook.com/v24.0/{meta.telefono_id}/messages").respond(200, json=RESPUESTA_ENVIO)

    await whatsapp_client.enviar_mensaje_texto("51947757081", "Hola")

    assert ruta.called
