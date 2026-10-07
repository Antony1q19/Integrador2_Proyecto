"""Formato de los datos de las postulaciones ("schemas").

Los nombres están en camelCase porque son los mismos que usa el frontend
(frontend/ERP/features/postulantes/types/postulante.types.ts).
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# --- Lo que LLEGA del frontend ---------------------------------------------
class ProcesoCrear(BaseModel):
    """Datos para registrar que un postulante se presentó a un anuncio."""

    postulanteId: str = Field(max_length=36)
    anuncioId: int


class CambiarEstadoProceso(BaseModel):
    """Datos para mover una postulación a otra etapa."""

    estado: str
    comentario: str | None = Field(default=None, max_length=500)


# --- Lo que se DEVUELVE al frontend ----------------------------------------
class HistorialRespuesta(BaseModel):
    """Un cambio de etapa: cuál, cuándo, quién y por qué."""

    # `validation_alias` lee el dato desde la columna de la base (con guion bajo)
    # y lo devuelve con el nombre camelCase que espera el frontend.
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    estado: str
    fecha: datetime
    usuarioResponsable: str = Field(validation_alias="usuario_responsable")
    comentario: str | None = None


class HistorialPublicoRespuesta(BaseModel):
    """Un cambio de etapa tal como lo ve el POSTULANTE en ANUNCIOS: solo cuál y cuándo.

    Lista blanca a propósito: NO incluye el comentario (son notas internas de RRHH, ej. el motivo
    de un descarte) ni el nombre de quién hizo el cambio."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    estado: str
    fecha: datetime


class ProcesoPostulanteRespuesta(BaseModel):
    """Una postulación tal como la ve el propio postulante (historial sin datos internos)."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    postulanteId: str = Field(validation_alias="postulante_id")
    anuncioId: int = Field(validation_alias="anuncio_id")
    estadoActual: str = Field(validation_alias="estado_actual")
    fechaPostulacion: datetime = Field(validation_alias="fecha_postulacion")
    historialEstados: list[HistorialPublicoRespuesta] = Field(validation_alias="historial")


class ProcesoRespuesta(BaseModel):
    """Una postulación (postulante + anuncio) con su historial de etapas."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    postulanteId: str = Field(validation_alias="postulante_id")
    anuncioId: int = Field(validation_alias="anuncio_id")
    estadoActual: str = Field(validation_alias="estado_actual")
    fechaPostulacion: datetime = Field(validation_alias="fecha_postulacion")
    historialEstados: list[HistorialRespuesta] = Field(validation_alias="historial")
