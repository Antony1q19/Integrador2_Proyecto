"""Formato de los datos de documentos ("schemas")."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field


class DocumentoCrear(BaseModel):
    """Lo que envía el frontend para registrar un documento que YA está guardado en otro
    lugar (solo se anota su referencia). Para subir un archivo de verdad se usa la ruta
    de "archivo" (multipart), ver api/v1/documentos.py."""

    tipo: str
    nombreArchivo: str
    referenciaAlmacenamiento: str


class DocumentoRespuesta(BaseModel):
    """Lo que se le devuelve al frontend.

    La base de datos usa nombres_con_guion_bajo y el frontend usa camelCase.
    `validation_alias` le dice a Pydantic: "lee este campo desde la columna con
    este otro nombre". Así se puede devolver la fila tal cual, sin copiarla
    campo por campo.
    """

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    tipo: str
    nombreArchivo: str = Field(validation_alias="nombre_archivo")
    referenciaAlmacenamiento: str = Field(validation_alias="referencia_almacenamiento")
    # Tamaño en bytes (vacío en documentos antiguos que no se subieron a Cloudinary).
    tamanioBytes: int | None = Field(default=None, validation_alias="tamano_bytes")
    fechaSubida: datetime = Field(validation_alias="fecha_subida")
    # Dato interno para saber si el documento tiene un archivo real en Cloudinary;
    # no se devuelve al frontend (exclude=True), solo se usa para calcular `tieneArchivo`.
    publicId: str | None = Field(default=None, validation_alias="public_id", exclude=True)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def tieneArchivo(self) -> bool:
        """True si se puede ver/descargar (los documentos de ejemplo no tienen archivo)."""
        return bool(self.publicId)
