"""Schemas para autenticación y recuperación de contraseña de postulantes."""
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegistroPostulanteEntrada(BaseModel):
    """Datos para crear una cuenta de postulante desde ANUNCIOS."""

    nombres: str = Field(min_length=1, max_length=150)
    apellidos: str = Field(min_length=1, max_length=150)
    documentoTipo: str = Field(default="DNI", max_length=20)
    documentoNumero: str = Field(min_length=6, max_length=20)
    email: EmailStr
    telefono: str | None = Field(default=None, max_length=30)
    fechaNacimiento: date | None = None
    password: str = Field(min_length=8, max_length=128)
    aceptaTratamientoDatos: bool
    aceptaComunicaciones: bool = False
    # Token del enlace de invitación (solo cuando RRHH ya había registrado a la persona).
    invitacion: str | None = Field(default=None, min_length=10, max_length=100)
    ip: str | None = Field(default=None, max_length=45)

    model_config = ConfigDict(extra="forbid")


class LoginPostulanteEntrada(BaseModel):
    """Credenciales para iniciar sesión como postulante."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    model_config = ConfigDict(extra="forbid")


class RecuperarPasswordEntrada(BaseModel):
    """Datos para solicitar correo de recuperación de contraseña."""

    email: EmailStr
    ip: str | None = Field(default=None, max_length=45)

    model_config = ConfigDict(extra="forbid")


class RestablecerPasswordEntrada(BaseModel):
    """Datos para establecer una nueva contraseña usando el token del enlace."""

    token: str = Field(min_length=10, max_length=100)
    nuevaPassword: str = Field(min_length=8, max_length=128)
    ip: str | None = Field(default=None, max_length=45)

    model_config = ConfigDict(extra="forbid")


class AceptarTerminosEntrada(BaseModel):
    """Confirmación de aceptación de la versión vigente de términos."""

    version: str = Field(max_length=20)
    ip: str | None = Field(default=None, max_length=45)

    model_config = ConfigDict(extra="forbid")


class PerfilActualizarEntrada(BaseModel):
    """Datos permitidos para que el postulante actualice su propio perfil."""
    nombres: str | None = Field(default=None, min_length=1, max_length=150)
    apellidos: str | None = Field(default=None, min_length=1, max_length=150)
    documentoTipo: str | None = Field(default=None, max_length=20)
    documentoNumero: str | None = Field(default=None, min_length=6, max_length=20)
    telefono: str | None = Field(default=None, max_length=30)
    fechaNacimiento: date | None = None
    direccion: str | None = Field(default=None, max_length=255)
    resumenProfesional: str | None = Field(default=None, max_length=1000)
    formacionAcademica: list[dict] | None = None
    idiomas: list[dict] | None = None
    experiencia: list[dict] | None = None

    model_config = ConfigDict(extra="forbid")



class AuthPostulanteRespuesta(BaseModel):
    """Datos básicos tras registro o login exitoso para emitir JWT en el Gateway."""

    usuarioId: str
    postulanteId: str
    email: str
    nombre: str
    requiereAceptarTerminos: bool = False
    versionTerminos: str | None = None


class MePostulanteRespuesta(BaseModel):
    """Datos de la sesión y perfil básico del postulante logueado."""

    usuarioId: str
    postulanteId: str
    email: str
    nombres: str
    apellidos: str
    nombreCompleto: str
    documentoTipo: str
    documentoNumero: str
    telefono: str | None = None
    fechaNacimiento: date | None = None
    direccion: str | None = None
    resumenProfesional: str | None = None
    formacionAcademica: list[dict] = Field(default_factory=list)
    idiomas: list[dict] = Field(default_factory=list)
    experiencia: list[dict] = Field(default_factory=list)
    cv: dict | None = None
    requiereAceptarTerminos: bool = False
    versionTerminos: str | None = None
    passwordCambiadaEn: datetime | None = None


class MensajeRespuesta(BaseModel):
    """Respuesta informativa estándar."""

    mensaje: str
