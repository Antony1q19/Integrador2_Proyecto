"""Conexión a la base de datos propia de este microservicio
(`postulantes_db`, ver ADR-002: "base propia por servicio")."""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from shared_kernel.database import crear_engine_y_sessionmaker, obtener_sesion as _obtener_sesion

from app.core.config import settings

engine, SessionLocal = crear_engine_y_sessionmaker(settings.database_url)


async def obtener_sesion() -> AsyncGenerator[AsyncSession, None]:
    async for sesion in _obtener_sesion(SessionLocal):
        yield sesion
