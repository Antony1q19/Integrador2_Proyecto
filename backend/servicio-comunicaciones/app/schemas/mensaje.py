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
    error: str | None = None  # por qué no se entregó (si estado == "fallido")


class ConversacionRespuesta(BaseModel):
    """Una conversación con el último mensaje y datos del postulante."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    postulante_id: str = Field(validation_alias="postulante_id")
    nombre: str
    telefono: str
    ultima_actividad: datetime = Field(validation_alias="ultima_actividad")
    no_leidos: int = Field(validation_alias="no_leidos")
    # Vista previa en la lista de chats.
    ultimo_mensaje: str | None = None
    # False = escribió un número que no es de ningún postulante (se muestra "No registrado").
    registrado: bool = True
    # Cuándo escribió el postulante por última vez. WhatsApp solo deja mandarle texto libre durante
    # las 24 h siguientes; después hay que usar una plantilla ("Retomar chat").
    ultimo_entrante: datetime | None = None


# ---------------------------------------------------------------------------
# Plantillas de WhatsApp (viven en Meta; aquí solo se listan, crean y envían)
# ---------------------------------------------------------------------------
class PlantillaRespuesta(BaseModel):
    """Una plantilla de la cuenta de WhatsApp Business, con su estado de revisión en Meta."""
    nombre: str
    categoria: str               # MARKETING | UTILITY | AUTHENTICATION
    idioma: str                  # es, es_MX, en_US...
    estado: str                  # APPROVED | PENDING | REJECTED | PAUSED | DISABLED
    cuerpo: str                  # el texto, con {{1}}, {{2}}... donde van las variables
    variables: int               # cuántas variables tiene el cuerpo
    motivo_rechazo: str | None = None


class PlantillaCrear(BaseModel):
    """Datos para mandar una plantilla nueva a revisión de Meta."""
    # Meta solo acepta minúsculas, números y guion bajo en el nombre.
    nombre: str = Field(min_length=1, max_length=512, pattern=r"^[a-z0-9_]+$")
    categoria: str = Field(pattern=r"^(MARKETING|UTILITY)$")
    idioma: str = Field(default="es", min_length=2, max_length=10)
    cuerpo: str = Field(min_length=1, max_length=1024)
    # Un ejemplo por cada {{n}} del cuerpo, en orden (Meta los pide para revisarla).
    ejemplos: list[str] = Field(default_factory=list)


class PlantillaEnviar(BaseModel):
    """Enviar una plantilla APROBADA a una conversación."""
    nombre: str = Field(min_length=1)
    idioma: str = Field(min_length=2)
    variables: list[str] = Field(default_factory=list)  # valores para {{1}}, {{2}}... en orden


# ---------------------------------------------------------------------------
# Plantillas rápidas del chat (textos editables guardados en nuestra base)
# ---------------------------------------------------------------------------
class PlantillaRapidaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    titulo: str
    descripcion: str
    categoria: str
    contenido: str


class PlantillaRapidaActualizar(BaseModel):
    titulo: str = Field(min_length=1, max_length=100)
    descripcion: str = Field(default="", max_length=200)
    contenido: str = Field(min_length=1, max_length=4000)
