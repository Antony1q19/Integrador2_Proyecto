"""Formato de los datos del login del ERP ("schemas").

Un schema describe qué campos debe traer un JSON. Si falta uno, o tiene el
tipo equivocado (ej. un correo mal escrito), FastAPI responde error 422
automáticamente, sin que tengamos que escribir esa validación a mano.
"""
from pydantic import BaseModel, EmailStr, Field


class CredencialesLogin(BaseModel):
    """Lo que envía el navegador para iniciar sesión."""

    email: EmailStr
    password: str = Field(min_length=6)


class TokenRespuesta(BaseModel):
    """Lo que responde el login: el token y datos básicos para mostrar en pantalla."""

    access_token: str
    token_type: str = "bearer"
    rol: str
    nombre: str
    email: str
    # Ids de las empresas que puede ver. El ERP los usa para filtrar /empresas.
    # (Vacío para un Admin: ve todas.)
    empresasVisibles: list[int] = []
