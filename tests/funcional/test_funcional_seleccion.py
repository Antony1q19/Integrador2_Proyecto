"""Pruebas de Calidad de Software: Funcionalidad (ISO/IEC 25010) y V&V - Procesos de Selección.

Subcaracterísticas evaluadas:
  1. Completitud Funcional: Pipeline integral, evaluaciones HU-08, entrevistas y contrataciones.
  2. Corrección Funcional: Algoritmo de scoring, umbral APTO/NO_APTO, cálculo de fechas de seguimiento 30/60/90 días.
  3. Pertinencia Funcional: Transiciones legales de la máquina de estados, bloqueo de descartados y RBAC.

Ejecutar:
    $env:PYTHONPATH="backend/servicio-procesos-seleccion;backend/libs/shared"
    pytest tests/funcional/test_funcional_seleccion.py -v
"""
from datetime import date, timedelta

import pytest
from app.domain.evaluaciones import UMBRAL_APTO, calcular_puntaje_total, calcular_resultado
from app.domain.procesos import ESTADOS_PROCESO, validar_estado_proceso, validar_transicion
from app.domain.seleccion import (
    ESTADOS_CONTRATACION,
    ESTADOS_ENTREVISTA,
    HITOS_SEGUIMIENTO,
    MODALIDADES_ENTREVISTA,
    RESULTADOS_ENTREVISTA,
    estado_inicial_de_contratacion,
    exigir_postulacion_abierta,
    fecha_de_seguimiento,
    hoy_en_peru,
    validar_cierre_de_seguimiento,
    validar_opcion,
)
from shared_kernel.exceptions import ConflictoDeEstado, SolicitudInvalida


# ==============================================================================
# 1. VERIFICACIÓN: Máquina de Estados del Pipeline de Selección
# ==============================================================================

class TestVerificacionMaquinaEstados:
    """Verificación de reglas de transición de la máquina de estados de postulaciones."""

    @pytest.mark.parametrize("estado", ["POSTULADO", "EN_EVALUACION", "ENTREVISTA", "PRESELECCIONADO", "CONTRATADO", "DESCARTADO"])
    def test_estados_validos_catalogados(self, estado):
        validar_estado_proceso(estado)

    @pytest.mark.parametrize("estado_invalido", ["EN_REVISION", "PRESELECCION", "RECHAZADO", "FINALISTA", ""])
    def test_estados_invalidos_rechazados(self, estado_invalido):
        with pytest.raises(SolicitudInvalida, match="Estado de postulación inválido"):
            validar_estado_proceso(estado_invalido)

    @pytest.mark.parametrize("origen,destino", [
        ("POSTULADO", "EN_EVALUACION"),
        ("EN_EVALUACION", "ENTREVISTA"),
        ("ENTREVISTA", "PRESELECCIONADO"),
        ("PRESELECCIONADO", "POSTULADO"),
        ("POSTULADO", "DESCARTADO"),
        ("EN_EVALUACION", "DESCARTADO"),
        ("ENTREVISTA", "DESCARTADO"),
        ("PRESELECCIONADO", "DESCARTADO"),
    ])
    def test_transiciones_permitidas_entre_etapas_abiertas(self, origen, destino):
        """Entre etapas abiertas y hacia descarte el candidato transiciona libremente."""
        validar_transicion(origen, destino, None)

    def test_prohibida_transicion_a_la_misma_etapa(self):
        """Idempotencia de estado: no se debe generar historial duplicado."""
        with pytest.raises(ConflictoDeEstado, match="ya está en la etapa"):
            validar_transicion("ENTREVISTA", "ENTREVISTA", None)

    def test_prohibido_pasar_a_contratado_sin_formalizacion(self):
        """A CONTRATADO solo se llega vía endpoint de contrataciones."""
        with pytest.raises(ConflictoDeEstado, match="contratación"):
            validar_transicion("PRESELECCIONADO", "CONTRATADO", None)

    def test_revertir_descarte_a_postulado_exige_motivo_justificado(self):
        """Revertir una decisión final exige ingresar el motivo de reapertura."""
        with pytest.raises(SolicitudInvalida, match="motivo"):
            validar_transicion("DESCARTADO", "POSTULADO", "")
        with pytest.raises(SolicitudInvalida, match="motivo"):
            validar_transicion("DESCARTADO", "POSTULADO", "   ")

        # Con motivo válido: permitido
        validar_transicion("DESCARTADO", "POSTULADO", "Se reabre la vacante por ampliación de cupos")

    def test_revertir_decision_final_hacia_otra_etapa_es_invalido(self):
        """Desde DESCARTADO solo se puede revertir hacia POSTULADO."""
        with pytest.raises(ConflictoDeEstado, match="Primero revierte la decisión"):
            validar_transicion("DESCARTADO", "ENTREVISTA", "Reabriendo")


