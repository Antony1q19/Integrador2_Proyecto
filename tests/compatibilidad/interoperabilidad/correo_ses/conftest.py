"""Amazon SES simulado con moto: las pruebas usan la API real de boto3 (sesv2.send_email) pero nada
sale de la máquina. Igual que el sandbox real de SES, moto rechaza remitentes no verificados."""
from types import SimpleNamespace

import boto3
import pytest
from moto import mock_aws
from moto.core import DEFAULT_ACCOUNT_ID
from moto.ses.models import ses_backends

from app.core.config import settings
from app.infrastructure import correo


@pytest.fixture
def ses(monkeypatch):
    """SES con el remitente ya verificado (como en producción) y la URL pública del portal."""
    datos = SimpleNamespace(remitente="notificaciones@talenterp.pe", portal="https://portal.talenterp.pe")
    with mock_aws():
        boto3.client("sesv2", region_name="us-east-1").create_email_identity(EmailIdentity=datos.remitente)
        monkeypatch.setattr(settings, "correo_remitente_email", datos.remitente)
        monkeypatch.setattr(settings, "url_anuncios", datos.portal)
        monkeypatch.setattr(correo, "_cliente_ses", None)  # cliente nuevo dentro del simulador
        datos.enviados = lambda: ses_backends[DEFAULT_ACCOUNT_ID]["us-east-1"].sent_messages
        yield datos
