"""Fábrica de engine/sesión async de SQLAlchemy 2.0, reutilizada por todos
los microservicios. Cada servicio tiene su PROPIA base de datos (ver
ADR-002: "base propia por servicio"); esto solo evita repetir el mismo
boilerplate de conexión cuatro veces.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Clase base declarativa. Cada microservicio define sus propios
    modelos heredando de esta clase; como cada uno corre en su propio
    proceso/contenedor, `Base.metadata` nunca mezcla tablas de servicios
    distintos."""


def crear_engine_y_sessionmaker(
    database_url: str,
) -> tuple[object, async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(database_url, pool_pre_ping=True, future=True)
    session_local = async_sessionmaker(
        bind=engine, expire_on_commit=False, class_=AsyncSession
    )
    return engine, session_local


async def obtener_sesion(
    session_local: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncSession, None]:
    async with session_local() as sesion:
        yield sesion
