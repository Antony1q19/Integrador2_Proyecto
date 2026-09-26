"""Conexión de este servicio a SU base de datos (postulantes_db).

Es una base distinta a la del Gateway: cada servicio guarda solo lo suyo.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from shared_kernel.database import (
    crear_engine_y_sessionmaker,
    crear_sessionmaker_lectura,
    obtener_sesion as _obtener_sesion,
)

from app.core.config import settings

# Se crean UNA vez al arrancar: la conexión (engine) y la fábrica de sesiones.
engine, SessionLocal = crear_engine_y_sessionmaker(settings.database_url)
# Igual, pero para las rutas que solo leen (GET): sin transacción, más rápidas.
SessionLectura = crear_sessionmaker_lectura(engine)


async def obtener_sesion() -> AsyncGenerator[AsyncSession, None]:
    """Presta una sesión de base de datos a cada petición y la cierra al final.

    Los endpoints la piden así:  sesion: AsyncSession = Depends(obtener_sesion)
    """
    async for sesion in _obtener_sesion(SessionLocal):
        yield sesion


async def obtener_sesion_lectura() -> AsyncGenerator[AsyncSession, None]:
    """Como `obtener_sesion`, pero para rutas que SOLO LEEN datos (GET). Es más rápida porque no abre
    ni cierra una transacción (2 viajes menos a la base de datos)."""
    async for sesion in _obtener_sesion(SessionLectura):
        yield sesion
