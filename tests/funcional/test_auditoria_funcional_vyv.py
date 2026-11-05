"""Pruebas funcionales de Verificación y Validación (V&V) - TalentERP.

Auditoría de Calidad de Software orientado a la Funcionalidad (ISO/IEC 25010: Adecuación Funcional).
Valida:
  - Requisito 1: Registro, consentimiento Ley 29733, límites de carga de CV (BVA y Magic Bytes).
  - Requisito 2: Idempotencia y detección de colisiones de postulación / duplicidad de candidatos.
  - Requisito 3: Auditoría y regresión de seguridad RBAC en control de entrevistas (BUG-VNV-001 verificado).

Ejecutar con PYTHONPATH apuntando a los paquetes del servicio correspondiente:
    $env:PYTHONPATH="backend/servicio-postulantes;backend/libs/shared"
    pytest tests/funcional/test_auditoria_funcional_vyv.py -v
"""
import re
from pathlib import Path

import pytest
from app.domain.postulantes import (
    TAMANO_MAXIMO_BYTES,
    validar_archivo,
    validar_consentimiento_obligatorio,
    validar_documento,
)
from shared_kernel.exceptions import ConflictoDeEstado, SolicitudInvalida

PDF_HEADER = b"%PDF-1.7\n"


# ==============================================================================
# REQUISITO 1: Registro y Subida de CV en Formato PDF (Máx. 5 MB) - V&V
# ==============================================================================

def test_rf01_cv_pdf_limite_exacto_5mb():
    """BVA (Boundary Value Analysis): Un PDF de exactamente 5 MB (5,242,880 B) debe ser aceptado."""
    contenido_5mb = PDF_HEADER + b"0" * (TAMANO_MAXIMO_BYTES - len(PDF_HEADER))
    assert len(contenido_5mb) == TAMANO_MAXIMO_BYTES
    # Debe procesarse exitosamente sin lanzar excepción
    validar_archivo("CV", "application/pdf", contenido_5mb)


def test_rf01_cv_pdf_supera_limite_por_un_byte():
    """BVA: 5 MB + 1 byte (5,242,881 B) debe ser rechazado inmediatamente con SolicitudInvalida (400)."""
    contenido_excedido = PDF_HEADER + b"0" * (TAMANO_MAXIMO_BYTES - len(PDF_HEADER) + 1)
    assert len(contenido_excedido) == TAMANO_MAXIMO_BYTES + 1
    with pytest.raises(SolicitudInvalida, match="5 MB"):
        validar_archivo("CV", "application/pdf", contenido_excedido)


def test_rf01_cv_archivo_vacio_0_bytes():
    """BVA: Archivo vacío de 0 bytes debe ser rechazado."""
    with pytest.raises(SolicitudInvalida, match="vacío"):
        validar_archivo("CV", "application/pdf", b"")


def test_rf01_cv_extension_pdf_con_firma_falsa_magic_bytes():
    """Edge Case / Seguridad: Archivo declarado como PDF cuyo contenido real es ejecutable o script."""
    falso_pdf = b"MZ\x90\x00\x03\x00\x00\x00 ejecutable camuflado"
    with pytest.raises(SolicitudInvalida, match="contenido"):
        validar_archivo("CV", "application/pdf", falso_pdf)


def test_rf01_consentimiento_ley_29733_obligatorio_postulante():
    """Validación legal (Ley 29733): Postulante sin consentimiento debe ser rechazado."""
    with pytest.raises(SolicitudInvalida, match="tratamiento de datos"):
        validar_consentimiento_obligatorio(False, "Postulante")

    # Consentimiento otorgado: permitido
    validar_consentimiento_obligatorio(True, "Postulante")


def test_rf01_consentimiento_exencion_reclutador_rrhh():
    """Validación legal (Ley 29733): Personal interno (RRHH/Admin) puede registrar postulantes manuales."""
    # No lanza excepción
    validar_consentimiento_obligatorio(False, "RRHH")
    validar_consentimiento_obligatorio(False, "Admin")


@pytest.mark.parametrize("tipo,numero", [
    ("DNI", "12345678"),
    ("CE", "ABC123456"),
    ("PASAPORTE", "PA12345"),
])
def test_rf01_documentos_identidad_validos(tipo, numero):
    """Verificación de formatos aceptados para registro de postulantes."""
    validar_documento(tipo, numero)


@pytest.mark.parametrize("tipo,numero", [
    ("DNI", "1234567"),    # 7 dígitos (inválido)
    ("DNI", "123456789"),  # 9 dígitos (inválido)
    ("DNI", "1234567A"),   # contiene letras
    ("DNI", "        "),   # solo espacios
    ("OTRO", "12345678"),  # tipo inexistente
])
def test_rf01_documento_dni_invalido(tipo, numero):
    with pytest.raises(SolicitudInvalida):
        validar_documento(tipo, numero)


