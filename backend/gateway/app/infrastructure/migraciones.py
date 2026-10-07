"""Cambios de columnas en tablas que YA existen (las "migraciones" del Gateway).

`crear_tablas` solo crea las tablas que faltan: si una tabla ya existe en Supabase, no le agrega
columnas nuevas. Por eso cada columna nueva se agrega aquí con `ADD COLUMN IF NOT EXISTS`, que se
puede ejecutar todas las veces que el Gateway arranque sin cambiar nada si la columna ya está.
(Ya están aplicadas en Supabase, proyecto "talenterp-personas", esquema "usuario".)
"""
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from shared_kernel.database import ESQUEMA_BD

logger = logging.getLogger(__name__)

_TABLA_USUARIOS = f'"{ESQUEMA_BD}".usuarios' if ESQUEMA_BD else "usuarios"

_MIGRACIONES = [
    # 001: obligar a cambiar la contraseña temporal en el primer ingreso.
    f"ALTER TABLE {_TABLA_USUARIOS} ADD COLUMN IF NOT EXISTS debe_cambiar_password boolean NOT NULL DEFAULT false",
    # 002: invalidar las sesiones abiertas cuando cambia la contraseña.
    f"ALTER TABLE {_TABLA_USUARIOS} ADD COLUMN IF NOT EXISTS password_cambiada_en timestamptz NULL",
]


async def aplicar_migraciones(engine: AsyncEngine) -> None:
    """Asegura que las columnas nuevas existan. Si falla (ej. sin permisos), solo avisa en el log."""
    if engine.dialect.name != "postgresql":
        return  # (las pruebas locales con SQLite crean la tabla completa desde el modelo)
    try:
        async with engine.begin() as conexion:
            for sentencia in _MIGRACIONES:
                await conexion.execute(text(sentencia))
    except Exception as error:  # noqa: BLE001 — que el Gateway encienda igual y se vea el motivo
        logger.warning("No se pudieron aplicar las migraciones del Gateway: %s", error)
