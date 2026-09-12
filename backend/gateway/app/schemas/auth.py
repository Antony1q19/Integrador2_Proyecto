"""DTOs de autenticación. Reflejan 1:1 los mismos roles que hoy usa el
mock del ERP (`features/login/sesion/mockAuth.ts`: Admin | RRHH |
Supervisor) más el rol "Postulante" para las cuentas creadas desde
ANUNCIOS."""
from pydantic import BaseModel, EmailStr, Field


class CredencialesLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UsuarioRegistro(BaseModel):
    email: EmailStr
    nombre: str
    password: str = Field(min_length=6)


class TokenRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
    nombre: str
    email: str
    # IDs de Empresa que puede ver (vacío + rol!="Admin" = no ve ninguna
    # todavía); el Front-End los usa para filtrar /empresas. Un "Postulante"
    # (cuenta de ANUNCIOS) siempre la trae vacía, no aplica en su caso.
    empresasVisibles: list[int] = []
