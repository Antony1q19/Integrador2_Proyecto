"""Reglas de negocio de las postulaciones (el recorrido de un postulante en un anuncio)."""
from shared_kernel.exceptions import ConflictoDeEstado, SolicitudInvalida

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


# Etapas en las que la postulación sigue "viva" (se puede mover libremente entre ellas)...
ESTADOS_ABIERTOS = {"POSTULADO", "EN_EVALUACION", "ENTREVISTA", "PRESELECCIONADO"}
# ...y las decisiones finales.
ESTADOS_FINALES = {"CONTRATADO", "DESCARTADO"}


def validar_estado_proceso(estado: str) -> None:
    """Lanza error 400 si la etapa no es una de las de arriba."""
    if estado not in ESTADOS_PROCESO:
        raise SolicitudInvalida(f"Estado de postulación inválido: {estado}")


def validar_transicion(estado_actual: str, estado_nuevo: str, comentario: str | None) -> None:
    """Reglas del flujo de selección al mover una postulación de etapa (PATCH .../estado).

    1. No se "mueve" a la misma etapa en la que ya está (dejaría historial duplicado).
    2. A CONTRATADO no se llega con un simple cambio de etapa: se registra la contratación
       (POST /contrataciones), que además guarda fecha de ingreso, contrato y seguimientos.
    3. Entre las etapas abiertas (Postulado, En evaluación, Entrevista, Preseleccionado) y hacia
       Descartado se puede mover libremente.
    4. Desde una decisión final (Contratado o Descartado) solo se puede REVERTIR, volviendo a
       Postulado, y diciendo el motivo en el comentario (queda en el historial).
    """
    validar_estado_proceso(estado_nuevo)
    if estado_nuevo == estado_actual:
        raise ConflictoDeEstado(f"La postulación ya está en la etapa {estado_nuevo}")
    if estado_nuevo == "CONTRATADO":
        raise ConflictoDeEstado(
            "Para pasar a Contratado registra la contratación (fecha de ingreso, tipo de contrato...): "
            "así quedan programados sus seguimientos"
        )
    if estado_actual in ESTADOS_FINALES:
        if estado_nuevo != "POSTULADO":
            raise ConflictoDeEstado(
                f"La postulación tiene una decisión final ({estado_actual}). "
                "Primero revierte la decisión (vuelve a Postulado)"
            )
        if not (comentario or "").strip():
            raise SolicitudInvalida("Para revertir una decisión final indica el motivo en el comentario")
