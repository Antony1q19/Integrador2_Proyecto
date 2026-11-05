"""INTEROPERABILIDAD con Meta WhatsApp Cloud API — mensajes ENTRANTES (app/api/v1/webhook.py).

Caso de la matriz: A3. Se envían al webhook cargas con el formato EXACTO que documenta Meta
(mensaje de texto, imagen con pie, estados sent/delivered/read/failed), firmadas con
X-Hub-Signature-256 como lo hace Meta. Criterio de aceptación: todo formato válido se guarda bien, los
reintentos de Meta no duplican mensajes y los estados nunca retroceden aunque lleguen desordenados.
La base de datos se reemplaza por una sesión falsa que responde lo que cada caso necesita.
"""
import hashlib
import hmac
import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.v1 import webhook
from app.core.config import settings
from app.core.database import obtener_sesion
from app.main import app

SECRETO_APP = "clave-secreta-de-la-app"
WEBHOOK = "/webhook/whatsapp"
TELEFONO = "51947757081"


class _Resultado:
    def __init__(self, valor):
        self.valor = valor

    def first(self):
        return self.valor

    def scalar_one_or_none(self):
        return self.valor

    def scalars(self):
        return self


class _SesionFalsa:
    """Responde a cada consulta, en orden, con lo que indique la prueba (None = "no hay nada")."""

    def __init__(self, *respuestas):
        self.respuestas = list(respuestas)
        self.agregados = []
        self.commits = 0

    async def execute(self, *_args, **_kwargs):
        return _Resultado(self.respuestas.pop(0) if self.respuestas else None)

    def add(self, objeto):
        self.agregados.append(objeto)

    async def flush(self):
        for objeto in self.agregados:
            if getattr(objeto, "id", None) is None:
                objeto.id = 99

    async def commit(self):
        self.commits += 1


@pytest.fixture
def enviar_webhook(monkeypatch):
    """Envía una carga al webhook como lo haría Meta (con su firma) usando la sesión indicada."""
    monkeypatch.setattr(settings, "meta_app_secret", SECRETO_APP)
    cliente = TestClient(app)

    def _enviar(carga: dict, sesion: _SesionFalsa):
        app.dependency_overrides[obtener_sesion] = lambda: sesion
        cuerpo = json.dumps(carga).encode()
        firma = "sha256=" + hmac.new(SECRETO_APP.encode(), cuerpo, hashlib.sha256).hexdigest()
        return cliente.post(WEBHOOK, content=cuerpo, headers={"Content-Type": "application/json", "X-Hub-Signature-256": firma})

    yield _enviar
    app.dependency_overrides.clear()


def _carga(valor: dict) -> dict:
    """Envoltura estándar de una notificación de WhatsApp Business (field = messages)."""
    return {
        "object": "whatsapp_business_account",
        "entry": [{"id": "2222222222", "changes": [{"field": "messages", "value": {
            "messaging_product": "whatsapp",
            "metadata": {"display_phone_number": "15550001111", "phone_number_id": "1111111111"},
            **valor,
        }}]}],
    }


def _mensaje(tipo: str, contenido: dict, wamid: str = "wamid.ENTRANTE1") -> dict:
    return _carga({
        "contacts": [{"profile": {"name": "Ana Pérez"}, "wa_id": TELEFONO}],
        "messages": [{"from": TELEFONO, "id": wamid, "timestamp": "1761955200", "type": tipo, tipo: contenido}],
    })


def _estado(estado: str, wamid: str = "wamid.SALIENTE1", errores: list | None = None) -> dict:
    registro = {"id": wamid, "status": estado, "timestamp": "1761955300", "recipient_id": TELEFONO}
    if errores:
        registro["errors"] = errores
    return _carga({"statuses": [registro]})


# ------------------------------------------------------------------ mensajes entrantes
def test_mensaje_de_texto_entrante_se_guarda_en_su_conversacion(enviar_webhook):
    conversacion = SimpleNamespace(id=7, no_leidos=0, ultima_actividad=None)
    sesion = _SesionFalsa(None, conversacion)  # 1) ¿wamid ya guardado? no · 2) conversación del teléfono

    respuesta = enviar_webhook(_mensaje("text", {"body": "Hola, quiero postular 🙂"}), sesion)

    assert respuesta.status_code == 200
    assert respuesta.json() == {"ok": True, "guardados": 1, "estados": 0}
    mensaje = sesion.agregados[0]
    assert (mensaje.conversacion_id, mensaje.remitente, mensaje.texto, mensaje.wamid) == (
        7, "contacto", "Hola, quiero postular 🙂", "wamid.ENTRANTE1")
    assert mensaje.fecha.isoformat().startswith("2025-11-01")  # timestamp Unix de Meta → fecha UTC
    assert conversacion.no_leidos == 1 and sesion.commits == 1


