"""Tablas de la base de datos de procesos de selección (procesos_seleccion_db).

Un "modelo" es una clase de Python que representa una tabla: cada atributo es
una columna y cada objeto creado es una fila.

Tablas de este servicio:
  - procesos_postulacion → una fila por cada vez que un postulante se presenta a
                           un anuncio, con la etapa en la que va (Postulado,
                           En evaluación, Entrevista...).
  - historial_estados    → el registro de cada cambio de etapa de una postulación.
  - evaluaciones         → las evaluaciones por competencias que RRHH hace a un
                           postulante (puntaje y resultado Apto / No apto).

IMPORTANTE: el postulante y el anuncio viven en OTROS servicios (con otras bases
de datos). Aquí solo se guardan sus ids (`postulante_id`, `anuncio_id`) como
referencia, sin llave foránea: la base de datos no puede comprobar que existan,
esa comprobación la hará la lógica del servicio cuando se escriba.

Solo son las TABLAS: todavía no hay rutas que las usen.
"""
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared_kernel.database import Base


def _hoy_en_peru() -> date:
    """La fecha de hoy en Perú (UTC-5). Así una evaluación hecha a las 9 p.m. queda con la fecha
    del día en que se hizo, y coincide con las fechas del Dashboard (que también usan hora de Perú)."""
    return datetime.now(timezone(timedelta(hours=-5))).date()


def _nuevo_id() -> str:
    """Genera un identificador único aleatorio, ej. "3f2b8c1e-9d4a-..."."""
    return str(uuid.uuid4())


class ProcesoPostulacion(Base):
    """Una postulación: UN postulante en UN anuncio.

    El mismo postulante puede tener varias (una por anuncio), cada una en una
    etapa distinta. Por eso el estado se guarda aquí y no en el postulante.
    """

    __tablename__ = "procesos_postulacion"
    # Un postulante no puede postular dos veces al mismo anuncio.
    __table_args__ = (UniqueConstraint("postulante_id", "anuncio_id", name="uq_postulante_anuncio"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)

    # Referencias (por id) a otros servicios. index=True acelera las búsquedas.
    postulante_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)  # servicio-postulantes
    anuncio_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)  # servicio-empresas-vacantes

    # POSTULADO | EN_EVALUACION | ENTREVISTA | PRESELECCIONADO | CONTRATADO | DESCARTADO
    estado_actual: Mapped[str] = mapped_column(String(20), nullable=False, default="POSTULADO")

    fecha_postulacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relación: una postulación tiene MUCHOS cambios de estado en su historial.
    historial: Mapped[list["HistorialEstado"]] = relationship(
        back_populates="proceso", cascade="all, delete-orphan", order_by="HistorialEstado.fecha"
    )


class HistorialEstado(Base):
    """Cada fila es un cambio de etapa de una postulación (quién, cuándo y por qué)."""

    __tablename__ = "historial_estados"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)

    # A qué postulación pertenece este cambio.
    proceso_id: Mapped[str] = mapped_column(ForeignKey("procesos_postulacion.id"), nullable=False)

    # La etapa a la que se pasó (mismos valores que estado_actual).
    estado: Mapped[str] = mapped_column(String(20), nullable=False)

    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Nombre de la persona de RRHH que hizo el cambio.
    usuario_responsable: Mapped[str] = mapped_column(String(150), nullable=False)
    comentario: Mapped[str] = mapped_column(Text, nullable=True)

    proceso: Mapped[ProcesoPostulacion] = relationship(back_populates="historial")


class Evaluacion(Base):
    """Evaluación por competencias de un postulante (HU-08)."""

    __tablename__ = "evaluaciones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)

    # Referencia (por id) al postulante evaluado, que vive en servicio-postulantes.
    postulante_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    evaluador: Mapped[str] = mapped_column(String(150), nullable=False)  # quién evaluó
    fecha: Mapped[date] = mapped_column(Date, default=_hoy_en_peru)

    # Las 6 competencias, cada una calificada del 1 al 5.
    comunicacion_efectiva: Mapped[int] = mapped_column(Integer, nullable=False)
    orientacion_cliente: Mapped[int] = mapped_column(Integer, nullable=False)
    responsabilidad: Mapped[int] = mapped_column(Integer, nullable=False)
    adaptabilidad_flexibilidad: Mapped[int] = mapped_column(Integer, nullable=False)
    tolerancia_presion: Mapped[int] = mapped_column(Integer, nullable=False)
    dinamismo_energia: Mapped[int] = mapped_column(Integer, nullable=False)

    # Resultado: puntaje de 0 a 100 (promedio de las competencias) y APTO / NO_APTO
    # (APTO desde 70 puntos). Por ahora se guardan tal cual; el cálculo automático
    # se hará en la lógica del servicio.
    puntaje_total: Mapped[int] = mapped_column(Integer, nullable=False)
    resultado: Mapped[str] = mapped_column(String(10), nullable=False)

    comentarios: Mapped[str] = mapped_column(Text, nullable=True)
