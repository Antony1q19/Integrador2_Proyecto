"""Pruebas de las reglas de negocio de postulantes: documento de identidad, teléfono,
archivos (CV/DNI), consentimiento (Ley 29733) y listas del perfil.

Correr:  PYTHONPATH=.:../libs/shared python -m pytest tests -q   (desde servicio-postulantes/)
"""
import pytest

from app.domain.postulantes import (
    TAMANO_MAXIMO_BYTES,
    validar_archivo,
    validar_consentimiento_obligatorio,
    validar_documento,
    validar_lista_libre,
    validar_telefono,
)
from shared_kernel.exceptions import SolicitudInvalida

PDF = b"%PDF-1.7\n contenido"
PNG = b"\x89PNG\r\n\x1a\n contenido"


# --------------------------------------------------------------------------- documento de identidad
@pytest.mark.parametrize(("tipo", "numero"), [("DNI", "12345678"), ("CE", "AB1234567"), ("PASAPORTE", "X12345")])
def test_documentos_validos(tipo, numero):
    validar_documento(tipo, numero)


@pytest.mark.parametrize(
    ("tipo", "numero"),
    [("DNI", "1234567"), ("DNI", "1234567A"), ("CE", "1234"), ("PASAPORTE", "X1"), ("LICENCIA", "12345678")],
)
def test_documentos_invalidos(tipo, numero):
    with pytest.raises(SolicitudInvalida):
        validar_documento(tipo, numero)


# --------------------------------------------------------------------------- teléfono
@pytest.mark.parametrize("telefono", [None, "", "947757081", "+51 947 757 081", "(01) 555-1234"])
def test_telefonos_validos(telefono):
    validar_telefono(telefono)


@pytest.mark.parametrize("telefono", ["12345", "94775708a", "+51 9477 5708 1234 5678", "<script>"])
def test_telefonos_invalidos(telefono):
    with pytest.raises(SolicitudInvalida):
        validar_telefono(telefono)


# --------------------------------------------------------------------------- archivos
def test_archivo_valido():
    validar_archivo("CV", "application/pdf", PDF)
    validar_archivo("DNI", "image/png", PNG)


def test_archivo_que_miente_su_tipo_es_rechazado():
    """Un .exe renombrado a .pdf: el tipo declarado dice PDF pero el contenido no."""
    with pytest.raises(SolicitudInvalida, match="contenido"):
        validar_archivo("CV", "application/pdf", b"MZ\x90\x00 ejecutable")


@pytest.mark.parametrize(
    ("tipo_doc", "tipo", "contenido", "motivo"),
    [
        ("CV", "application/zip", PDF, "Formato"),
        ("FOTO", "application/pdf", PDF, "Tipo de documento"),
        ("CV", "application/pdf", b"", "vacío"),
        ("CV", "application/pdf", b"%PDF-" + b"0" * TAMANO_MAXIMO_BYTES, "5 MB"),
    ],
)
def test_archivos_rechazados(tipo_doc, tipo, contenido, motivo):
    with pytest.raises(SolicitudInvalida, match=motivo):
        validar_archivo(tipo_doc, tipo, contenido)


# --------------------------------------------------------------------------- consentimiento (Ley 29733)
def test_quien_se_registra_solo_debe_aceptar_el_tratamiento_de_datos():
    with pytest.raises(SolicitudInvalida):
        validar_consentimiento_obligatorio(False, "Postulante")
    validar_consentimiento_obligatorio(True, "Postulante")


def test_rrhh_puede_registrar_sin_el_consentimiento_del_postulante():
    validar_consentimiento_obligatorio(False, "RRHH")
    validar_consentimiento_obligatorio(False, "Admin")


# --------------------------------------------------------------------------- listas del perfil
def test_listas_del_perfil_acotadas():
    validar_lista_libre("Idiomas", [{"idioma": "Inglés", "nivel": "Intermedio"}])
    validar_lista_libre("Idiomas", None)
    with pytest.raises(SolicitudInvalida):
        validar_lista_libre("Idiomas", [{"idioma": "x"}] * 21)
    with pytest.raises(SolicitudInvalida):
        validar_lista_libre("Idiomas", ["no es un objeto"])
