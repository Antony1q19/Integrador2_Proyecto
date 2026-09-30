"""Contraseñas: cómo se guardan y cómo se comprueban (común a los servicios).

NUNCA se guarda la contraseña real. Se guarda un "hash": el resultado de
pasarla por una función matemática de un solo sentido (aquí, bcrypt).
- Guardar:    "123456"  →  "$2b$12$Kx8..."   (imposible volver atrás)
- Comprobar:  se hace el mismo cálculo con lo que escribió la persona y se
              compara con el hash guardado.
Así, aunque alguien robe la base de datos, no obtiene las contraseñas.

Está en un módulo aparte (y no en security.py) para que solo lo importen los
servicios que guardan contraseñas: el Gateway (usuarios del ERP) y
servicio-postulantes (cuentas de los postulantes). Los demás no necesitan
instalar passlib.
"""
from passlib.context import CryptContext

_contexto_password = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Convierte una contraseña en su hash (lo que se guarda en la base)."""
    return _contexto_password.hash(password)


def verificar_password(password: str, password_hash: str) -> bool:
    """¿Esta contraseña corresponde a ese hash? True = sí."""
    return _contexto_password.verify(password, password_hash)
