"""Pruebas de Calidad de Software: Funcionalidad (ISO/IEC 25010) y V&V - Postulantes.

Subcaracterísticas evaluadas:
  1. Completitud Funcional: Cobertura de perfiles de candidatos, documentos y consentimientos.
  2. Corrección Funcional: BVA en archivos (PDF/JPG/PNG), validación de Magic Bytes y formatos de identidad.
  3. Pertinencia Funcional: Ley N.º 29733 de Protección de Datos Personales, control de listas libres.

Ejecutar:
    $env:PYTHONPATH="backend/servicio-postulantes;backend/libs/shared"
    pytest tests/funcional/test_funcional_postulantes.py -v
"""
import pytest
from app.domain.postulantes import (
    TAMANO_MAXIMO_BYTES,
    TIPOS_DE_ARCHIVO_PERMITIDOS,
    TIPOS_DOCUMENTO,
    VERSION_TERMINOS,
    validar_archivo,
    validar_consentimiento_obligatorio,
    validar_documento,
    validar_lista_libre,
    validar_telefono,
)
from shared_kernel.exceptions import SolicitudInvalida

PDF_MAGIC = b"%PDF-1.7\r\n"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8\xff\xe0\x00\x10JFIF"


# ==============================================================================
# 1. VERIFICACIÓN: Análisis de Valores Límite (BVA) y Formatos de Archivos
# ==============================================================================

class TestVerificacionArchivosBVA:
    """Verificación de límites de tamaño y firmas binarias para CV y documentos adjuntos."""

    def test_bva_limite_exacto_5mb(self):
        """BVA Límite Superior Válido: Archivo de exactamente 5,242,880 bytes."""
        contenido = PDF_MAGIC + b"A" * (TAMANO_MAXIMO_BYTES - len(PDF_MAGIC))
        assert len(contenido) == TAMANO_MAXIMO_BYTES
        validar_archivo("CV", "application/pdf", contenido)

    def test_bva_limite_excedido_por_un_byte(self):
        """BVA Límite Superior Inválido: Archivo de 5,242,881 bytes (5 MB + 1 B)."""
        contenido = PDF_MAGIC + b"A" * (TAMANO_MAXIMO_BYTES - len(PDF_MAGIC) + 1)
        assert len(contenido) == TAMANO_MAXIMO_BYTES + 1
        with pytest.raises(SolicitudInvalida, match="5 MB"):
            validar_archivo("CV", "application/pdf", contenido)

    def test_bva_limite_inferior_vacio_0_bytes(self):
        """BVA Límite Inferior Inválido: Archivo vacío de 0 bytes."""
        with pytest.raises(SolicitudInvalida, match="vacío"):
            validar_archivo("CV", "application/pdf", b"")

    def test_bva_limite_minimo_valido(self):
        """BVA Límite Inferior Válido: Archivo con la longitud exacta de la cabecera mágica."""
        validar_archivo("CV", "application/pdf", PDF_MAGIC)
        validar_archivo("DNI", "image/png", PNG_MAGIC)
        validar_archivo("CERTIFICADO", "image/jpeg", JPEG_MAGIC)

    @pytest.mark.parametrize("tipo_invalido", ["application/zip", "text/plain", "application/msword"])
    def test_formato_no_permitido(self, tipo_invalido):
        """Partición de Equivalencia: Tipos MIME no autorizados deben ser rechazados."""
        with pytest.raises(SolicitudInvalida, match="Formato no permitido"):
            validar_archivo("CV", tipo_invalido, PDF_MAGIC)

    @pytest.mark.parametrize("tipo_doc_invalido", ["PASAPORTE_SCAN", "FOTO_PERFIL", "CONTRATO"])
    def test_tipo_documento_invalido(self, tipo_doc_invalido):
        """Partición de Equivalencia: Tipos de documento no catalogados en el dominio."""
        with pytest.raises(SolicitudInvalida, match="Tipo de documento inválido"):
            validar_archivo(tipo_doc_invalido, "application/pdf", PDF_MAGIC)


class TestVerificacionMagicBytesSeguridad:
    """Verificación de seguridad contra ataques de suplantación de extensiones (MIME spoofing)."""

    def test_ejecutable_camuflado_como_pdf_es_bloqueado(self):
        """Un binario MZ PE de Windows con extensión o Content-Type PDF debe ser rechazado."""
        ejecutable = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00malicious_payload"
        with pytest.raises(SolicitudInvalida, match="contenido"):
            validar_archivo("CV", "application/pdf", ejecutable)

    def test_script_html_camuflado_como_imagen_png(self):
        """Un script HTML/JS con Content-Type image/png debe ser rechazado."""
        script_xss = b"<script>alert('XSS')</script>"
        with pytest.raises(SolicitudInvalida, match="contenido"):
            validar_archivo("DNI", "image/png", script_xss)

    def test_jpeg_valido_coincide_con_firma_binaria(self):
        """Un archivo JPEG con firma JFIF estándar debe procesarse correctamente."""
        contenido = JPEG_MAGIC + b"\x00" * 100
        validar_archivo("CERTIFICADO", "image/jpeg", contenido)


