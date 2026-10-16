"""Pruebas del servicio de comunicaciones (WhatsApp): reglas de plantillas y mensajes, y el
webhook de Meta (verificación, firma X-Hub-Signature-256 y lectura de los mensajes).

Correr:  PYTHONPATH=.:../libs/shared python -m pytest tests -q   (desde servicio-comunicaciones/)
No se conecta a Meta ni a la base de datos: la sesión se reemplaza por una falsa.
"""
import hashlib
import hmac
import json
import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://prueba:prueba@localhost:5432/prueba")
os.environ.setdefault("JWT_SECRET", "jwt-de-prueba")
os.environ.setdefault("GATEWAY_SHARED_SECRET", "hmac-de-prueba")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.api.v1.webhook import _texto_del_mensaje  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import obtener_sesion  # noqa: E402
from app.domain.mensajes import motivo_del_fallo, normalizar_telefono, ocultar_telefono, validar_texto  # noqa: E402
from app.domain.plantillas import contar_variables, rellenar, validar_cuerpo  # noqa: E402
from app.main import app  # noqa: E402
from shared_kernel.exceptions import SolicitudInvalida  # noqa: E402

WEBHOOK = "/webhook/whatsapp"


# --------------------------------------------------------------------------- plantillas
def test_contar_y_rellenar_variables():
    cuerpo = "Hola {{1}}, tu entrevista para {{2}} es el {{3}}. ¡Éxitos {{1}}!"
    assert contar_variables(cuerpo) == 3
    assert rellenar(cuerpo, ["Ana", "Analista", "lunes"]) == "Hola Ana, tu entrevista para Analista es el lunes. ¡Éxitos Ana!"
    assert rellenar("Hola {{1}} y {{2}}", ["Ana"]) == "Hola Ana y {{2}}"  # sin valor: queda la marca


def test_plantilla_con_variables_salteadas_es_rechazada():
    with pytest.raises(SolicitudInvalida, match="sin saltarse"):
        validar_cuerpo("Hola {{1}}, puesto {{3}}", ["Ana", "x"])


def test_plantilla_exige_un_ejemplo_por_variable():
    with pytest.raises(SolicitudInvalida, match="ejemplo"):
        validar_cuerpo("Hola {{1}}, puesto {{2}}", ["Ana"])
    with pytest.raises(SolicitudInvalida):
        validar_cuerpo("Hola {{1}}", ["   "])
    validar_cuerpo("Hola {{1}}, puesto {{2}}", ["Ana", "Analista"])
    validar_cuerpo("Sin variables", [])


# --------------------------------------------------------------------------- mensajes
def test_telefono_se_normaliza_con_51_por_defecto():
    assert normalizar_telefono("947 757 081") == "51947757081"
    with pytest.raises(SolicitudInvalida):
        normalizar_telefono("sin números")


def test_telefono_se_oculta_en_los_logs():
    assert ocultar_telefono("51947757081") == "51*****7081"
    assert "947757" not in ocultar_telefono("+51 947 757 081")
    assert ocultar_telefono("123") == "***"


def test_texto_del_mensaje_obligatorio_y_acotado():
    with pytest.raises(SolicitudInvalida):
        validar_texto("   ")
    with pytest.raises(SolicitudInvalida):
        validar_texto("x" * 4001)
    validar_texto("Hola")


def test_motivo_del_fallo_en_espanol():
    assert "24 horas" in motivo_del_fallo([{"code": 131047, "title": "Re-engagement message"}])
    assert motivo_del_fallo([{"code": 999, "title": "Algo raro"}]) == "Algo raro"
    assert motivo_del_fallo([]) == "WhatsApp no pudo entregar el mensaje."


@pytest.mark.parametrize(
    ("mensaje", "texto"),
    [
        ({"type": "text", "text": {"body": "Hola"}}, "Hola"),
        ({"type": "image", "image": {"caption": "mi CV"}}, "📷 Imagen: mi CV"),
        ({"type": "audio", "audio": {}}, "🎤 Audio"),
        ({"type": "button", "button": {"text": "Confirmo"}}, "Confirmo"),
        ({"type": "interactive", "interactive": {"button_reply": {"title": "Sí"}}}, "Sí"),
        ({"type": "reaction"}, "Mensaje no soportado"),
    ],
)
def test_texto_que_se_guarda_segun_el_tipo_de_mensaje(mensaje, texto):
    assert _texto_del_mensaje(mensaje) == texto


