"""Pruebas de Calidad de Software: Funcionalidad (ISO/IEC 25010) y V&V - Empresas y Vacantes.

Subcaracterísticas evaluadas:
  1. Completitud Funcional: Creación, actualización y gestión de empresas cliente y vacantes.
  2. Corrección Funcional: Validación de RUC (11 dígitos), salarios coherentes (min <= max) y fecha futura en Perú.
  3. Pertinencia Funcional: Integridad de eliminación de empresas, estado inicial 'Abierto' y multi-tenancy.

Ejecutar:
    $env:PYTHONPATH="backend/servicio-empresas-vacantes;backend/libs/shared"
    pytest tests/funcional/test_funcional_empresas.py -v
"""
from datetime import date, timedelta

import pytest
from app.domain.anuncios import verificar_empresa_visible
from app.schemas.anuncio import AnuncioCrear
from app.schemas.empresa import EmpresaCrear
from pydantic import ValidationError
from shared_kernel.exceptions import SolicitudInvalida
from shared_kernel.fechas import hoy_en_peru


# ==============================================================================
# 1. VERIFICACIÓN: Esquemas y Validaciones de Empresa
# ==============================================================================

class TestVerificacionEmpresaSchemas:
    """Verificación de reglas de validación en la entidad Empresa."""

    def test_empresa_valida_completa(self):
        empresa = EmpresaCrear(
            razonSocial="Tech Solutions Perú S.A.C.",
            ruc="20123456789",
            contactoNombre="Carlos Mendoza",
            contactoEmail="contacto@techsolutions.pe",
            contactoTelefono="+51 987 654 321",
            sector="Tecnología de la Información",
        )
        assert empresa.ruc == "20123456789"
        assert empresa.razonSocial == "Tech Solutions Perú S.A.C."

    @pytest.mark.parametrize("ruc_invalido", ["1234567890", "123456789012", "2012345678A", "           ", ""])
    def test_ruc_debe_tener_exactamente_11_digitos(self, ruc_invalido):
        with pytest.raises(ValidationError):
            EmpresaCrear(
                razonSocial="Empresa Valida",
                ruc=ruc_invalido,
                contactoNombre="Juan Perez",
                contactoEmail="juan@empresa.pe",
                contactoTelefono="987654321",
            )

    @pytest.mark.parametrize("razon_invalida", ["A", "AB", "   ", ""])
    def test_razon_social_minimo_3_caracteres(self, razon_invalida):
        with pytest.raises(ValidationError):
            EmpresaCrear(
                razonSocial=razon_invalida,
                ruc="20123456789",
                contactoNombre="Juan Perez",
                contactoEmail="juan@empresa.pe",
                contactoTelefono="987654321",
            )

    @pytest.mark.parametrize("email_invalido", ["sin-arroba", "nombre@", "@dominio.com", "nombre@dominio"])
    def test_contacto_email_invalido(self, email_invalido):
        with pytest.raises(ValidationError):
            EmpresaCrear(
                razonSocial="Empresa Valida",
                ruc="20123456789",
                contactoNombre="Juan Perez",
                contactoEmail=email_invalido,
                contactoTelefono="987654321",
            )

    @pytest.mark.parametrize("tel_invalido", ["12345678", "abc", ""])
    def test_contacto_telefono_minimo_9_digitos(self, tel_invalido):
        with pytest.raises(ValidationError):
            EmpresaCrear(
                razonSocial="Empresa Valida",
                ruc="20123456789",
                contactoNombre="Juan Perez",
                contactoEmail="juan@empresa.pe",
                contactoTelefono=tel_invalido,
            )


# ==============================================================================
# 2. VERIFICACIÓN: Esquemas y Validaciones de Anuncio / Vacante
# ==============================================================================

