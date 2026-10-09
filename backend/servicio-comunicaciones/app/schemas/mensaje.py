"""Formato JSON de mensajes y conversaciones."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class ConversacionCrear(BaseModel):
    """Datos para crear una conversación nueva."""
    postulante_id: str = Field(min_length=1)
    nombre: str = Field(min_length=1, max_length=300)
    telefono: str = Field(min_length=5, max_length=30)

class MensajeCrear(BaseModel):
    """Datos para enviar un mensaje nuevo.

    NO hace falta postulante_id: la conversación (por su id en la URL) ya sabe
    con quién se está hablando.
    """
    texto: str = Field(min_length=1, max_length=4000)


class MensajeRespuesta(BaseModel):
    """Un mensaje que se devuelve al frontend."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    conversacion_id: str = Field(validation_alias="conversacion_id")
    remitente: str
    texto: str
    fecha: datetime
    estado: str
    wamid: str | None = None


class ConversacionRespuesta(BaseModel):
    """Una conversación con el último mensaje y datos del postulante."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    postulante_id: str = Field(validation_alias="postulante_id")
    nombre: str
    telefono: str
    ultima_actividad: datetime = Field(validation_alias="ultima_actividad")
    no_leidos: int = Field(validation_alias="no_leidos")