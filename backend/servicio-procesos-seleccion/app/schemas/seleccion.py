"""Formato de los datos de entrevistas, contrataciones y seguimientos ("schemas").

Los nombres están en camelCase porque son los mismos que usa el frontend
(frontend/ERP/features/entrevistas y features/contrataciones).
"""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# ======================================================================= Entrevistas
class EntrevistaCrear(BaseModel):
    """Datos para programar una entrevista de una postulación."""

    postulanteId: str
    anuncioId: int
    fechaHora: datetime
    duracionMin: int = Field(default=30, ge=10, le=480)
    modalidad: str
    lugarOEnlace: str | None = Field(default=None, max_length=500)
    entrevistador: str | None = Field(default=None, max_length=150)  # si no se envía, es quien la programa
    notas: str | None = None


class EntrevistaActualizar(BaseModel):
    """Lo que se puede cambiar de una entrevista (reprogramarla, cerrarla, anotar cómo salió...)."""

    fechaHora: datetime | None = None
    duracionMin: int | None = Field(default=None, ge=10, le=480)
    modalidad: str | None = None
    lugarOEnlace: str | None = Field(default=None, max_length=500)
    entrevistador: str | None = Field(default=None, max_length=150)
    estado: str | None = None
    resultado: str | None = None
    notas: str | None = None


class EntrevistaRespuesta(BaseModel):
    id: str
    procesoId: str
    postulanteId: str
    anuncioId: int
    fechaHora: datetime
    duracionMin: int
    modalidad: str
    lugarOEnlace: str | None
    entrevistador: str
    estado: str
    resultado: str | None
    notas: str | None
    creadoPor: str
    fechaCreacion: datetime


# ======================================================================= Seguimientos
class SeguimientoCrear(BaseModel):
    """Un control adicional (además de los de 30, 60 y 90 días que se programan solos)."""

    contratacionId: str
    hitoDias: int = Field(ge=1, le=730)
    fechaProgramada: date | None = None  # si no se envía: ingreso + hitoDias
    observaciones: str | None = None


class SeguimientoActualizar(BaseModel):
    """Reprogramar un control o registrar cómo salió."""

    fechaProgramada: date | None = None
    estado: str | None = None
    fechaRealizada: date | None = None  # si se marca "Realizado" y no se envía: hoy
    valoracion: str | None = None
    observaciones: str | None = None


class SeguimientoRespuesta(BaseModel):
    id: str
    contratacionId: str
    postulanteId: str
    anuncioId: int
    hitoDias: int
    fechaProgramada: date
    fechaRealizada: date | None
    estado: str
    valoracion: str | None
    observaciones: str | None
    realizadoPor: str | None
    vencido: bool  # sigue "Pendiente" y su fecha ya pasó


# ======================================================================= Contrataciones
class ContratacionCrear(BaseModel):
    """Datos para registrar la contratación de una postulación (y marcarla como "Contratado")."""

    postulanteId: str
    anuncioId: int
    fechaIngreso: date
    cargo: str = Field(min_length=2, max_length=150)
    tipoContrato: str
    salario: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    moneda: str = Field(default="PEN", min_length=3, max_length=3)
    observaciones: str | None = None


class ContratacionActualizar(BaseModel):
    fechaIngreso: date | None = None
    cargo: str | None = Field(default=None, min_length=2, max_length=150)
    tipoContrato: str | None = None
    salario: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    moneda: str | None = Field(default=None, min_length=3, max_length=3)
    estado: str | None = None
    observaciones: str | None = None


class ContratacionRespuesta(BaseModel):
    id: str
    procesoId: str
    postulanteId: str
    anuncioId: int
    fechaIngreso: date
    cargo: str
    tipoContrato: str
    salario: float | None
    moneda: str
    estado: str
    observaciones: str | None
    creadoPor: str
    fechaCreacion: datetime
    seguimientos: list[SeguimientoRespuesta]
