"""Reglas de negocio de las postulaciones (el recorrido de un postulante en un anuncio)."""
from shared_kernel.exceptions import SolicitudInvalida

# Las etapas por las que pasa una postulación. Las 4 primeras y CONTRATADO forman
# el recorrido normal (el tablero Kanban); DESCARTADO es una salida.
ESTADOS_PROCESO = {
    "POSTULADO",
    "EN_EVALUACION",
    "ENTREVISTA",
    "PRESELECCIONADO",
    "CONTRATADO",
    "DESCARTADO",
}


def validar_estado_proceso(estado: str) -> None:
    """Lanza error 400 si la etapa no es una de las de arriba."""
    if estado not in ESTADOS_PROCESO:
        raise SolicitudInvalida(f"Estado de postulación inválido: {estado}")