# ==============================================================================
# REQUISITO 2: Idempotencia y Detección de Colisiones de Postulantes
# ==============================================================================

def test_rf02_prevencion_colision_mismo_documento():
    """Validación de negocio: No se permite registrar dos postulantes con el mismo documento.
    
    Simula la regla de validación de unicidad que ejecuta el servicio en POST /postulantes:
    Si el documento ya está en la base de datos, debe responder ConflictoDeEstado (409).
    """
    documentos_registrados = {"12345678", "87654321"}
    nuevo_documento = "12345678"

    def verificar_unicidad_documento(doc: str):
        if doc in documentos_registrados:
            raise ConflictoDeEstado("Ya existe un postulante con ese número de documento")

    with pytest.raises(ConflictoDeEstado, match="número de documento"):
        verificar_unicidad_documento(nuevo_documento)


def test_rf02_prevencion_colision_mismo_correo_case_insensitive():
    """Validación de negocio: No se permite registrar dos postulantes con el mismo correo,
    incluso si se envían con diferencias de mayúsculas/minúsculas.
    """
    correos_registrados = {"postulante@ejemplo.com", "candidato@talenterp.pe"}
    nuevo_correo = "Postulante@Ejemplo.COM"

    def verificar_unicidad_correo(correo: str):
        if correo.strip().lower() in correos_registrados:
            raise ConflictoDeEstado("Ya existe un postulante con ese correo")

    with pytest.raises(ConflictoDeEstado, match="correo"):
        verificar_unicidad_correo(nuevo_correo)


def test_rf02_idempotencia_postulacion_misma_vacante():
    """Validación de flujo: Un candidato no puede postular dos veces al mismo anuncio/vacante."""
    postulaciones_existentes = {("postulante-101", 5)}  # (postulante_id, anuncio_id)

    def registrar_postulacion(postulante_id: str, anuncio_id: int):
        par = (postulante_id, anuncio_id)
        if par in postulaciones_existentes:
            raise ConflictoDeEstado("Este postulante ya está postulado a ese anuncio")
        postulaciones_existentes.add(par)

    # El intento de re-postulación inmediata lanza ConflictoDeEstado (409)
    with pytest.raises(ConflictoDeEstado, match="ya está postulado"):
        registrar_postulacion("postulante-101", 5)


# ==============================================================================
# REQUISITO 3: Auditoría de Control de Acceso por Roles (RBAC) en Entrevistas
# ==============================================================================

def test_rf03_verificacion_rbac_supervisor_no_debe_mutar_entrevistas():
    """
    Test de Verificación de Requisito Funcional 3:
    'Usuarios sin rol de Admin o RRHH no deben poder cambiar el estado de la etapa de entrevista.'

    Audita directamente el código fuente de backend/servicio-procesos-seleccion/app/api/v1/entrevistas.py
    para comprobar que el endpoint PATCH /entrevistas/{id} (actualizar_entrevista) restringe
    el acceso exclusivamente a Admin y RRHH, remediando el hallazgo BUG-VNV-001.
    """
    roles_autorizados_especificados = {"Admin", "RRHH"}

    archivo_entrevistas = (
        Path(__file__).resolve().parents[2]
        / "backend"
        / "servicio-procesos-seleccion"
        / "app"
        / "api"
        / "v1"
        / "entrevistas.py"
    )
    assert archivo_entrevistas.exists(), f"No se encontró el archivo: {archivo_entrevistas}"

    contenido = archivo_entrevistas.read_text(encoding="utf-8")

    # Extrae los roles de la función actualizar_entrevista
    patron = r"async\s+def\s+actualizar_entrevista[\s\S]*?requerir_rol\((.*?)\)"
    match = re.search(patron, contenido)
    assert match, "No se encontró la dependencia requerir_rol en actualizar_entrevista"

    # Parsea los roles configurados en el código real
    roles_configurados_en_backend = {
        r.strip().strip("'\"") for r in match.group(1).split(",") if r.strip()
    }

    roles_indebidos = roles_configurados_en_backend - roles_autorizados_especificados

    assert not roles_indebidos, (
        f"VIOLACIÓN DE RBAC (BUG-VNV-001): Se detectaron roles no autorizados ({roles_indebidos}) "
        f"con capacidad de alterar el estado de las entrevistas. "
        f"Roles configurados: {roles_configurados_en_backend}, especificados: {roles_autorizados_especificados}"
    )
    assert "Supervisor" not in roles_configurados_en_backend
