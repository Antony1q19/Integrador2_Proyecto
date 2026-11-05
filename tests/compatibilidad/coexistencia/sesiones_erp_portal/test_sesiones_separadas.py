"""CO-EXISTENCIA — el ERP y el portal de empleos (ANUNCIOS) conviven usando el MISMO Gateway sin que
una sesión sirva en la otra aplicación (caso E4, nivel API).

Criterio de aceptación: un token del portal (audiencia "anuncios", rol Postulante) no abre nada del
ERP, y un token del ERP no abre nada del portal; los tokens falsificados o de otro sistema se rechazan.
No necesita base de datos: el rechazo ocurre antes de consultar la cuenta.
"""
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings
from app.core.database import obtener_sesion_lectura
from app.main import app
from shared_kernel.security import crear_token_acceso


@pytest.fixture
def cliente():
    async def sin_base_de_datos():
        yield None

    app.dependency_overrides[obtener_sesion_lectura] = sin_base_de_datos
    yield TestClient(app)  # sin "with": no arranca la base de datos (lifespan)
    app.dependency_overrides.clear()


def _token(datos: dict, secreto: str | None = None) -> dict:
    token = crear_token_acceso(datos, secreto or settings.jwt_secret)
    return {"Authorization": f"Bearer {token}"}


TOKEN_PORTAL = {"sub": "post-1", "email": "ana@correo.com", "rol": "Postulante", "aud": "anuncios"}
TOKEN_ERP = {"sub": "usr-1", "email": "admin@test.com", "rol": "Admin", "nombre": "Admin", "aud": "erp"}

RUTAS_ERP = [("GET", "/api/v1/usuarios"), ("GET", "/api/v1/postulantes"), ("GET", "/api/v1/dashboard"),
             ("GET", "/api/v1/comunicaciones/conversaciones")]
RUTAS_PORTAL = [("GET", "/api/v1/publico/auth/me"), ("GET", "/api/v1/publico/procesos")]


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_ERP)
def test_sesion_del_portal_no_abre_el_erp(cliente, metodo, ruta):
    respuesta = cliente.request(metodo, ruta, headers=_token(TOKEN_PORTAL))
    assert respuesta.status_code == 403


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_PORTAL)
def test_sesion_del_erp_no_abre_el_portal(cliente, metodo, ruta):
    respuesta = cliente.request(metodo, ruta, headers=_token(TOKEN_ERP))
    assert respuesta.status_code == 403
    assert "exclusivo para postulantes" in respuesta.json()["detail"]


def test_token_del_erp_sin_audiencia_no_entra(cliente):
    sin_audiencia = {k: v for k, v in TOKEN_ERP.items() if k != "aud"}
    assert cliente.get("/api/v1/usuarios", headers=_token(sin_audiencia)).status_code == 403


@pytest.mark.parametrize("ruta", ["/api/v1/usuarios", "/api/v1/publico/auth/me"])
def test_token_firmado_por_otro_sistema_se_rechaza(cliente, ruta):
    respuesta = cliente.get(ruta, headers=_token(TOKEN_ERP, secreto="clave-de-otro-sistema"))
    assert respuesta.status_code == 401


def test_token_vencido_se_rechaza(cliente):
    vencido = jwt.encode({**TOKEN_ERP, "exp": 1}, settings.jwt_secret, algorithm="HS256")
    respuesta = cliente.get("/api/v1/usuarios", headers={"Authorization": f"Bearer {vencido}"})
    assert respuesta.status_code == 401


def test_la_duracion_de_la_sesion_es_la_configurada():
    token = crear_token_acceso(TOKEN_ERP, settings.jwt_secret, minutos_expiracion=60)
    datos = jwt.get_unverified_claims(token)
    assert timedelta(seconds=datos["exp"] - datos["iat"]) == timedelta(minutes=60)
