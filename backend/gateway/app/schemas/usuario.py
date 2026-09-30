"""Formato de los datos de la gestión de trabajadores ("schemas").

Cada clase describe un JSON: los campos que llegan del frontend (Crear,
Actualizar...) o los que se le devuelven (Respuesta).
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioCrear(BaseModel):
    """Datos para crear un trabajador. NO incluye contraseña: se le asigna 123456."""

    nombre: str
    email: EmailStr
    rol: str  # Admin | RRHH | Supervisor (se valida en el endpoint)
    empresasVisibles: list[int] = []


class UsuarioActualizar(BaseModel):
    """Datos que se pueden editar. Todos opcionales: solo se cambia lo que se envíe."""

    nombre: str | None = None
    rol: str | None = None
    empresasVisibles: list[int] | None = None


class CambiarEstadoRequest(BaseModel):
    estado: str  # Activo | Suspendido | Eliminado


class CambiarPasswordPropio(BaseModel):
    passwordActual: str
    passwordNuevo: str = Field(min_length=6)


class UsuarioRespuesta(BaseModel):
    """Cómo se le devuelve un usuario al frontend (NUNCA incluye la contraseña)."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    nombre: str
    email: str
    rol: str
    estado: str
    # La base de datos usa nombres_con_guion_bajo; el frontend usa camelCase.
    # validation_alias dice: "lee este campo desde la columna con este otro nombre".
    empresasVisibles: list[int] = Field(validation_alias="empresas_visibles")
    fechaCreacion: datetime = Field(validation_alias="fecha_creacion")


class UsuarioCreadoRespuesta(UsuarioRespuesta):
    """Igual que UsuarioRespuesta, más la contraseña temporal.

    Solo se devuelve al crear un trabajador o al restablecer su clave, para que
    el Admin pueda decírsela. Jamás aparece al listar.
    """

    passwordTemporal: str
