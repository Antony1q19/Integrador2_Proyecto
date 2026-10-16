"""Tablas de la base de datos de comunicaciones (schema "comunicaciones").

Tres tablas:
  - conversaciones     → un hilo de chat con un postulante.
  - mensajes           → cada mensaje enviado/recibido en esa conversación.
  - plantillas_rapidas → los textos del botón "Plantillas" del chat (editables desde el ERP).

Solo el ERP maneja las conversaciones: se crean cuando un RRHH inicia el chat
con un postulante ya existente.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared_kernel.database import Base


def _nuevo_id() -> str:
    return str(uuid.uuid4())


class Conversacion(Base):
    """Un hilo de chat entre un RRHH del ERP y un postulante."""

    __tablename__ = "conversaciones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)
    postulante_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    # Nombre y teléfono del postulante (copiados al crear la conversación).
    # Se guardan aquí para no tener que llamar al servicio-postulantes en cada listado.
    nombre: Mapped[str] = mapped_column(String(300), nullable=False)
    telefono: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    # Última actividad (para ordenar la lista de conversaciones por más reciente).
    ultima_actividad: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    # Cuántos mensajes sin leer tiene el RRHH.
    no_leidos: Mapped[int] = mapped_column(default=0, nullable=False)
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    mensajes: Mapped[list["Mensaje"]] = relationship(
        back_populates="conversacion",
        cascade="all, delete-orphan",
        order_by="Mensaje.fecha",
    )


class Mensaje(Base):
    """Un mensaje individual dentro de una conversación."""

    __tablename__ = "mensajes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)
    conversacion_id: Mapped[str] = mapped_column(
        ForeignKey("conversaciones.id"), index=True, nullable=False
    )

    # "yo" = enviado por el RRHH desde el ERP.
    # "contacto" = enviado por el postulante desde su WhatsApp.
    remitente: Mapped[str] = mapped_column(String(20), nullable=False)

    texto: Mapped[str] = mapped_column(Text, nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    # enviado | entregado | leido | fallido
    estado: Mapped[str] = mapped_column(String(20), default="enviado", nullable=False)

    # wamid que devuelve Meta al aceptar el envío (para cruzar estados después).
    wamid: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)

    # Si WhatsApp no lo entregó, por qué (ej. "Pasaron más de 24 horas..."): se muestra en el chat.
    error: Mapped[str | None] = mapped_column(String(300), nullable=True)

    conversacion: Mapped[Conversacion] = relationship(back_populates="mensajes")

class PlantillaRapida(Base):
    """Texto listo para insertar en el chat (botón "Plantillas"). No es una plantilla de Meta: se
    envía como mensaje normal, así que solo llega si el postulante escribió en las últimas 24 h.
    Variables: {nombre} se completa solo; {puesto}, {fecha}... los escribe quien envía."""

    __tablename__ = "plantillas_rapidas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)
    titulo: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    categoria: Mapped[str] = mapped_column(String(30), nullable=False, default="general")
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    orden: Mapped[int] = mapped_column(default=0, nullable=False)
    actualizada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