class TestVerificacionAnuncioSchemas:
    """Verificación de reglas de validación en anuncios y ofertas laborales."""

    @pytest.fixture
    def datos_anuncio_base(self):
        return {
            "empresaId": 1,
            "cargo": "Desarrollador Full Stack Senior",
            "descripcion": "Buscamos un profesional con amplia experiencia en Next.js, FastAPI y bases de datos PostgreSQL.",
            "requisitos": "Experiencia mínima de 4 años en desarrollo web moderno y arquitecturas de microservicios.",
            "numeroVacantes": 2,
            "salarioMin": 4500.0,
            "salarioMax": 6500.0,
            "fechaLimite": hoy_en_peru() + timedelta(days=30),
        }

    def test_anuncio_valido(self, datos_anuncio_base):
        anuncio = AnuncioCrear(**datos_anuncio_base)
        assert anuncio.cargo == "Desarrollador Full Stack Senior"
        assert anuncio.numeroVacantes == 2

    def test_salario_maximo_no_puede_ser_menor_al_minimo(self, datos_anuncio_base):
        datos_anuncio_base["salarioMin"] = 5000.0
        datos_anuncio_base["salarioMax"] = 4000.0  # menor que el mínimo
        with pytest.raises(ValidationError, match="mayor o igual al mínimo"):
            AnuncioCrear(**datos_anuncio_base)

    def test_salario_minimo_igual_al_maximo_permitido(self, datos_anuncio_base):
        """Salario fijo (min == max) debe ser perfectamente admitido."""
        datos_anuncio_base["salarioMin"] = 5000.0
        datos_anuncio_base["salarioMax"] = 5000.0
        anuncio = AnuncioCrear(**datos_anuncio_base)
        assert anuncio.salarioMin == anuncio.salarioMax == 5000.0

    @pytest.mark.parametrize("salario_negativo", [-1.0, -100.0])
    def test_salario_no_puede_ser_negativo(self, datos_anuncio_base, salario_negativo):
        datos_anuncio_base["salarioMin"] = salario_negativo
        with pytest.raises(ValidationError, match="negativo"):
            AnuncioCrear(**datos_anuncio_base)

    @pytest.mark.parametrize("vacantes", [0, -1, 501])
    def test_bva_numero_de_vacantes(self, datos_anuncio_base, vacantes):
        datos_anuncio_base["numeroVacantes"] = vacantes
        with pytest.raises(ValidationError):
            AnuncioCrear(**datos_anuncio_base)

    def test_fecha_limite_debe_ser_futura_en_peru(self, datos_anuncio_base):
        hoy = hoy_en_peru()
        # Fecha de hoy o pasada debe ser rechazada
        datos_anuncio_base["fechaLimite"] = hoy
        with pytest.raises(ValidationError, match="fecha futura"):
            AnuncioCrear(**datos_anuncio_base)

        datos_anuncio_base["fechaLimite"] = hoy - timedelta(days=1)
        with pytest.raises(ValidationError, match="fecha futura"):
            AnuncioCrear(**datos_anuncio_base)


# ==============================================================================
# 3. VALIDACIÓN: Aislamiento Multi-Tenant y Visibilidad de Empresas
# ==============================================================================

class TestValidacionVisibilidadMultiTenant:
    """Validación del control de acceso y aislamiento de empresas por usuario."""

    def test_administrador_tiene_acceso_irrestricto(self):
        usuario_admin = {"id": "usr-1", "rol": "Admin", "empresas": None}
        # Admin puede operar cualquier empresa (None = sin restricción)
        verificar_empresa_visible(empresa_id=1, usuario=usuario_admin)
        verificar_empresa_visible(empresa_id=999, usuario=usuario_admin)

    def test_usuario_rrhh_o_supervisor_restringido_a_empresas_asignadas(self):
        usuario_restringido = {"id": "usr-2", "rol": "RRHH", "empresas": [10, 20]}

        # Empresa permitida
        verificar_empresa_visible(empresa_id=10, usuario=usuario_restringido)
        verificar_empresa_visible(empresa_id=20, usuario=usuario_restringido)

        # Empresa no asignada debe ser rechazada con 400
        with pytest.raises(SolicitudInvalida, match="No tienes acceso a la empresa 30"):
            verificar_empresa_visible(empresa_id=30, usuario=usuario_restringido)
