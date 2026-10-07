"""Fechas "de calendario" del sistema, siempre en hora de Perú.

Los servidores (Docker, Supabase) corren en UTC: `date.today()` ahí devuelve la fecha de UTC, que
desde las 7 p. m. de Lima ya es "mañana". Toda regla que dependa del día (fecha límite de un
anuncio, fecha de registro...) debe usar `hoy_en_peru()`.
"""
from datetime import date, datetime, timedelta, timezone

ZONA_PERU = timezone(timedelta(hours=-5))


def hoy_en_peru() -> date:
    """La fecha de hoy en Perú (UTC-5, sin horario de verano)."""
    return datetime.now(ZONA_PERU).date()


def ahora_en_peru() -> datetime:
    """La fecha y hora actuales en Perú (con zona horaria)."""
    return datetime.now(ZONA_PERU)
