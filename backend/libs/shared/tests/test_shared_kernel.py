"""Pruebas de la librería común (shared_kernel): teléfonos, firma entre servicios, visibilidad
por empresa, política de contraseñas y errores de negocio.

Correr (desde backend/, con las dependencias del gateway instaladas):
    PYTHONPATH=libs/shared python -m pytest libs/shared/tests -q
"""
import time

import pytest

from shared_kernel.exceptions import (
    ConflictoDeEstado,
    RecursoNoEncontrado,
    ServicioNoDisponible,
    SolicitudInvalida,
)
from shared_kernel.passwords import hash_password, validar_politica_password, verificar_password
from shared_kernel.security import firmar_peticion_gateway, verificar_firma_gateway
from shared_kernel.telefonos import normalizar_telefono
from shared_kernel.visibilidad import cabeceras_de_usuario, parsear_empresas


# --------------------------------------------------------------------------- teléfonos
@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("947757081", "51947757081"),          # celular peruano sin código: se agrega +51
        ("+51 947 757 081", "51947757081"),    # con código, espacios y +
        ("0051947757081", "51947757081"),      # prefijo internacional 00
        ("(51) 947-757-081", "51947757081"),
        ("+1 415 523 8886", "14155238886"),    # otro país: se respeta
        ("", ""),
        (None, ""),
    ],
)
def test_normalizar_telefono(entrada, esperado):
    assert normalizar_telefono(entrada) == esperado


# --------------------------------------------------------------------------- firma Gateway ↔ servicios
SECRETO = "secreto-de-prueba"
IDENTIDAD = {"X-Usuario-Id": "7", "X-Usuario-Rol": "RRHH", "X-Usuario-Empresas": "1,2"}


def _firmar(nonce: str, timestamp: str | None = None, ruta: str = "/postulantes"):
    ts = timestamp or str(time.time())
    return ts, firmar_peticion_gateway(SECRETO, ts, nonce, "GET", ruta, IDENTIDAD)


def test_firma_valida_es_aceptada():
    ts, firma = _firmar("nonce-ok")
    assert verificar_firma_gateway(SECRETO, ts, "nonce-ok", firma, "GET", "/postulantes", IDENTIDAD)


def test_firma_con_ruta_alterada_es_rechazada():
    ts, firma = _firmar("nonce-ruta")
    assert not verificar_firma_gateway(SECRETO, ts, "nonce-ruta", firma, "GET", "/postulantes/99", IDENTIDAD)


def test_firma_con_identidad_alterada_es_rechazada():
    """Nadie puede cambiar su rol en la cabecera sin invalidar la firma."""
    ts, firma = _firmar("nonce-rol")
    falsa = {**IDENTIDAD, "X-Usuario-Rol": "Admin"}
    assert not verificar_firma_gateway(SECRETO, ts, "nonce-rol", firma, "GET", "/postulantes", falsa)


def test_firma_con_otro_secreto_es_rechazada():
    ts, firma = _firmar("nonce-secreto")
    assert not verificar_firma_gateway("otro", ts, "nonce-secreto", firma, "GET", "/postulantes", IDENTIDAD)


def test_firma_vieja_es_rechazada():
    ts, firma = _firmar("nonce-viejo", timestamp=str(time.time() - 3600))
    assert not verificar_firma_gateway(SECRETO, ts, "nonce-viejo", firma, "GET", "/postulantes", IDENTIDAD)


def test_firma_repetida_es_rechazada():
    """Una petición capturada y reenviada (mismo nonce) no se acepta dos veces."""
    ts, firma = _firmar("nonce-repetido")
    assert verificar_firma_gateway(SECRETO, ts, "nonce-repetido", firma, "GET", "/postulantes", IDENTIDAD)
    assert not verificar_firma_gateway(SECRETO, ts, "nonce-repetido", firma, "GET", "/postulantes", IDENTIDAD)


def test_firma_con_timestamp_invalido_es_rechazada():
    assert not verificar_firma_gateway(SECRETO, "no-es-numero", "n", "x", "GET", "/postulantes", IDENTIDAD)


