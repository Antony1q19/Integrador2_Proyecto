"""Conexión a la base de datos (PostgreSQL) — código común.

Vocabulario básico:
- "engine"   = la conexión principal a la base de datos (se crea UNA vez).
- "sesión"   = una "conversación" corta con la base: abres, haces consultas,
               guardas cambios (commit) y cierras. Cada petición HTTP usa la suya.
- "async"    = mientras la base responde, el servidor puede atender otras
               peticiones en vez de quedarse esperando.

Cada servicio tiene su PROPIA base de datos; este archivo solo evita repetir
el mismo código de conexión en cada uno.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Molde del que heredan TODAS las tablas (modelos).

    Ejemplo: `class Usuario(Base): __tablename__ = "usuarios"` le dice a
    SQLAlchemy "existe una tabla llamada usuarios".
    """


def crear_engine_y_sessionmaker(
    database_url: str,
) -> tuple[object, async_sessionmaker[AsyncSession]]:
    """Devuelve (engine, fábrica_de_sesiones) a partir de la URL de la base."""
    # pool_pre_ping=True: antes de usar una conexión guardada, comprueba que
    # siga viva (evita errores si la base se reinició).
    engine = create_async_engine(database_url, pool_pre_ping=True, future=True)
    # expire_on_commit=False: después de guardar, los objetos siguen
    # mostrando sus datos sin volver a consultar la base.
    session_local = async_sessionmaker(
        bind=engine, expire_on_commit=False, class_=AsyncSession
    )
    return engine, session_local


async def obtener_sesion(
    session_local: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncSession, None]:
    """Abre una sesión, la presta y la cierra sola al terminar."""
    async with session_local() as sesion:
        yield sesion
