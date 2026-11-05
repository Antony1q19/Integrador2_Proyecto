"""Cambios en tablas que YA existen y datos iniciales del servicio de comunicaciones.

`crear_tablas` solo crea las tablas que faltan: no agrega índices ni columnas a tablas que ya existen en la base.
Todo lo de aquí se puede ejecutar cada vez que el servicio arranca (si ya está hecho, no cambia nada).
"""
import logging

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.infrastructure.models import PlantillaRapida
from shared_kernel.database import ESQUEMA_BD

logger = logging.getLogger(__name__)

_ESQUEMA = f'"{ESQUEMA_BD}".' if ESQUEMA_BD else ""

_MIGRACIONES = [
    # 001: el webhook busca la conversación por teléfono en cada mensaje que llega.
    f"CREATE INDEX IF NOT EXISTS ix_conversaciones_telefono ON {_ESQUEMA}conversaciones (telefono)",
    # 002: los mensajes de un chat se piden siempre ordenados por fecha.
    f"CREATE INDEX IF NOT EXISTS ix_mensajes_conversacion_fecha ON {_ESQUEMA}mensajes (conversacion_id, fecha)",
    # 003: guardar por qué WhatsApp no entregó un mensaje (se muestra en el chat).
    f"ALTER TABLE {_ESQUEMA}mensajes ADD COLUMN IF NOT EXISTS error varchar(300) NULL",
]

# Las 3 plantillas rápidas con las que arranca el chat (después se editan desde el ERP).
_PLANTILLAS_RAPIDAS_INICIALES = [
    {
        "titulo": "Entrevista programada",
        "descripcion": "Invita a la entrevista con fecha y hora",
        "categoria": "entrevista",
        "contenido": "Hola {nombre}, te invitamos a una entrevista para el puesto de {puesto} el {fecha} a las {hora}. "
                     "Por favor confirma tu asistencia respondiendo este mensaje.",
    },
    {
        "titulo": "Solicitud de documentos",
        "descripcion": "Pide documentos para continuar el proceso",
        "categoria": "documentos",
        "contenido": "Hola {nombre}, para continuar con tu proceso para el puesto de {puesto} necesitamos que nos "
                     "envíes: {documentos}. Puedes responder a este mensaje con los archivos.",
    },
    {
        "titulo": "Avance del proceso",
        "descripcion": "Informa que pasó a una nueva etapa",
        "categoria": "seguimiento",
        "contenido": "Hola {nombre}, tu proceso de selección para el puesto de {puesto} avanzó a la etapa de {etapa}. "
                     "Pronto te contactaremos con más detalles.",
    },
]


async def aplicar_migraciones(engine: AsyncEngine) -> None:
    """Índices nuevos y, si la tabla está vacía, las 3 plantillas rápidas iniciales.
    Si algo falla (ej. sin permisos), solo avisa en el log: el servicio enciende igual."""
    if engine.dialect.name != "postgresql":
        return
    try:
        async with engine.begin() as conexion:
            for sentencia in _MIGRACIONES:
                await conexion.execute(text(sentencia))

        async with AsyncSession(engine) as sesion:
            if not (await sesion.execute(select(func.count()).select_from(PlantillaRapida))).scalar():
                for orden, datos in enumerate(_PLANTILLAS_RAPIDAS_INICIALES):
                    sesion.add(PlantillaRapida(orden=orden, **datos))
                await sesion.commit()
                logger.info("Plantillas rápidas iniciales creadas")
    except Exception as error:  # noqa: BLE001
        logger.warning("No se pudieron aplicar las migraciones de comunicaciones: %s", error)