# --------------------------------------------------------------------------- visibilidad por empresa
def test_admin_no_tiene_filtro_de_empresas():
    assert parsear_empresas("Admin", "1,2") is None


def test_rrhh_y_supervisor_ven_solo_sus_empresas():
    assert parsear_empresas("RRHH", "1, 2,x,") == {1, 2}
    assert parsear_empresas("Supervisor", None) == set()  # sin empresas asignadas: no ve ninguna


def test_cabeceras_de_usuario_codifican_nombre_y_empresas():
    cabeceras = cabeceras_de_usuario({"id": 3, "rol": "RRHH", "nombre": "José", "empresas": {2, 1}})
    assert cabeceras["X-Usuario-Nombre"] == "Jos%C3%A9"  # las cabeceras HTTP solo admiten ASCII
    assert cabeceras["X-Usuario-Empresas"] == "1,2"


# --------------------------------------------------------------------------- contraseñas
@pytest.mark.parametrize(
    "password",
    ["corta1A", "sinmayuscula1", "SINMINUSCULA1", "SinNumeroAqui", "Password123", "a" * 129 + "A1"],
)
def test_politica_rechaza_contrasenas_debiles(password):
    valida, motivo = validar_politica_password(password)
    assert not valida and motivo


def test_politica_rechaza_contrasena_igual_al_usuario_del_correo():
    # Cumple mayúscula, minúscula y número, pero es el usuario del correo.
    valida, motivo = validar_politica_password("Mariaperez1", "mariaperez1@correo.com")
    assert not valida and "correo" in motivo


def test_politica_acepta_contrasena_fuerte():
    assert validar_politica_password("Reclutamiento2026", "rrhh@test.com") == (True, None)


def test_hash_de_contrasena_no_guarda_el_texto_y_se_verifica():
    hash_ = hash_password("Reclutamiento2026")
    assert "Reclutamiento2026" not in hash_
    assert verificar_password("Reclutamiento2026", hash_)
    assert not verificar_password("otra-clave", hash_)


# --------------------------------------------------------------------------- errores de negocio
@pytest.mark.parametrize(
    ("error", "codigo"),
    [(SolicitudInvalida, 400), (RecursoNoEncontrado, 404), (ConflictoDeEstado, 409), (ServicioNoDisponible, 503)],
)
def test_cada_error_de_negocio_tiene_su_codigo_http(error, codigo):
    assert error("x").status_code == codigo


# --------------------------------------------------------------------------- configuración (AWS)
def test_url_de_la_base_se_arma_desde_piezas_en_aws(monkeypatch):
    """En AWS no hay DATABASE_URL: se arma con el host de RDS y la contraseña (secreto de SSM)."""
    from shared_kernel.config import BaseServiceSettings

    for variable in ("DATABASE_URL",):
        monkeypatch.delenv(variable, raising=False)
    monkeypatch.setenv("DB_HOST", "talenterp-bd.abc.us-east-1.rds.amazonaws.com")
    monkeypatch.setenv("DB_PASSWORD", "cl@ve/rara#1")
    monkeypatch.setenv("JWT_SECRET", "x")
    monkeypatch.setenv("GATEWAY_SHARED_SECRET", "y")
    config = BaseServiceSettings(_env_file=None)
    assert config.database_url == (
        "postgresql+asyncpg://talenterp:cl%40ve%2Frara%231@talenterp-bd.abc.us-east-1.rds.amazonaws.com:5432/talenterp?ssl=require"
    )


def test_sin_url_ni_piezas_de_la_base_es_un_error_claro(monkeypatch):
    from shared_kernel.config import BaseServiceSettings

    for variable in ("DATABASE_URL", "DB_HOST", "DB_PASSWORD"):
        monkeypatch.delenv(variable, raising=False)
    monkeypatch.setenv("JWT_SECRET", "x")
    monkeypatch.setenv("GATEWAY_SHARED_SECRET", "y")
    with pytest.raises(ValueError, match="DATABASE_URL"):
        BaseServiceSettings(_env_file=None)
