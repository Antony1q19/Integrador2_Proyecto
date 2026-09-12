"""DTOs de documentos (HU-06: subir/reemplazar documentos).

Los alias mapean el nombre de columna en snake_case del modelo SQLAlchemy
al camelCase que espera el Front-End, para poder construir la respuesta
directo desde el objeto ORM con `model_validate(documento)` sin mapeo
manual en cada endpoint.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentoCrear(BaseModel):
    tipo: str
    nombreArchivo: str
    referenciaAlmacenamiento: str


class DocumentoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    tipo: str
    nombreArchivo: str = Field(validation_alias="nombre_archivo")
    referenciaAlmacenamiento: str = Field(validation_alias="referencia_almacenamiento")
    fechaSubida: datetime = Field(validation_alias="fecha_subida")
