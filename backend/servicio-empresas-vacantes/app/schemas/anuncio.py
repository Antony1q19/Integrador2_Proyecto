"""Formato de los datos de anuncios ("schemas").

Los nombres están en camelCase porque son los mismos que usa el frontend
(frontend/ERP/features/anuncios/types/anuncio.ts).
"""
from datetime import date, datetime

from pydantic import BaseModel


class AnuncioRespuesta(BaseModel):
    """Un anuncio de trabajo, con el nombre de su empresa ya incluido."""

    id: int
    empresaId: int
    empresaRazonSocial: str
    cargo: str
    descripcion: str | None = None
    requisitos: str | None = None
    numeroVacantes: int
    salarioMin: float | None = None
    salarioMax: float | None = None
    fechaLimite: date
    estado: str  # Abierto | En proceso | Cerrado
    fechaCreacion: datetime
