"""Schemas para las rutas de autenticación pública de postulantes en el Gateway."""
from datetime import date
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegistroPostulanteGateway(BaseModel):
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

    model_config = ConfigDict(extra="forbid")


class LoginPostulanteGateway(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    model_config = ConfigDict(extra="forbid")


class RecuperarPasswordGateway(BaseModel):
    email: EmailStr

    model_config = ConfigDict(extra="forbid")


class RestablecerPasswordGateway(BaseModel):
    token: str = Field(min_length=10, max_length=100)
    nuevaPassword: str = Field(min_length=8, max_length=128)

    model_config = ConfigDict(extra="forbid")


class AceptarTerminosGateway(BaseModel):
    version: str = Field(max_length=20)

    model_config = ConfigDict(extra="forbid")


class PerfilActualizarGateway(BaseModel):
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



class UsuarioPostulanteDto(BaseModel):
    id: str
    postulanteId: str
    email: str
    nombre: str
    requiereAceptarTerminos: bool = False
    versionTerminos: str | None = None


class TokenPostulanteRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioPostulanteDto


class MensajePublicoRespuesta(BaseModel):
    mensaje: str
