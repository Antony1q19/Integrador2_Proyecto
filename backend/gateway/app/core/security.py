"""Hashing de contraseñas. La creación/verificación de JWT y la firma
HMAC hacia los microservicios viven en `shared_kernel.security` (se
reexportan acá para que el resto del Gateway importe todo desde un solo
lugar)."""
from passlib.context import CryptContext

from shared_kernel.security import (  # noqa: F401
    crear_token_acceso,
    decodificar_token,
    firmar_peticion_gateway,
)

_contexto_password = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _contexto_password.hash(password)


def verificar_password(password: str, password_hash: str) -> bool:
    return _contexto_password.verify(password, password_hash)
