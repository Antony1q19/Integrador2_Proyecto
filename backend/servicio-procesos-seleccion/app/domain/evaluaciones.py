"""Reglas de negocio de las evaluaciones por competencias (HU-08).

Son las mismas reglas que ya usa el frontend en
frontend/ERP/features/postulantes/utils/evaluacion.ts: se calculan también aquí
para que el resultado lo decida el servidor y nadie pueda enviar un puntaje
inventado.
"""

# Puntaje mínimo (sobre 100) para ser considerado APTO.
UMBRAL_APTO = 70


def calcular_puntaje_total(competencias: list[int]) -> int:
    """Promedio de las competencias (cada una de 1 a 5) llevado a una escala de 0 a 100.

    Ejemplo: seis competencias en 4 → promedio 4 de 5 → 80 puntos.
    """
    promedio = sum(competencias) / len(competencias)
    return int(promedio / 5 * 100 + 0.5)  # "+ 0.5" = redondear al entero más cercano


def calcular_resultado(puntaje_total: int) -> str:
    """APTO desde 70 puntos; por debajo, NO_APTO. Depende solo del puntaje."""
    return "APTO" if puntaje_total >= UMBRAL_APTO else "NO_APTO"