# ==============================================================================
# 2. VERIFICACIÓN: Formatos de Identidad y Contacto
# ==============================================================================

class TestVerificacionFormatosIdentidadYContacto:
    """Verificación de reglas de documentos nacionales e internacionales y teléfonos."""

    @pytest.mark.parametrize("dni_valido", ["00000001", "12345678", "76543210"])
    def test_dni_valido_exactamente_8_digitos(self, dni_valido):
        validar_documento("DNI", dni_valido)

    @pytest.mark.parametrize("dni_invalido", ["1234567", "123456789", "1234567A", "ABCDEFGH", ""])
    def test_dni_invalido_longitud_o_caracteres(self, dni_invalido):
        with pytest.raises(SolicitudInvalida):
            validar_documento("DNI", dni_invalido)

    @pytest.mark.parametrize("ce_valido", ["12345678", "ABC123456", "A1B2C3D4E5F6"])
    def test_carne_extranjeria_valido(self, ce_valido):
        validar_documento("CE", ce_valido)

    @pytest.mark.parametrize("ce_invalido", ["1234567", "A" * 13, "CE-1234#"])
    def test_carne_extranjeria_invalido(self, ce_invalido):
        with pytest.raises(SolicitudInvalida):
            validar_documento("CE", ce_invalido)

    @pytest.mark.parametrize("pasaporte_valido", ["PA1234", "12345678", "PASAPORTE12"])
    def test_pasaporte_valido(self, pasaporte_valido):
        validar_documento("PASAPORTE", pasaporte_valido)

    @pytest.mark.parametrize("pasaporte_invalido", ["P1234", "A" * 13, "PASS 123!"])
    def test_pasaporte_invalido(self, pasaporte_invalido):
        with pytest.raises(SolicitudInvalida):
            validar_documento("PASAPORTE", pasaporte_invalido)

    @pytest.mark.parametrize("tel_valido", [None, "", "987654321", "+51 987 654 321", "(01) 445-6789"])
    def test_telefono_valido(self, tel_valido):
        validar_telefono(tel_valido)

    @pytest.mark.parametrize("tel_invalido", ["12345", "9876543210123456", "98765432A", "<script>"])
    def test_telefono_invalido(self, tel_invalido):
        with pytest.raises(SolicitudInvalida):
            validar_telefono(tel_invalido)


# ==============================================================================
# 3. VALIDACIÓN: Cumplimiento Normativo (Ley N.º 29733) y Reglas de Negocio
# ==============================================================================

class TestValidacionConsentimientoLegal:
    """Validación del marco normativo peruano de protección de datos personales."""

    def test_version_vigente_de_terminos_establecida(self):
        """El sistema debe referenciar la versión oficial vigente de términos legales."""
        assert VERSION_TERMINOS == "2026-01"

    def test_postulante_autorregistrado_debe_aceptar_tratamiento(self):
        """Un postulante que crea su cuenta libremente debe otorgar consentimiento explícito."""
        with pytest.raises(SolicitudInvalida, match="tratamiento de datos"):
            validar_consentimiento_obligatorio(False, "Postulante")

        # Consentimiento aceptado satisface la regla
        validar_consentimiento_obligatorio(True, "Postulante")

    @pytest.mark.parametrize("rol_administrativo", ["Admin", "RRHH"])
    def test_personal_rrhh_puede_registrar_sin_consentimiento_previo(self, rol_administrativo):
        """El personal de selección puede cargar postulantes recibidos por ferias o canales presenciales."""
        validar_consentimiento_obligatorio(False, rol_administrativo)


# ==============================================================================
# 4. PERTINENCIA FUNCIONAL: Protección de Payloads en Listas Libres
# ==============================================================================

class TestPertinenciaListasLibresPerfil:
    """Protección contra saturación de almacenamiento en campos JSON estructurados del perfil."""

    def test_lista_libre_dentro_del_limite(self):
        idiomas = [
            {"idioma": "Español", "nivel": "Nativo"},
            {"idioma": "Inglés", "nivel": "Avanzado C1"},
        ]
        validar_lista_libre("Idiomas", idiomas)

    def test_lista_libre_excede_maximo_20_elementos(self):
        """No debe permitirse saturar el perfil con más de 20 entradas."""
        muchos_idiomas = [{"idioma": f"Idioma_{i}", "nivel": "Básico"} for i in range(21)]
        with pytest.raises(SolicitudInvalida, match="máximo 20"):
            validar_lista_libre("Idiomas", muchos_idiomas)

    def test_lista_libre_con_objeto_no_valido(self):
        """Cada elemento debe ser un objeto/diccionario estructurado."""
        with pytest.raises(SolicitudInvalida, match="objeto"):
            validar_lista_libre("Experiencia", ["no-es-diccionario"])
