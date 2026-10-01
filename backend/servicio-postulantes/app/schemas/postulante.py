"""Formato de los datos de postulantes ("schemas").

Un schema describe qué campos debe traer un JSON. Si falta uno o tiene el tipo
equivocado (ej. un correo mal escrito), FastAPI responde error 422
automáticamente, sin escribir esa validación a mano.

Los nombres de los campos están en camelCase porque son idénticos a los del
frontend (frontend/ERP/features/postulantes/types/postulante.types.ts).
"""
from datetime import date

from pydantic import BaseModel, EmailStr, Field


# --- Piezas pequeñas que van dentro del postulante -------------------------
class FormacionAcademicaItem(BaseModel):
    institucion: str
    titulo: str
    anioFin: int | None = None


class IdiomaItem(BaseModel):
    idioma: str
    nivel: str


class ExperienciaItem(BaseModel):
    empresa: str
    cargo: str
    fechaInicio: str
    fechaFin: str | None = None


class ConsentimientosCrear(BaseModel):
    tratamientoDatos: bool
    comunicacionesComerciales: bool = False


# --- Lo que LLEGA del frontend ---------------------------------------------
class PostulanteCrear(BaseModel):
    """Datos para registrar un postulante nuevo."""

    nombres: str
    apellidos: str
    documentoTipo: str
    documentoNumero: str = Field(min_length=8, max_length=20)
    email: EmailStr
    telefono: str | None = None
    cargoPostulado: str | None = None
    empresaCliente: str | None = None
    fechaNacimiento: date | None = None
    direccion: str | None = None
    fuenteReclutamiento: str | None = None
    formacionAcademica: list[FormacionAcademicaItem] = []
    idiomas: list[IdiomaItem] = []
    experiencia: list[ExperienciaItem] = []
    consentimientos: ConsentimientosCrear


class PostulanteActualizar(BaseModel):
    """Datos que se pueden editar. Todos opcionales: solo se cambia lo que se envíe.
    (El documento y el correo no se pueden cambiar.)"""

    nombres: str | None = None
    apellidos: str | None = None
    telefono: str | None = None
    cargoPostulado: str | None = None
    empresaCliente: str | None = None
    fechaNacimiento: date | None = None
    direccion: str | None = None
    fuenteReclutamiento: str | None = None
    formacionAcademica: list[FormacionAcademicaItem] | None = None
    idiomas: list[IdiomaItem] | None = None
    experiencia: list[ExperienciaItem] | None = None


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
    formacionAcademica: list[FormacionAcademicaItem]
    idiomas: list[IdiomaItem]
    experiencia: list[ExperienciaItem]
    fechaRegistro: date
    consentimientoTratamientoDatos: bool
    consentimientoComunicacionesComerciales: bool
    # True si el postulante ya tiene una cuenta de acceso a ANUNCIOS (tabla `usuarios`).
    tieneCuenta: bool = False

    model_config = {"from_attributes": True}


class SolicitudCuentaRespuesta(BaseModel):
    """Respuesta de POST /postulantes/{id}/solicitar-cuenta."""

    enviadoA: str  # correo al que se envió la invitación
