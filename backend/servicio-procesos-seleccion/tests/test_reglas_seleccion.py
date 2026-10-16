"""Pruebas de las reglas de negocio del proceso de selección (HU de pipeline, evaluaciones,
entrevistas, contrataciones, seguimiento post-ingreso y dashboard).

Correr:  PYTHONPATH=.:../libs/shared python -m pytest tests -q   (desde servicio-procesos-seleccion/)
"""
from datetime import date, timedelta

import pytest

from app.domain.dashboard import _granularidad, _inicio_de_bloque, _siguiente_bloque, limites_del_rango
from app.domain.evaluaciones import calcular_puntaje_total, calcular_resultado
from app.domain.procesos import validar_estado_proceso, validar_transicion
from app.domain.seleccion import (
    estado_inicial_de_contratacion,
    exigir_postulacion_abierta,
    fecha_de_seguimiento,
    hoy_en_peru,
    validar_cierre_de_seguimiento,
    validar_opcion,
)
from shared_kernel.exceptions import ConflictoDeEstado, SolicitudInvalida


# --------------------------------------------------------------------------- pipeline (transiciones)
@pytest.mark.parametrize(
    ("actual", "nuevo"),
    [
        ("POSTULADO", "EN_EVALUACION"),
        ("EN_EVALUACION", "ENTREVISTA"),
        ("ENTREVISTA", "PRESELECCIONADO"),
        ("PRESELECCIONADO", "POSTULADO"),  # entre etapas abiertas se mueve libremente
        ("ENTREVISTA", "DESCARTADO"),
    ],
)
def test_transiciones_permitidas(actual, nuevo):
    validar_transicion(actual, nuevo, None)  # no lanza error


def test_no_se_mueve_a_la_misma_etapa():
    with pytest.raises(ConflictoDeEstado):
        validar_transicion("ENTREVISTA", "ENTREVISTA", None)


def test_a_contratado_solo_se_llega_registrando_la_contratacion():
    with pytest.raises(ConflictoDeEstado, match="contratación"):
        validar_transicion("PRESELECCIONADO", "CONTRATADO", None)


def test_desde_una_decision_final_solo_se_revierte_a_postulado():
    with pytest.raises(ConflictoDeEstado):
        validar_transicion("DESCARTADO", "ENTREVISTA", "volvió a interesarse")


def test_revertir_una_decision_final_exige_el_motivo():
    with pytest.raises(SolicitudInvalida, match="motivo"):
        validar_transicion("DESCARTADO", "POSTULADO", "   ")
    validar_transicion("DESCARTADO", "POSTULADO", "Se reabrió la vacante")  # con motivo: OK


def test_etapa_inexistente_es_invalida():
    with pytest.raises(SolicitudInvalida):
        validar_estado_proceso("FINALISTA")


# --------------------------------------------------------------------------- evaluaciones (HU-08)
@pytest.mark.parametrize(
    ("competencias", "puntaje", "resultado"),
    [
        ([4, 4, 4, 4, 4, 4], 80, "APTO"),
        ([5, 5, 5, 5], 100, "APTO"),
        ([3, 4, 4, 3], 70, "APTO"),       # justo en el umbral
        ([3, 3, 4, 3], 65, "NO_APTO"),
        ([1, 1, 1], 20, "NO_APTO"),
    ],
)
def test_puntaje_y_resultado_de_la_evaluacion(competencias, puntaje, resultado):
    total = calcular_puntaje_total(competencias)
    assert total == puntaje
    assert calcular_resultado(total) == resultado


# --------------------------------------------------------------------------- entrevistas, contrataciones, seguimiento
def test_opcion_invalida_lista_las_permitidas():
    with pytest.raises(SolicitudInvalida, match="Presencial"):
        validar_opcion("Por paloma", {"Presencial", "Virtual"}, "Modalidad")
    validar_opcion(None, {"Presencial"}, "Modalidad")  # None se ignora


def test_no_se_avanza_sobre_una_postulacion_descartada():
    with pytest.raises(ConflictoDeEstado):
        exigir_postulacion_abierta("DESCARTADO")
    exigir_postulacion_abierta("ENTREVISTA")


def test_controles_post_ingreso_a_30_60_90_dias():
    ingreso = date(2026, 1, 15)
    assert [fecha_de_seguimiento(ingreso, d) for d in (30, 60, 90)] == [
        date(2026, 2, 14),
        date(2026, 3, 16),
        date(2026, 4, 15),
    ]


def test_estado_inicial_de_la_contratacion_segun_fecha_de_ingreso():
    assert estado_inicial_de_contratacion(hoy_en_peru() + timedelta(days=3)) == "Por ingresar"
    assert estado_inicial_de_contratacion(hoy_en_peru()) == "Activo"


def test_seguimiento_realizado_exige_valoracion():
    with pytest.raises(SolicitudInvalida):
        validar_cierre_de_seguimiento("Realizado", None)
    validar_cierre_de_seguimiento("Realizado", "Satisfactorio")
    validar_cierre_de_seguimiento("Omitido", None)


# --------------------------------------------------------------------------- dashboard
def test_rango_del_dashboard_incluye_ambos_dias_en_hora_de_peru():
    inicio, fin = limites_del_rango(date(2026, 10, 1), date(2026, 10, 31))
    assert (fin - inicio).days == 31
    assert inicio.utcoffset() == timedelta(hours=-5)


@pytest.mark.parametrize(("dias", "granularidad"), [(30, "dia"), (62, "dia"), (90, "semana"), (365, "mes")])
def test_la_serie_se_agrupa_segun_el_largo_del_rango(dias, granularidad):
    desde = date(2026, 1, 1)
    assert _granularidad(desde, desde + timedelta(days=dias - 1)) == granularidad


def test_bloques_de_semana_y_mes():
    miercoles = date(2026, 10, 7)
    assert _inicio_de_bloque(miercoles, "semana") == date(2026, 10, 5)  # lunes
    assert _inicio_de_bloque(miercoles, "mes") == date(2026, 10, 1)
    assert _siguiente_bloque(date(2026, 1, 31).replace(day=1), "mes") == date(2026, 2, 1)
    assert _siguiente_bloque(date(2026, 12, 1), "mes") == date(2027, 1, 1)
