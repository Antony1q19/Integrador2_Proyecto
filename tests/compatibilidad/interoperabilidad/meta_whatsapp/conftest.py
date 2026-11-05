"""Dobles de prueba para la WhatsApp Cloud API de Meta.

`respx` intercepta las llamadas que hace el cliente httpx de servicio-comunicaciones: ninguna prueba
sale a internet ni gasta mensajes, pero se verifica la petición EXACTA que recibiría Meta y cómo se
interpreta cada respuesta suya (formato de la Graph API v23.0).
"""
from types import SimpleNamespace

import pytest
import respx

from app.core.config import settings


@pytest.fixture
def meta(monkeypatch):
    """La configuración de WhatsApp que tendría producción + un Meta simulado (`meta.router`)."""
    datos = SimpleNamespace(token="token-de-prueba", telefono_id="1111111111", waba_id="2222222222", version="v23.0")
    datos.graph = f"https://graph.facebook.com/{datos.version}"
    monkeypatch.setattr(settings, "meta_access_token", datos.token)
    monkeypatch.setattr(settings, "meta_phone_number_id", datos.telefono_id)
    monkeypatch.setattr(settings, "meta_waba_id", datos.waba_id)
    monkeypatch.setattr(settings, "meta_api_version", datos.version)
    with respx.mock(assert_all_called=False) as router:
        datos.router = router
        yield datos
