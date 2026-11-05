"""Pruebas de Calidad de Software: Funcionalidad (ISO/IEC 25010) y V&V - Gateway y Seguridad.

Subcaracterísticas evaluadas:
  1. Completitud Funcional: Autenticación de usuarios internos del ERP, roles y multi-empresa.
  2. Corrección Funcional: Política de contraseñas robusta, claves temporales seguras sin ambigüedad tipográfica.
  3. Pertinencia Funcional: Rate limiting por IP (protección anti-fuerza bruta) con aislamiento de contadores.

Ejecutar:
    $env:PYTHONPATH="backend/gateway;backend/libs/shared"
    pytest tests/funcional/test_funcional_gateway.py -v
"""
import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://prueba:prueba@localhost:5432/prueba")
os.environ.setdefault("JWT_SECRET", "jwt-de-prueba")
os.environ.setdefault("GATEWAY_SHARED_SECRET", "hmac-de-prueba")
os.environ.setdefault("URL_SERVICIO_POSTULANTES", "http://servicio-postulantes:8001")

import pytest
from app.core.limite_peticiones import limitar_por_ip
from app.domain.usuarios import (
    LARGO_PASSWORD_TEMPORAL,
    generar_password_temporal,
    puede_ver_empresa,
    validar_estado,
    validar_rol_interno,
)
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from shared_kernel.exceptions import SolicitudInvalida
from shared_kernel.passwords import validar_politica_password


# ==============================================================================
# 1. VERIFICACIÓN: Política y Generación de Contraseñas
# ==============================================================================

class TestVerificacionPoliticaPasswords:
    """Verificación de criterios de robustez en credenciales según política del sistema."""

    @pytest.mark.parametrize("clave_segura", [
        "P@ssword2026",
        "Segura2026Aa",
        "Admin987654#",
        "TalentERP2026X",
    ])
    def test_passwords_que_cumplen_politica(self, clave_segura):
        es_valido, motivo = validar_politica_password(clave_segura)
        assert es_valido is True
        assert motivo is None

    @pytest.mark.parametrize("clave_debil,motivo_esperado", [
        ("Corta1", "al menos 8 caracteres"),
        ("todominusc1", "letra mayúscula"),
        ("TODOMAYUSC1", "letra minúscula"),
        ("SinNumeroMayus", "número"),
        ("Password123", "muy común"),
    ])
    def test_passwords_debiles_son_rechazadas(self, clave_debil, motivo_esperado):
        es_valido, motivo = validar_politica_password(clave_debil)
        assert es_valido is False
        assert motivo_esperado in motivo.lower()

    def test_password_no_puede_coincidir_con_email(self):
        es_valido, motivo = validar_politica_password("Carlos1234", email="carlos1234@empresa.pe")
        assert es_valido is False
        assert "correo" in motivo.lower()

    def test_generador_clave_temporal_robusta_y_sin_ambiguedad(self):
        """La clave temporal generada debe cumplir la política, tener 12 caracteres y sin '0O1lI'."""
        claves_generadas = {generar_password_temporal() for _ in range(100)}
        assert len(claves_generadas) == 100  # entropía: ninguna se repitió en 100 iteraciones

        for clave in claves_generadas:
            assert len(clave) == LARGO_PASSWORD_TEMPORAL
            cumple, _ = validar_politica_password(clave)
            assert cumple is True
            # Verificación de que no contiene caracteres propensos a confusión humana al dictar
            assert not set(clave) & set("0O1lI")


# ==============================================================================
# 2. VERIFICACIÓN: Roles Internos y Estados de Usuario
# ==============================================================================

class TestVerificacionRolesYEstadosERP:
    """Verificación de catálogo de roles de trabajadores y estados de cuenta."""

    @pytest.mark.parametrize("rol", ["Admin", "RRHH", "Supervisor"])
    def test_roles_internos_permitidos(self, rol):
        validar_rol_interno(rol)

    @pytest.mark.parametrize("rol_prohibido", ["Postulante", "root", "Invitado", "Manager", ""])
    def test_roles_no_autorizados_en_erp(self, rol_prohibido):
        with pytest.raises(SolicitudInvalida, match="Rol inválido"):
            validar_rol_interno(rol_prohibido)

    @pytest.mark.parametrize("estado", ["Activo", "Suspendido", "Eliminado"])
    def test_estados_de_cuenta_validos(self, estado):
        validar_estado(estado)

    @pytest.mark.parametrize("estado_invalido", ["Bloqueado", "Inactivo", "Pendiente", ""])
    def test_estados_de_cuenta_invalidos(self, estado_invalido):
        with pytest.raises(SolicitudInvalida, match="Estado inválido"):
            validar_estado(estado_invalido)


# ==============================================================================
# 3. VALIDACIÓN: Multi-Tenancy y Aislamiento por Empresa
# ==============================================================================

class TestValidacionMultiTenancyGateway:
    """Validación de reglas de acceso a información de empresas cliente."""

    def test_admin_tiene_acceso_a_cualquier_empresa(self):
        assert puede_ver_empresa("Admin", [], 1) is True
        assert puede_ver_empresa("Admin", [2, 3], 99) is True

    def test_rrhh_y_supervisor_solo_ven_empresas_asignadas(self):
        empresas_asignadas = [10, 25, 30]
        assert puede_ver_empresa("RRHH", empresas_asignadas, 10) is True
        assert puede_ver_empresa("Supervisor", empresas_asignadas, 25) is True

        assert puede_ver_empresa("RRHH", empresas_asignadas, 99) is False
        assert puede_ver_empresa("Supervisor", empresas_asignadas, 99) is False


# ==============================================================================
# 4. PERTINENCIA FUNCIONAL: Rate Limiting por IP (Anti-DDoS / Anti-Brute-Force)
# ==============================================================================

class TestPertinenciaRateLimiting:
    """Verificación del mecanismo de protección de límites de peticiones."""

    def _crear_app_con_rutas_limitadas(self) -> TestClient:
        app = FastAPI()

        @app.get("/login", dependencies=[Depends(limitar_por_ip(3))])
        def ruta_login():
            return {"status": "ok"}

        @app.get("/catalogo", dependencies=[Depends(limitar_por_ip(2))])
        def ruta_catalogo():
            return {"status": "ok"}

        return TestClient(app)

    def test_rate_limiting_responde_429_al_superar_umbral(self):
        cliente = self._crear_app_con_rutas_limitadas()

        # 3 peticiones exitosas permitidas
        for _ in range(3):
            r = cliente.get("/login")
            assert r.status_code == 200

        # La 4ta petición excede el umbral y recibe 429 Too Many Requests
        bloqueada = cliente.get("/login")
        assert bloqueada.status_code == 429
        assert bloqueada.headers["Retry-After"] == "60"

    def test_aislamiento_de_contadores_entre_endpoints(self):
        """Agotar el límite de una ruta no bloquea otras rutas del sistema."""
        cliente = self._crear_app_con_rutas_limitadas()

        # Agotar límite de /catalogo (2 permitidas)
        cliente.get("/catalogo")
        cliente.get("/catalogo")
        assert cliente.get("/catalogo").status_code == 429

        # La ruta /login mantiene su propio contador intacto
        assert cliente.get("/login").status_code == 200
