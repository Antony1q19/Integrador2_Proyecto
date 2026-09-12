"""DTOs de gestión de usuarios internos del ERP (pantalla /perfil ->
"Gestión de Trabajadores")."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioCrear(BaseModel):
    nombre: str
    email: EmailStr
    rol: str  # Admin | RRHH | Supervisor (se valida en el endpoint)
    empresasVisibles: list[int] = []


class UsuarioActualizar(BaseModel):
    nombre: str | None = None
    rol: str | None = None
    empresasVisibles: list[int] | None = None


class CambiarEstadoRequest(BaseModel):
    estado: str  # Activo | Suspendido | Eliminado


class CambiarPasswordPropio(BaseModel):
    passwordActual: str
    passwordNuevo: str = Field(min_length=6)


class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    nombre: str
    email: str
    rol: str
    estado: str
    empresasVisibles: list[int] = Field(validation_alias="empresas_visibles")
    fechaCreacion: datetime = Field(validation_alias="fecha_creacion")


class UsuarioCreadoRespuesta(UsuarioRespuesta):
    # Solo viaja UNA vez, en la respuesta de creación (o de reset), para
    # que el Admin pueda copiarla y pasársela al trabajador. Nunca se
    # devuelve en GET /usuarios.
    passwordTemporal: str
