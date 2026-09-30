"""Conexión a la base de datos (PostgreSQL) — código común.

Vocabulario básico:
- "engine"   = la conexión principal a la base de datos (se crea UNA vez).
- "sesión"   = una "conversación" corta con la base: abres, haces consultas,
               guardas cambios (commit) y cierras. Cada petición HTTP usa la suya.
- "async"    = mientras la base responde, el servidor puede atender otras
               peticiones en vez de quedarse esperando.

Cada servicio tiene su PROPIA base de datos (o, en Supabase, su propio "esquema");
este archivo solo evita repetir el mismo código de conexión en cada uno.

¿Qué es un "esquema"? Una carpeta dentro de la base de datos donde viven las tablas de un
servicio. Supabase da UNA base por proyecto, así que cada servicio guarda sus tablas en su
propio esquema (ej. "postulantes", "procesos_seleccion") y no se mezclan. Se indica con la
variable DB_SCHEMA del .env de cada servicio; si no se define, se usa el esquema normal
("public"), que es lo que pasa con el Postgres local de Docker.
"""
import asyncio
import logging
import os
import re
import time
from collections.abc import AsyncGenerator

from sqlalchemy import MetaData, event, exc, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

# --- Rapidez con una base de datos en la nube --------------------------------------------
# Supabase está lejos (~200 ms de ida y vuelta) y cada "viaje" a la base se paga completo, así que
# lo que más acelera es HACER MENOS VIAJES por petición:
#   1. No comprobar la conexión ("ping") en cada uso: solo si estuvo inactiva un rato.
#   2. Las lecturas (GET) usan modo "autocommit": no abren ni cierran transacción (ahorra 2 viajes).
#   3. Se abren conexiones al encender el servicio, porque abrir una nueva tarda 1-4 segundos.
# Y pocas conexiones por servicio: el "Session pooler" de Supabase da a cada servicio una conexión
# real de la base, y el plan gratuito tiene pocas (los 4 servicios comparten 2 proyectos).
CONEXIONES_BASE = 3  # conexiones que el servicio mantiene abiertas
CONEXIONES_EXTRA = 2  # y las que puede abrir de más en un pico
SEGUNDOS_INACTIVA_ANTES_DE_COMPROBAR = 20
SEGUNDOS_MAXIMOS_DE_VIDA_DE_CONEXION = 1800  # se renuevan cada 30 min (una conexión vieja ya tiene sus consultas "aprendidas": es más rápida)

# El esquema se lee de la variable de entorno (Docker Compose carga el .env del servicio).
# Tiene que conocerse ANTES de definir las tablas, por eso se lee aquí, al importar.
ESQUEMA_BD: str | None = os.environ.get("DB_SCHEMA") or None
if ESQUEMA_BD is not None and not re.fullmatch(r"[a-z_][a-z0-9_]*", ESQUEMA_BD):
    # Solo letras minúsculas, números y guion bajo (así no puede colarse SQL raro en el nombre).
    raise RuntimeError(f"DB_SCHEMA inválido: {ESQUEMA_BD!r} (usa minúsculas, números y _)")


class Base(DeclarativeBase):
    """Molde del que heredan TODAS las tablas (modelos).

    Ejemplo: `class Usuario(Base): __tablename__ = "usuarios"` le dice a
    SQLAlchemy "existe una tabla llamada usuarios".
    """

    # Todas las tablas nacen dentro del esquema del servicio (None = el esquema normal).
    metadata = MetaData(schema=ESQUEMA_BD)


