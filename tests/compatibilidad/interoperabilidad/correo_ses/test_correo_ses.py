"""INTEROPERABILIDAD con Amazon SES (correos) — servicio-postulantes/app/infrastructure/correo.py.

Caso de la matriz: B1. Criterio de aceptación: el correo sale con remitente, destinatario, asunto y
cuerpo en UTF-8 con el formato que espera la API SESv2; los rechazos de SES (sandbox, límite de envío)
se explican al usuario; los enlaces de los correos apuntan al portal y van bien codificados; un fallo
de SES nunca rompe el flujo de "olvidé mi contraseña".
"""
from urllib.parse import parse_qs, urlparse

import pytest
from botocore.exceptions import ClientError

from app.core.config import settings
from app.infrastructure import correo
from shared_kernel.exceptions import ServicioNoDisponible


# ------------------------------------------------------------------ envío
async def test_correo_sale_por_ses_con_remitente_destinatario_y_utf8(ses):
    asunto = "Recuperación de contraseña – Señal de ñandú"

    id_mensaje = await correo.enviar_correo("ana@correo.com", "Ana", asunto, "<p>Hola <b>Ana</b> 👋</p>", "Hola Ana")

    assert id_mensaje
    (mensaje,) = ses.enviados()
    assert mensaje.source == f"TalentERP <{ses.remitente}>"
    assert "ana@correo.com" in str(mensaje.destinations)
    assert mensaje.subject == asunto  # tildes, ñ y guion largo intactos
    assert mensaje.body == "<p>Hola <b>Ana</b> 👋</p>"


async def test_remitente_no_verificado_explica_el_sandbox_de_ses(ses, monkeypatch):
    monkeypatch.setattr(settings, "correo_remitente_email", "sin-verificar@talenterp.pe")

    with pytest.raises(ServicioNoDisponible, match="sandbox de SES"):
        await correo.enviar_correo("ana@correo.com", "Ana", "Asunto", "<p>x</p>", "x")

    assert ses.enviados() == []


async def test_sin_remitente_configurado_no_se_llama_a_ses(ses, monkeypatch):
    monkeypatch.setattr(settings, "correo_remitente_email", "")

    with pytest.raises(ServicioNoDisponible, match="CORREO_REMITENTE_EMAIL"):
        await correo.enviar_correo("ana@correo.com", "Ana", "Asunto", "<p>x</p>", "x")

    assert ses.enviados() == []


async def test_limite_de_envio_de_ses_pide_esperar(ses, monkeypatch):
    class _SesSaturado:
        def send_email(self, **_kwargs):
            raise ClientError({"Error": {"Code": "Throttling", "Message": "Maximum sending rate exceeded."}}, "SendEmail")

    monkeypatch.setattr(correo, "_ses", lambda: _SesSaturado())

    with pytest.raises(ServicioNoDisponible, match="demasiados correos"):
        await correo.enviar_correo("ana@correo.com", "Ana", "Asunto", "<p>x</p>", "x")


# ------------------------------------------------------------------ contenido de los correos
def test_invitacion_enlaza_al_registro_del_portal_con_datos_bien_codificados(ses):
    asunto, html, texto = correo.correo_solicitud_cuenta("Ana", "ana+postula@correo.com", "token-123")

    enlace = next(linea for linea in texto.splitlines() if linea.startswith("http"))
    url = urlparse(enlace)
    assert f"{url.scheme}://{url.netloc}" == ses.portal and url.path == "/registro"
    assert parse_qs(url.query) == {"invitacion": ["token-123"], "email": ["ana+postula@correo.com"]}
    assert "ana%2Bpostula%40correo.com" in enlace  # el "+" no se pierde al abrir el enlace
    assert asunto and "Crear mi cuenta" in html


def test_nombre_con_html_no_se_inyecta_en_el_correo(ses):
    _asunto, html, _texto = correo.correo_solicitud_cuenta("<script>alert(1)</script>", "ana@correo.com", "t")

    assert "<script>" not in html and "&lt;script&gt;" in html


def test_sin_url_del_portal_no_se_arma_un_enlace_roto(ses, monkeypatch):
    monkeypatch.setattr(settings, "url_anuncios", "")

    with pytest.raises(ServicioNoDisponible, match="URL_ANUNCIOS"):
        correo.correo_solicitud_cuenta("Ana", "ana@correo.com", "t")


# ------------------------------------------------------------------ recuperación de contraseña
async def test_recuperacion_envia_el_enlace_para_restablecer(ses):
    await correo.enviar_correo_recuperacion("ana@correo.com", "Ana", "token-secreto")

    (mensaje,) = ses.enviados()
    assert f"{ses.portal}/restablecer-password?token=token-secreto" in mensaje.body


async def test_si_ses_falla_la_recuperacion_no_rompe_el_flujo(ses, monkeypatch):
    """La respuesta al usuario no debe revelar si el correo existe ni romperse si SES falla."""
    monkeypatch.setattr(settings, "correo_remitente_email", "sin-verificar@talenterp.pe")

    await correo.enviar_correo_recuperacion("ana@correo.com", "Ana", "token-secreto")  # no lanza

    assert ses.enviados() == []
