"""Conexión del Gateway a SU base de datos (usuario_db).

Ahí solo hay una tabla: `usuarios` (los trabajadores del ERP y sus
contraseñas). Es la base donde se guardan las contraseñas del ERP; los
microservicios nunca las ven. (Las cuentas de los postulantes viven aparte, en
la base de servicio-postulantes.)
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from shared_kernel.database import crear_engine_y_sessionmaker, obtener_sesion as _obtener_sesion

from app.core.config import settings

# Se crean UNA vez al arrancar: la conexión (engine) y la fábrica de sesiones.
engine, SessionLocal = crear_engine_y_sessionmaker(settings.database_url)


async def obtener_sesion() -> AsyncGenerator[AsyncSession, None]:
    """Presta una sesión de base de datos a cada petición y la cierra al final.

    Los endpoints la piden así:  sesion: AsyncSession = Depends(obtener_sesion)
    """
    async for sesion in _obtener_sesion(SessionLocal):
        yield sesion