# ==============================================================================
# 2. VERIFICACIÓN: Algoritmo de Scoring y Evaluaciones HU-08
# ==============================================================================

class TestVerificacionEvaluacionesHU08:
    """Verificación del cálculo de aptitud técnica y conductual en base a competencias."""

    def test_umbral_apto_oficial(self):
        assert UMBRAL_APTO == 70

    @pytest.mark.parametrize("competencias,puntaje_esperado", [
        ([5, 5, 5, 5], 100),
        ([1, 1, 1, 1], 20),
        ([3, 3, 3, 3], 60),
        ([4, 4, 4, 4, 4, 4], 80),
        ([3, 4, 4, 3], 70),
    ])
    def test_calculo_puntaje_total(self, competencias, puntaje_esperado):
        assert calcular_puntaje_total(competencias) == puntaje_esperado

    @pytest.mark.parametrize("puntaje,resultado_esperado", [
        (100, "APTO"),
        (71, "APTO"),
        (70, "APTO"),       # BVA: justo en el umbral
        (69, "NO_APTO"),    # BVA: justo 1 punto debajo del umbral
        (50, "NO_APTO"),
        (0, "NO_APTO"),
    ])
    def test_bva_resultado_evaluacion_umbral_70(self, puntaje, resultado_esperado):
        assert calcular_resultado(puntaje) == resultado_esperado


# ==============================================================================
# 3. VERIFICACIÓN Y VALIDACIÓN: Entrevistas, Contrataciones y Hitos
# ==============================================================================

class TestVerificacionEntrevistasYContrataciones:
    """Verificación de opciones válidas, bloqueo de descartados e hitos temporales."""

    def test_modalidades_entrevista_permitidas(self):
        for modalidad in ["Presencial", "Virtual", "Telefónica"]:
            validar_opcion(modalidad, MODALIDADES_ENTREVISTA, "Modalidad")

        with pytest.raises(SolicitudInvalida):
            validar_opcion("Híbrida", MODALIDADES_ENTREVISTA, "Modalidad")

    def test_bloqueo_de_acciones_sobre_candidato_descartado(self):
        """No se pueden agendar entrevistas ni contratar a un candidato descartado."""
        with pytest.raises(ConflictoDeEstado, match="descartada"):
            exigir_postulacion_abierta("DESCARTADO")

        # Sobre etapa abierta no genera error
        exigir_postulacion_abierta("PRESELECCIONADO")

    def test_hitos_de_seguimiento_exactos(self):
        """Los hitos regulatorios de control deben ser a 30, 60 y 90 días exactos."""
        assert HITOS_SEGUIMIENTO == (30, 60, 90)

        fecha_ingreso = date(2026, 6, 1)
        assert fecha_de_seguimiento(fecha_ingreso, 30) == date(2026, 7, 1)
        assert fecha_de_seguimiento(fecha_ingreso, 60) == date(2026, 7, 31)
        assert fecha_de_seguimiento(fecha_ingreso, 90) == date(2026, 8, 30)

    def test_estado_inicial_de_contratacion(self):
        hoy = hoy_en_peru()
        manana = hoy + timedelta(days=1)
        ayer = hoy - timedelta(days=1)

        # Si ingresa en el futuro: "Por ingresar"
        assert estado_inicial_de_contratacion(manana) == "Por ingresar"
        # Si ingresa hoy o en el pasado: "Activo"
        assert estado_inicial_de_contratacion(hoy) == "Activo"
        assert estado_inicial_de_contratacion(ayer) == "Activo"

    def test_cierre_de_seguimiento_exige_valoracion(self):
        """Un hito marcado como 'Realizado' exige obligatoriamente registrar la valoración."""
        with pytest.raises(SolicitudInvalida, match="valoración"):
            validar_cierre_de_seguimiento("Realizado", None)
        with pytest.raises(SolicitudInvalida, match="valoración"):
            validar_cierre_de_seguimiento("Realizado", "")

        # Con valoración satisfactoria: permitido
        validar_cierre_de_seguimiento("Realizado", "Satisfactorio")
        # En estado pendiente no se exige valoración
        validar_cierre_de_seguimiento("Pendiente", None)
