"""Datos de prueba del Gateway (base de datos `usuario_db`).

Solo se ejecuta en modo "desarrollo", al encender el servicio (ver main.py).
Es seguro ejecutarlo muchas veces: lo que ya existe se salta, nunca se duplica.
"""
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.infrastructure.models import Usuario
from shared_kernel.datos_prueba import PASSWORD_PRUEBA

# Una cuenta por cada rol del ERP. Con estas se puede entrar al sistema sin
# registrar nada a mano. Contraseña de todas: 123456.
_USUARIOS_PRUEBA = [
    {"email": "admin@test.com", "nombre": "Leonardo Morales", "rol": "Admin"},
    {"email": "rrhh@test.com", "nombre": "Xavier Ibarra", "rol": "RRHH"},
    {"email": "super@test.com", "nombre": "Marco Alanya", "rol": "Supervisor"},
]


async def sembrar_datos_de_prueba() -> None:
    """Crea los usuarios de prueba que todavía no existan."""
    async with SessionLocal() as sesion:
        for datos in _USUARIOS_PRUEBA:
            busqueda = await sesion.execute(select(Usuario).where(Usuario.email == datos["email"]))
            if busqueda.scalar_one_or_none() is not None:
                continue  # ya existe, pasamos a la siguiente
            sesion.add(
                Usuario(
                    email=datos["email"],
                    nombre=datos["nombre"],
                    password_hash=hash_password(PASSWORD_PRUEBA),
                    rol=datos["rol"],
                )
            )
        await sesion.commit()
