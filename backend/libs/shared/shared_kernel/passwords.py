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
import re

from passlib.context import CryptContext

_contexto_password = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash bcrypt falso pero sintácticamente válido para comparar cuando un usuario no existe
# y así mantener tiempos de respuesta equivalentes (evita ataques de temporización).
HASH_DUMMY = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"

_CLAVES_COMUNES = {
    "123456",
    "12345678",
    "123456789",
    "1234567890",
    "password",
    "password123",
    "admin123",
    "contraseña",
    "contrasena",
    "qwerty123",
    "abc12345",
    "Abc12345",
    "Password123",
}


def hash_password(password: str) -> str:
    """Convierte una contraseña en su hash (lo que se guarda en la base)."""
    return _contexto_password.hash(password)


def verificar_password(password: str, password_hash: str) -> bool:
    """¿Esta contraseña corresponde a ese hash? True = sí."""
    return _contexto_password.verify(password, password_hash)


def validar_politica_password(password: str, email: str | None = None) -> tuple[bool, str | None]:
    """Valida los requisitos de seguridad de la contraseña:
    - Longitud entre 8 y 128 caracteres.
    - Al menos una letra mayúscula.
    - Al menos una letra minúscula.
    - Al menos un número.
    - No ser una contraseña común.
    - No ser igual al correo ni a su nombre de usuario.
    Devuelve (True, None) si es válida o (False, "motivo") si no cumple.
    """
    if len(password) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres"
    if len(password) > 128:
        return False, "La contraseña no debe superar los 128 caracteres"
    if not re.search(r"[A-Z]", password):
        return False, "La contraseña debe incluir al menos una letra mayúscula"
    if not re.search(r"[a-z]", password):
        return False, "La contraseña debe incluir al menos una letra minúscula"
    if not re.search(r"[0-9]", password):
        return False, "La contraseña debe incluir al menos un número"
    if password.lower() in _CLAVES_COMUNES:
        return False, "La contraseña elegida es muy común. Por seguridad, elige otra más compleja"
    if email:
        correo_limpio = email.strip().lower()
        usuario_correo = correo_limpio.split("@")[0]
        if password.lower() == correo_limpio or (len(usuario_correo) >= 3 and password.lower() == usuario_correo):
            return False, "La contraseña no puede coincidir con tu dirección de correo"
    return True, None
