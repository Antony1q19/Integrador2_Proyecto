"""Formato de los datos de las evaluaciones ("schemas").

Los nombres están en camelCase porque son los mismos que usa el frontend
(frontend/ERP/features/postulantes/types/postulante.types.ts).
"""
from datetime import date

from pydantic import BaseModel, Field


class Competencias(BaseModel):
    """Las 6 competencias, cada una calificada de 1 a 5.

    `ge=1, le=5` = "mayor o igual a 1 y menor o igual a 5": si llega otro número,
    FastAPI responde error 422 solo.
    """

    comunicacionEfectiva: int = Field(ge=1, le=5)
    orientacionCliente: int = Field(ge=1, le=5)
    responsabilidad: int = Field(ge=1, le=5)
    adaptabilidadFlexibilidad: int = Field(ge=1, le=5)
    toleranciaPresion: int = Field(ge=1, le=5)
    dinamismoEnergia: int = Field(ge=1, le=5)


# --- Lo que LLEGA del frontend ---------------------------------------------
class EvaluacionCrear(BaseModel):
    """Datos para registrar una evaluación. El puntaje y el resultado NO se envían:
    los calcula el servidor. Tampoco el evaluador: es la persona con sesión iniciada."""

    postulanteId: str
    competencias: Competencias
    comentarios: str = ""


# --- Lo que se DEVUELVE al frontend ----------------------------------------
class EvaluacionRespuesta(BaseModel):
    id: str
    postulanteId: str
    evaluador: str
    fecha: date
    competencias: Competencias
    puntajeTotal: int
    resultado: str  # APTO | NO_APTO
    comentarios: str