def test_imagen_con_pie_se_guarda_como_texto_descriptivo(enviar_webhook):
    sesion = _SesionFalsa(None, SimpleNamespace(id=7, no_leidos=0, ultima_actividad=None))
    imagen = {"caption": "Mi DNI", "mime_type": "image/jpeg", "sha256": "abc", "id": "MEDIA123"}

    enviar_webhook(_mensaje("image", imagen), sesion)

    assert sesion.agregados[0].texto == "📷 Imagen: Mi DNI"


def test_reintento_de_meta_no_duplica_el_mensaje(enviar_webhook):
    """Meta reenvía el webhook si no recibe un 200 a tiempo: el mismo wamid no se guarda dos veces."""
    sesion = _SesionFalsa(("ya-existe",))  # el wamid ya está guardado

    respuesta = enviar_webhook(_mensaje("text", {"body": "Hola"}), sesion)

    assert respuesta.json() == {"ok": True, "guardados": 0, "estados": 0}
    assert sesion.agregados == []


def test_numero_nuevo_abre_conversacion_con_el_nombre_de_su_perfil(enviar_webhook, monkeypatch):
    async def ningun_postulante(*_args, **_kwargs):
        return []

    monkeypatch.setattr(webhook, "llamar_a_servicio", ningun_postulante)
    sesion = _SesionFalsa(None, None)  # ni el mensaje ni la conversación existen

    enviar_webhook(_mensaje("text", {"body": "Hola"}), sesion)

    conversacion, mensaje = sesion.agregados
    assert (conversacion.telefono, conversacion.nombre, conversacion.postulante_id) == (TELEFONO, "Ana Pérez", "")
    assert mensaje.conversacion_id == 99


# ------------------------------------------------------------------ estados de los mensajes enviados
@pytest.mark.parametrize(
    ("estado_previo", "estado_meta", "estado_final", "actualizados"),
    [
        ("enviado", "delivered", "entregado", 1),
        ("entregado", "read", "leido", 1),
        ("leido", "delivered", "leido", 0),  # llega desordenado: no retrocede
        ("leido", "sent", "leido", 0),
    ],
)
def test_los_estados_avanzan_y_nunca_retroceden(enviar_webhook, estado_previo, estado_meta, estado_final, actualizados):
    mensaje = SimpleNamespace(estado=estado_previo, error=None)

    respuesta = enviar_webhook(_estado(estado_meta), _SesionFalsa(mensaje))

    assert respuesta.json()["estados"] == actualizados
    assert mensaje.estado == estado_final


def test_mensaje_fallido_guarda_el_motivo_que_explica_meta(enviar_webhook):
    mensaje = SimpleNamespace(estado="enviado", error=None)
    error_meta = [{"code": 131047, "title": "Re-engagement message",
                   "message": "Re-engagement message", "error_data": {"details": "Message failed to send because more than 24 hours have passed"}}]

    enviar_webhook(_estado("failed", errores=error_meta), _SesionFalsa(mensaje))

    assert mensaje.estado == "fallido"
    assert mensaje.error and len(mensaje.error) <= 300


def test_estado_de_un_mensaje_desconocido_se_ignora_sin_error(enviar_webhook):
    respuesta = enviar_webhook(_estado("delivered", wamid="wamid.DE-OTRO-SISTEMA"), _SesionFalsa(None))

    assert respuesta.status_code == 200 and respuesta.json()["estados"] == 0


def test_cuerpo_que_no_es_json_responde_sin_romper(enviar_webhook, monkeypatch):
    monkeypatch.setattr(settings, "meta_app_secret", SECRETO_APP)
    cuerpo = b"esto no es json"
    firma = "sha256=" + hmac.new(SECRETO_APP.encode(), cuerpo, hashlib.sha256).hexdigest()
    app.dependency_overrides[obtener_sesion] = lambda: _SesionFalsa()

    respuesta = TestClient(app).post(WEBHOOK, content=cuerpo, headers={"X-Hub-Signature-256": firma})

    assert respuesta.status_code == 200 and respuesta.json()["ok"] is False
