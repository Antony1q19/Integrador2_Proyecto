"""Reglas de negocio de las entrevistas, las contrataciones y el seguimiento post-ingreso.

Están separadas de las rutas para que, si una regla cambia, se cambie solo aquí.
"""
from collections.abc import Collection
from datetime import date, datetime, timedelta, timezone

from shared_kernel.exceptions import ConflictoDeEstado, SolicitudInvalida

ZONA_PERU = timezone(timedelta(hours=-5))

# --- Entrevistas -------------------------------------------------------------
MODALIDADES_ENTREVISTA = {"Presencial", "Virtual", "Telefónica"}
ESTADOS_ENTREVISTA = {"Programada", "Realizada", "Cancelada", "No asistió"}
RESULTADOS_ENTREVISTA = {"Aprobada", "No aprobada", "Pendiente de decisión"}

# --- Contrataciones ----------------------------------------------------------
TIPOS_CONTRATO = {"Plazo fijo", "Plazo indeterminado", "Locación de servicios", "Prácticas", "Otro"}
ESTADOS_CONTRATACION = {"Por ingresar", "Activo", "Finalizado", "Cancelado"}
# Una contratación en estos estados sigue "viva": si se revierte la decisión, se cancela.
ESTADOS_CONTRATACION_VIVOS = {"Por ingresar", "Activo"}

# --- Seguimiento post-ingreso ------------------------------------------------
# Al registrar una contratación se programan solos estos controles (días después del ingreso).
HITOS_SEGUIMIENTO = (30, 60, 90)
ESTADOS_SEGUIMIENTO = {"Pendiente", "Realizado", "Omitido"}
VALORACIONES_SEGUIMIENTO = {"Satisfactorio", "Con observaciones", "Insatisfactorio"}


def hoy_en_peru() -> date:
    """La fecha de hoy en Perú (las fechas del sistema se cuentan en hora de Perú)."""
    return datetime.now(ZONA_PERU).date()


def validar_opcion(valor: str | None, permitidas: Collection[str], nombre: str) -> None:
    """Lanza error 400 si `valor` no es una de las opciones permitidas (ignora None)."""
    if valor is not None and valor not in permitidas:
        raise SolicitudInvalida(f"{nombre} inválido: {valor}. Opciones: {', '.join(sorted(permitidas))}")


def exigir_postulacion_abierta(estado_proceso: str) -> None:
    """No se programan entrevistas ni se contrata sobre una postulación ya cerrada (Descartado)."""
    if estado_proceso == "DESCARTADO":
        raise ConflictoDeEstado("Esta postulación fue descartada. Revierte la decisión antes de continuar.")


def fecha_de_seguimiento(fecha_ingreso: date, hito_dias: int) -> date:
    """Cuándo toca el control: `hito_dias` días después del ingreso."""
    return fecha_ingreso + timedelta(days=hito_dias)


def estado_inicial_de_contratacion(fecha_ingreso: date) -> str:
    """Si la persona aún no ha ingresado (fecha futura) está "Por ingresar"; si no, ya está "Activo"."""
    return "Por ingresar" if fecha_ingreso > hoy_en_peru() else "Activo"


def validar_cierre_de_seguimiento(estado: str, valoracion: str | None) -> None:
    """Un control "Realizado" debe decir cómo salió (la valoración)."""
    if estado == "Realizado" and not valoracion:
        raise SolicitudInvalida("Para marcar el seguimiento como realizado indica la valoración")
