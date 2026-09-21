"""Conexión de este servicio a SU base de datos (procesos_seleccion_db).

Es una base distinta a la de los demás servicios: cada uno guarda solo lo suyo.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from shared_kernel.database import crear_engine_y_sessionmaker, obtener_sesion as _obtener_sesion

from app.core.config import settings

# Se crean UNA vez al arrancar: la conexión (engine) y la fábrica de sesiones.
engine, SessionLocal = crear_engine_y_sessionmaker(settings.database_url)


async def obtener_sesion() -> AsyncGenerator[AsyncSession, None]:
    """Presta una sesión de base de datos a cada petición y la cierra al final.

    Los endpoints (cuando existan) la pedirán así:
        sesion: AsyncSession = Depends(obtener_sesion)
    """
    async for sesion in _obtener_sesion(SessionLocal):
        yield sesion
