"""Formato de los datos de postulantes ("schemas").

Un schema describe qué campos debe traer un JSON. Si falta uno o tiene el tipo
equivocado (ej. un correo mal escrito), FastAPI responde error 422
automáticamente, sin escribir esa validación a mano.

Los nombres de los campos están en camelCase porque son idénticos a los del
frontend (frontend/ERP/features/postulantes/types/postulante.types.ts).
"""
from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator


# --- Piezas pequeñas que van dentro del postulante -------------------------
class FormacionAcademicaItem(BaseModel):
    institucion: str = Field(max_length=150)
    titulo: str = Field(max_length=150)
    anioFin: int | None = Field(default=None, ge=1950, le=2100)


class IdiomaItem(BaseModel):
    idioma: str = Field(max_length=50)
    nivel: str = Field(max_length=50)


class ExperienciaItem(BaseModel):
    empresa: str = Field(max_length=150)
    cargo: str = Field(max_length=150)
    fechaInicio: str = Field(max_length=20)
    fechaFin: str | None = Field(default=None, max_length=20)


class ConsentimientosCrear(BaseModel):
    tratamientoDatos: bool
    comunicacionesComerciales: bool = False


# --- Lo que LLEGA del frontend ---------------------------------------------
class PostulanteCrear(BaseModel):
    """Datos para registrar un postulante nuevo."""

    # Los largos máximos son los de las columnas (infrastructure/models.py): si se pasaran, la base de
    # datos fallaría con un error 500 en vez de un mensaje claro. El formato del documento y del
    # teléfono se valida en el endpoint (domain/postulantes.py) para responder un mensaje legible.
    nombres: str = Field(min_length=1, max_length=150)
    apellidos: str = Field(min_length=1, max_length=150)
    documentoTipo: str = Field(max_length=20)
    documentoNumero: str = Field(min_length=6, max_length=20)
    email: EmailStr = Field(max_length=255)
    telefono: str | None = Field(default=None, max_length=30)
    cargoPostulado: str | None = Field(default=None, max_length=150)
    empresaCliente: str | None = Field(default=None, max_length=150)
    fechaNacimiento: date | None = None
    direccion: str | None = Field(default=None, max_length=255)
    fuenteReclutamiento: str | None = Field(default=None, max_length=100)
    formacionAcademica: list[FormacionAcademicaItem] = Field(default=[], max_length=20)
    idiomas: list[IdiomaItem] = Field(default=[], max_length=20)
    experiencia: list[ExperienciaItem] = Field(default=[], max_length=20)
    consentimientos: ConsentimientosCrear

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, valor: str) -> str:
        """El correo se guarda siempre en minúsculas y sin espacios: así coincide con el que la
        persona escribe al crear su cuenta en ANUNCIOS (que también se normaliza)."""
        return valor.strip().lower()


class PostulanteActualizar(BaseModel):
    """Datos que se pueden editar. Todos opcionales: solo se cambia lo que se envíe.
    (El documento y el correo no se pueden cambiar.)"""

    nombres: str | None = Field(default=None, min_length=1, max_length=150)
    apellidos: str | None = Field(default=None, min_length=1, max_length=150)
    telefono: str | None = Field(default=None, max_length=30)
    cargoPostulado: str | None = Field(default=None, max_length=150)
    empresaCliente: str | None = Field(default=None, max_length=150)
    fechaNacimiento: date | None = None
    direccion: str | None = Field(default=None, max_length=255)
    fuenteReclutamiento: str | None = Field(default=None, max_length=100)
    formacionAcademica: list[FormacionAcademicaItem] | None = Field(default=None, max_length=20)
    idiomas: list[IdiomaItem] | None = Field(default=None, max_length=20)
    experiencia: list[ExperienciaItem] | None = Field(default=None, max_length=20)


# --- Lo que se DEVUELVE al frontend ----------------------------------------
class PostulanteRespuesta(BaseModel):
    id: str
    nombres: str
    apellidos: str
    documentoTipo: str
    documentoNumero: str
    email: str
    telefono: str | None
    cargoPostulado: str | None
    empresaCliente: str | None
    fechaNacimiento: date | None
    direccion: str | None
    fuenteReclutamiento: str | None
    # Se devuelven tal cual están guardadas: el ERP las crea con un formato
    # (ej. idioma {"idioma", "nivel"}) y el postulante las edita desde ANUNCIOS
    # con otro (ej. {"id", "nombre", "nivel"}). El frontend del ERP ya acepta
    # ambos (ver mapearIdiomas en postulantesService.ts); validarlas aquí con
    # un solo formato hacía fallar (500) todo el listado.
    formacionAcademica: list[dict]
    idiomas: list[dict]
    experiencia: list[dict]
    fechaRegistro: date
    consentimientoTratamientoDatos: bool
    consentimientoComunicacionesComerciales: bool
    # True si el postulante ya tiene una cuenta de acceso a ANUNCIOS (tabla `usuarios`).
    tieneCuenta: bool = False

    model_config = {"from_attributes": True}


class SolicitudCuentaRespuesta(BaseModel):
    """Respuesta de POST /postulantes/{id}/solicitar-cuenta."""

    enviadoA: str  # correo al que se envió la invitación
