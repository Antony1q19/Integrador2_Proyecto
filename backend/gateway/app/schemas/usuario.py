"""Formato de los datos de la gestión de trabajadores ("schemas").

Cada clase describe un JSON: los campos que llegan del frontend (Crear,
Actualizar...) o los que se le devuelven (Respuesta).
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UsuarioCrear(BaseModel):
    """Datos para crear un trabajador. NO incluye contraseña: se le genera una temporal aleatoria."""

    nombre: str = Field(min_length=2, max_length=255)
    email: EmailStr = Field(max_length=255)
    rol: str = Field(max_length=50)  # Admin | RRHH | Supervisor (se valida en el endpoint)
    empresasVisibles: list[int] = Field(default=[], max_length=500)

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, valor: str) -> str:
        """Siempre en minúsculas: así el login no depende de cómo se escribió."""
        return valor.strip().lower()


class UsuarioActualizar(BaseModel):
    """Datos que se pueden editar. Todos opcionales: solo se cambia lo que se envíe."""

    nombre: str | None = Field(default=None, min_length=2, max_length=255)
    rol: str | None = Field(default=None, max_length=50)
    empresasVisibles: list[int] | None = Field(default=None, max_length=500)


class CambiarEstadoRequest(BaseModel):
    estado: str = Field(max_length=20)  # Activo | Suspendido | Eliminado


class CambiarPasswordPropio(BaseModel):
    passwordActual: str = Field(max_length=128)
    # La política completa (mayúscula, minúscula, número...) se valida en el endpoint.
    passwordNuevo: str = Field(min_length=8, max_length=128)


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
    # True = sigue con la contraseña temporal (aún no ingresó a cambiarla).
    debeCambiarPassword: bool = Field(default=False, validation_alias="debe_cambiar_password")


class UsuarioCreadoRespuesta(UsuarioRespuesta):
    """Igual que UsuarioRespuesta, más la contraseña temporal.

    Solo se devuelve al crear un trabajador o al restablecer su clave, para que
    el Admin pueda decírsela. Jamás aparece al listar.
    """

    passwordTemporal: str
