"""Formato de los datos de documentos ("schemas")."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field


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
    # Tamaño en bytes (vacío en los documentos de ejemplo, que no tienen archivo real).
    tamanioBytes: int | None = Field(default=None, validation_alias="tamano_bytes")
    fechaSubida: datetime = Field(validation_alias="fecha_subida")
    # Dato interno para saber si el documento tiene un archivo real en el Storage;
    # no se devuelve al frontend (exclude=True), solo se usa para calcular `tieneArchivo`.
    rutaArchivo: str | None = Field(default=None, validation_alias="ruta_archivo", exclude=True)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def tieneArchivo(self) -> bool:
        """True si se puede ver/descargar (los documentos de ejemplo no tienen archivo)."""
        return bool(self.rutaArchivo)