def crear_engine_y_sessionmaker(
    database_url: str,
) -> tuple[object, async_sessionmaker[AsyncSession]]:
    """Devuelve (engine, fábrica_de_sesiones) a partir de la URL de la base."""
    # Antes de usar una conexión guardada se comprueba que siga viva, pero solo si estuvo inactiva
    # un rato (ver `_comprobar_solo_si_estuvo_inactiva`): hacerlo siempre costaría 1 viaje por petición.
    argumentos_de_conexion: dict = {}
    if ":6543/" in database_url:
        # Puerto 6543 = "Transaction pooler" de Supabase: no admite sentencias preparadas,
        # que asyncpg usa por defecto. Se desactivan. (Con el "Session pooler", puerto 5432,
        # no hace falta.)
        argumentos_de_conexion = {"statement_cache_size": 0, "prepared_statement_cache_size": 0}
    engine = create_async_engine(
        database_url,
        pool_size=CONEXIONES_BASE,
        max_overflow=CONEXIONES_EXTRA,
        pool_recycle=SEGUNDOS_MAXIMOS_DE_VIDA_DE_CONEXION,
        # Reutilizar siempre la conexión usada más recientemente (en vez de ir rotando): esa ya tiene
        # "aprendidas" las consultas y la primera vez de cada consulta en una conexión cuesta un viaje extra.
        pool_use_lifo=True,
        pool_timeout=20,
        future=True,
        connect_args=argumentos_de_conexion,
    )
    _comprobar_solo_si_estuvo_inactiva(engine)
    # expire_on_commit=False: después de guardar, los objetos siguen
    # mostrando sus datos sin volver a consultar la base.
    session_local = async_sessionmaker(
        bind=engine, expire_on_commit=False, class_=AsyncSession
    )
    return engine, session_local


def _comprobar_solo_si_estuvo_inactiva(engine: AsyncEngine) -> None:
    """Reemplaza al "pool_pre_ping" de SQLAlchemy (que hace un viaje a la base en CADA petición)."""
    pool = engine.sync_engine.pool
    dialecto = engine.sync_engine.dialect

    @event.listens_for(pool, "checkin")
    def _al_devolver(dbapi_conn, registro):
        registro.info["ultimo_uso"] = time.monotonic()

    @event.listens_for(pool, "checkout")
    def _al_prestar(dbapi_conn, registro, proxy):
        inactiva = time.monotonic() - registro.info.get("ultimo_uso", time.monotonic())
        if inactiva > SEGUNDOS_INACTIVA_ANTES_DE_COMPROBAR:
            try:
                sigue_viva = dialecto.do_ping(dbapi_conn)
            except Exception:  # noqa: BLE001 — cualquier fallo significa "conexión caída"
                sigue_viva = False
            if not sigue_viva:
                # SQLAlchemy descarta esta conexión y abre otra sin que la petición se entere.
                raise exc.DisconnectionError("Conexión inactiva caída")


def crear_sessionmaker_lectura(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Fábrica de sesiones para rutas que SOLO LEEN (GET): sin transacción, 2 viajes menos a la base.

    Comparte las conexiones con las sesiones normales (mismo pool). No usar para guardar datos:
    en este modo cada sentencia se confirma sola y no hay "deshacer" si algo falla a mitad.
    """
    return async_sessionmaker(
        bind=engine.execution_options(isolation_level="AUTOCOMMIT"),
        expire_on_commit=False,
        class_=AsyncSession,
    )


async def calentar_conexiones(engine: AsyncEngine, cantidad: int = CONEXIONES_BASE) -> None:
    """Abre `cantidad` conexiones a la vez al encender el servicio, para que la primera persona
    que entre no espere los 1-4 segundos que tarda abrir una. Si la base no responde, solo avisa."""

    async def abrir() -> None:
        async with engine.connect() as conexion:
            await conexion.execute(text("select 1"))
            await asyncio.sleep(0.3)  # se mantiene abierta un momento para que cada tarea use una distinta

    try:
        await asyncio.gather(*(abrir() for _ in range(cantidad)))
        logger.info("Conexiones a la base de datos calentadas (%s)", cantidad)
    except Exception as error:  # noqa: BLE001
        logger.warning("No se pudieron calentar las conexiones a la base de datos: %s", error)


async def crear_tablas(engine: AsyncEngine) -> None:
    """Crea el esquema del servicio (si se usa uno) y todas las tablas que falten.

    "Que falten": no modifica tablas que ya existen (para eso hacen falta migraciones).
    """
    async with engine.begin() as conn:
        if ESQUEMA_BD is not None:
            await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{ESQUEMA_BD}"'))
        await conn.run_sync(Base.metadata.create_all)


async def obtener_sesion(
    session_local: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncSession, None]:
    """Abre una sesión, la presta y la cierra sola al terminar."""
    async with session_local() as sesion:
        yield sesion