# --------------------------------------------------------------------------- webhook (API)
class _ResultadoVacio:
    """Lo que devuelve la sesión falsa: "no hay nada" para cualquier consulta."""

    def first(self):
        return None

    def scalar_one_or_none(self):
        return None

    def scalars(self):
        return self


class _SesionFalsa:
    def __init__(self):
        self.agregados = []
        self.commits = 0

    async def execute(self, *_args, **_kwargs):
        return _ResultadoVacio()

    def add(self, objeto):
        self.agregados.append(objeto)

    async def commit(self):
        self.commits += 1


@pytest.fixture
def cliente(monkeypatch):
    sesion = _SesionFalsa()
    app.dependency_overrides[obtener_sesion] = lambda: sesion
    monkeypatch.setattr(settings, "meta_verify_token", "token-verificacion")
    monkeypatch.setattr(settings, "meta_app_secret", "clave-secreta-app")
    monkeypatch.setattr(settings, "entorno", "produccion")
    yield TestClient(app), sesion
    app.dependency_overrides.clear()


def _firmar(cuerpo: bytes, secreto: str = "clave-secreta-app") -> str:
    return "sha256=" + hmac.new(secreto.encode(), cuerpo, hashlib.sha256).hexdigest()


ESTADO_LEIDO = json.dumps(
    {"object": "whatsapp_business_account", "entry": [{"changes": [{"value": {"statuses": [{"id": "wamid.x", "status": "read"}]}}]}]}
).encode()


def test_verificacion_de_meta_devuelve_el_challenge(cliente):
    http, _ = cliente
    respuesta = http.get(WEBHOOK, params={"hub.mode": "subscribe", "hub.verify_token": "token-verificacion", "hub.challenge": "12345"})
    assert respuesta.status_code == 200 and respuesta.text == "12345"


def test_verificacion_con_token_incorrecto_es_rechazada(cliente):
    http, _ = cliente
    respuesta = http.get(WEBHOOK, params={"hub.mode": "subscribe", "hub.verify_token": "adivinado", "hub.challenge": "1"})
    assert respuesta.status_code == 403


def test_webhook_sin_firma_es_rechazado(cliente):
    """Nadie que no sea Meta puede meter mensajes falsos en el ERP."""
    http, sesion = cliente
    respuesta = http.post(WEBHOOK, content=ESTADO_LEIDO, headers={"Content-Type": "application/json"})
    assert respuesta.status_code == 401
    assert sesion.commits == 0


def test_webhook_firmado_con_otra_clave_es_rechazado(cliente):
    http, _ = cliente
    respuesta = http.post(
        WEBHOOK,
        content=ESTADO_LEIDO,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": _firmar(ESTADO_LEIDO, "otra")},
    )
    assert respuesta.status_code == 401


def test_webhook_con_firma_valida_es_aceptado(cliente):
    http, sesion = cliente
    respuesta = http.post(
        WEBHOOK,
        content=ESTADO_LEIDO,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": _firmar(ESTADO_LEIDO)},
    )
    assert respuesta.status_code == 200
    assert respuesta.json() == {"ok": True, "guardados": 0, "estados": 0}  # el wamid no existe en la base
    assert sesion.commits == 1


def test_fuera_de_desarrollo_sin_clave_de_la_app_se_rechaza_todo(cliente, monkeypatch):
    http, _ = cliente
    monkeypatch.setattr(settings, "meta_app_secret", None)
    respuesta = http.post(WEBHOOK, content=ESTADO_LEIDO, headers={"Content-Type": "application/json"})
    assert respuesta.status_code == 503


def test_peticion_sin_firma_del_gateway_es_rechazada(cliente):
    """Las rutas del ERP solo aceptan llamadas firmadas por el Gateway (no se las puede llamar directo)."""
    http, _ = cliente
    assert http.get("/comunicaciones/conversaciones").status_code == 403
