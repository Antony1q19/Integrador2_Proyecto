"""Conexión de este servicio a su base de datos (schema comunicaciones)."""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from shared_kernel.database import (
    crear_engine_y_sessionmaker,
    crear_sessionmaker_lectura,
    obtener_sesion as _obtener_sesion,
)

from app.core.config import settings

engine, SessionLocal = crear_engine_y_sessionmaker(settings.database_url)
SessionLectura = crear_sessionmaker_lectura(engine)


async def obtener_sesion() -> AsyncGenerator[AsyncSession, None]:
    async for sesion in _obtener_sesion(SessionLocal):
        yield sesion


async def obtener_sesion_lectura() -> AsyncGenerator[AsyncSession, None]:
    async for sesion in _obtener_sesion(SessionLectura):
        yield sesion