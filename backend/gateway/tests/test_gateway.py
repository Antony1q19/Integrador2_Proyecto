"""Pruebas del Gateway: reglas de usuarios del ERP y límite de peticiones por IP.

Correr:  PYTHONPATH=.:../libs/shared python -m pytest tests -q   (desde gateway/)
"""
import os

# La configuración se lee al importar: valores de prueba (no se conecta a ninguna base).
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://prueba:prueba@localhost:5432/prueba")
os.environ.setdefault("JWT_SECRET", "jwt-de-prueba")
os.environ.setdefault("GATEWAY_SHARED_SECRET", "hmac-de-prueba")
os.environ.setdefault("URL_SERVICIO_POSTULANTES", "http://servicio-postulantes:8001")

import pytest  # noqa: E402
from fastapi import Depends, FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.limite_peticiones import limitar_por_ip  # noqa: E402
from app.domain.usuarios import (  # noqa: E402
    LARGO_PASSWORD_TEMPORAL,
    generar_password_temporal,
    puede_ver_empresa,
    validar_estado,
    validar_rol_interno,
)
from shared_kernel.exceptions import SolicitudInvalida  # noqa: E402
from shared_kernel.passwords import validar_politica_password  # noqa: E402


# --------------------------------------------------------------------------- usuarios del ERP
def test_password_temporal_es_aleatoria_y_cumple_la_politica():
    claves = {generar_password_temporal() for _ in range(50)}
    assert len(claves) == 50  # nunca se repite (antes era siempre "123456")
    for clave in claves:
        assert len(clave) == LARGO_PASSWORD_TEMPORAL
        assert validar_politica_password(clave) == (True, None)
        assert not set(clave) & set("0O1lI")  # sin caracteres que se confunden al dictarla


@pytest.mark.parametrize("rol", ["Admin", "RRHH", "Supervisor"])
def test_roles_internos_validos(rol):
    validar_rol_interno(rol)


@pytest.mark.parametrize("rol", ["Postulante", "root", ""])
def test_roles_internos_invalidos(rol):
    with pytest.raises(SolicitudInvalida):
        validar_rol_interno(rol)


def test_estados_de_cuenta():
    validar_estado("Suspendido")
    with pytest.raises(SolicitudInvalida):
        validar_estado("Bloqueado")


def test_admin_ve_todas_las_empresas_y_los_demas_solo_las_asignadas():
    assert puede_ver_empresa("Admin", [], 5)
    assert puede_ver_empresa("RRHH", [1, 5], 5)
    assert not puede_ver_empresa("Supervisor", [1, 2], 5)


# --------------------------------------------------------------------------- límite de peticiones
def _app_con_limite(maximo: int) -> TestClient:
    app = FastAPI()

    @app.get("/publico", dependencies=[Depends(limitar_por_ip(maximo))])
    def publico():
        return {"ok": True}

    return TestClient(app)


def test_limite_por_ip_responde_429_al_pasarse():
    cliente = _app_con_limite(3)
    assert [cliente.get("/publico").status_code for _ in range(3)] == [200, 200, 200]
    respuesta = cliente.get("/publico")
    assert respuesta.status_code == 429
    assert respuesta.headers["Retry-After"] == "60"


def test_cada_limite_lleva_su_propia_cuenta():
    """Gastar el límite de una ruta no bloquea otra (ver anuncios no gasta intentos de login)."""
    agotado, otro = _app_con_limite(1), _app_con_limite(1)
    agotado.get("/publico")
    assert agotado.get("/publico").status_code == 429
    assert otro.get("/publico").status_code == 200
