"""Pruebas de Validación de Negocio y Flujos Funcionales (V&V) - TalentERP.

Validación orientada a responder: "¿Estamos construyendo el producto correcto para el negocio?"
Valida:
  - Flujo integral de ciclo de vida de selección (Postulación → Evaluación HU-08 → Entrevista → Contratación → Seguimiento 30/60/90 días).
  - Reglas de integridad referencial y de negocio en procesos de selección.
  - Idempotencia en la máquina de estados y control de reversiones con auditoría obligatoria.

Ejecutar:
    $env:PYTHONPATH="backend/servicio-procesos-seleccion;backend/libs/shared"
    pytest tests/funcional/test_validacion_negocio_flujos.py -v
"""
from datetime import date, timedelta

import pytest
from app.domain.evaluaciones import calcular_puntaje_total, calcular_resultado
from app.domain.procesos import validar_transicion
from app.domain.seleccion import (
    HITOS_SEGUIMIENTO,
    MODALIDADES_ENTREVISTA,
    estado_inicial_de_contratacion,
    exigir_postulacion_abierta,
    fecha_de_seguimiento,
    validar_cierre_de_seguimiento,
    validar_opcion,
)
from shared_kernel.exceptions import ConflictoDeEstado, SolicitudInvalida


# ==============================================================================
# VALIDACIÓN DE FLUJO END-TO-END: CICLO DE VIDA DE SELECCIÓN Y CONTRATACIÓN
# ==============================================================================

class TestValidacionFlujoCicloDeVidaSeleccion:
    """Valida el recorrido operativo completo de un candidato a través de TalentERP."""

    def test_flujo_completo_postulante_exitoso_hasta_seguimiento(self):
        """Escenario: Candidato postula, es evaluado como APTO, rinde entrevista, es contratado
        y cumple sus revisiones periódicas a 30, 60 y 90 días.
        """
        # 1. Postulación inicial en etapa POSTULADO
        estado_postulacion = "POSTULADO"
        exigir_postulacion_abierta(estado_postulacion)

        # 2. Paso a evaluación de competencias (HU-08)
        validar_transicion(estado_postulacion, "EN_EVALUACION", None)
        estado_postulacion = "EN_EVALUACION"

        # Simulación de notas de evaluación (escala 1 a 5) en 5 competencias clave:
        # Liderazgo=4, Trabajo en equipo=5, Comunicación=4, Resolución de problemas=4, Proactividad=5
        notas_competencias = [4, 5, 4, 4, 5]
        puntaje = calcular_puntaje_total(notas_competencias)
        resultado = calcular_resultado(puntaje)

        assert puntaje == 88  # (22 / 25) * 100 = 88 ptos
        assert resultado == "APTO"

        # 3. Avance a etapa de Entrevista tras superar evaluación
        validar_transicion(estado_postulacion, "ENTREVISTA", None)
        estado_postulacion = "ENTREVISTA"

        # Configuración de entrevista: modalidad permitida y postulación abierta
        modalidad = "Virtual"
        validar_opcion(modalidad, MODALIDADES_ENTREVISTA, "Modalidad")
        exigir_postulacion_abierta(estado_postulacion)

        # 4. Candidato supera entrevista y es Preseleccionado
        validar_transicion(estado_postulacion, "PRESELECCIONADO", None)
        estado_postulacion = "PRESELECCIONADO"

        # 5. Formalización de Contratación (Paso directo a CONTRATADO por transición simple está prohibido)
        with pytest.raises(ConflictoDeEstado, match="contratación"):
            validar_transicion(estado_postulacion, "CONTRATADO", None)

        # Al registrar formalmente la contratación con fecha de ingreso:
        fecha_ingreso = date(2026, 9, 1)
        estado_contratacion = estado_inicial_de_contratacion(fecha_ingreso)
        assert estado_contratacion in ("Por ingresar", "Activo")

        # 6. Programación y control de hitos de seguimiento post-ingreso
        hitos_calendarizados = {
            dias: fecha_de_seguimiento(fecha_ingreso, dias)
            for dias in HITOS_SEGUIMIENTO
        }

        assert hitos_calendarizados[30] == date(2026, 10, 1)
        assert hitos_calendarizados[60] == date(2026, 10, 31)
        assert hitos_calendarizados[90] == date(2026, 11, 30)

        # 7. Cierre del primer hito de seguimiento con evaluación satisfactoria
        validar_cierre_de_seguimiento("Realizado", "Satisfactorio")


class TestValidacionFlujoDescarteYReversion:
    """Valida el manejo de candidatos no seleccionados y el proceso auditado de reapertura."""

    def test_candidato_no_apto_es_descartado(self):
        """Candidato que no alcanza el umbral de 70 puntos es descartado."""
        notas_insuficientes = [2, 3, 2, 3]  # promedio 2.5/5 -> 50 puntos
        puntaje = calcular_puntaje_total(notas_insuficientes)
        assert puntaje == 50
        assert calcular_resultado(puntaje) == "NO_APTO"

        estado_postulacion = "EN_EVALUACION"
        validar_transicion(estado_postulacion, "DESCARTADO", None)
        estado_postulacion = "DESCARTADO"

        # Intentar avanzar una postulación descartada queda bloqueado
        with pytest.raises(ConflictoDeEstado, match="descartada"):
            exigir_postulacion_abierta(estado_postulacion)

    def test_reversion_auditada_de_descarte_por_reclamo_o_reapertura(self):
        """Para rescatar un candidato descartado, se exige forzosamente documentar el motivo."""
        estado_postulacion = "DESCARTADO"

        # Intentar volver a entrevistas directamente está prohibido
        with pytest.raises(ConflictoDeEstado, match="Primero revierte la decisión"):
            validar_transicion(estado_postulacion, "ENTREVISTA", "Error de digitación")

        # Intentar revertir sin motivo explícito queda bloqueado
        with pytest.raises(SolicitudInvalida, match="motivo"):
            validar_transicion(estado_postulacion, "POSTULADO", "   ")

        # Reversión legal con justificación registrada
        motivo_auditoria = "Revisión de CV por ampliación de perfil técnico requerida por gerencia"
        validar_transicion(estado_postulacion, "POSTULADO", motivo_auditoria)
