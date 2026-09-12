"""DTOs de postulante. Nombres de campo calcados de
`postulante.types.ts` del Front-End para que el mapeo TS <-> Pydantic sea
directo (ver ADR-001: "documentar con rigor los contratos de la API")."""
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


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


class PostulanteCrear(BaseModel):
    nombres: str
    apellidos: str
    documentoTipo: str
    documentoNumero: str = Field(min_length=8, max_length=20)
    email: EmailStr
    telefono: str | None = None
    cargoPostulado: str | None = None
    empresaCliente: str | None = None
    formacionAcademica: list[FormacionAcademicaItem] = []
    idiomas: list[IdiomaItem] = []
    experiencia: list[ExperienciaItem] = []
    consentimientos: ConsentimientosCrear


class PostulanteActualizar(BaseModel):
    nombres: str | None = None
    apellidos: str | None = None
    telefono: str | None = None
    cargoPostulado: str | None = None
    empresaCliente: str | None = None
    formacionAcademica: list[FormacionAcademicaItem] | None = None
    idiomas: list[IdiomaItem] | None = None
    experiencia: list[ExperienciaItem] | None = None


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
    formacionAcademica: list[FormacionAcademicaItem]
    idiomas: list[IdiomaItem]
    experiencia: list[ExperienciaItem]
    fechaRegistro: date
    consentimientoTratamientoDatos: bool
    consentimientoComunicacionesComerciales: bool

    model_config = {"from_attributes": True}
