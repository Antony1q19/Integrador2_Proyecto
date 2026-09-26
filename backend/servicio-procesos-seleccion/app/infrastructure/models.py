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
  - entrevistas          → las entrevistas programadas de una postulación (cuándo,
                           dónde, con quién y cómo salió).
  - contrataciones       → cuando una postulación termina en "Contratado": fecha de
                           ingreso, cargo final, tipo de contrato y salario.
  - seguimientos_postingreso → los controles después de que la persona ingresa
                           (a los 30, 60 y 90 días): si se adaptó, observaciones.

IMPORTANTE: el postulante y el anuncio viven en OTROS servicios (con otras bases
de datos). Aquí solo se guardan sus ids (`postulante_id`, `anuncio_id`) como
referencia, sin llave foránea: la base de datos no puede comprobar que existan,
esa comprobación la hará la lógica del servicio cuando se escriba.

"""
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
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


class Entrevista(Base):
    """Una entrevista de una postulación (un postulante puede tener varias, incluso para el mismo anuncio)."""

    __tablename__ = "entrevistas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)

    # A qué postulación (postulante + anuncio) pertenece.
    proceso_id: Mapped[str] = mapped_column(ForeignKey("procesos_postulacion.id"), nullable=False, index=True)

    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duracion_min: Mapped[int] = mapped_column(Integer, nullable=False, default=30)

    # Presencial | Virtual | Telefónica
    modalidad: Mapped[str] = mapped_column(String(20), nullable=False)
    # Dirección (si es presencial) o enlace de la videollamada (si es virtual).
    lugar_o_enlace: Mapped[str] = mapped_column(String(500), nullable=True)
    entrevistador: Mapped[str] = mapped_column(String(150), nullable=False)

    # Programada | Realizada | Cancelada | No asistió
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Programada")
    # Solo cuando ya se realizó: Aprobada | No aprobada | Pendiente de decisión
    resultado: Mapped[str] = mapped_column(String(30), nullable=True)
    notas: Mapped[str] = mapped_column(Text, nullable=True)

    creado_por: Mapped[str] = mapped_column(String(150), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    proceso: Mapped[ProcesoPostulacion] = relationship()


class Contratacion(Base):
    """Los datos de la contratación de una postulación que terminó en "Contratado" (una sola por postulación)."""

    __tablename__ = "contrataciones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)
    # unique=True → una postulación solo puede tener UNA contratación.
    proceso_id: Mapped[str] = mapped_column(
        ForeignKey("procesos_postulacion.id"), nullable=False, unique=True, index=True
    )

    fecha_ingreso: Mapped[date] = mapped_column(Date, nullable=False)
    cargo: Mapped[str] = mapped_column(String(150), nullable=False)  # cargo final (puede diferir del anuncio)
    # Plazo fijo | Plazo indeterminado | Locación de servicios | Prácticas | Otro
    tipo_contrato: Mapped[str] = mapped_column(String(30), nullable=False)
    salario: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    moneda: Mapped[str] = mapped_column(String(3), nullable=False, default="PEN")

    # Por ingresar | Activo | Finalizado | Cancelado
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Por ingresar")
    observaciones: Mapped[str] = mapped_column(Text, nullable=True)

    creado_por: Mapped[str] = mapped_column(String(150), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    proceso: Mapped[ProcesoPostulacion] = relationship()
    seguimientos: Mapped[list["SeguimientoPostingreso"]] = relationship(
        back_populates="contratacion",
        cascade="all, delete-orphan",
        order_by="SeguimientoPostingreso.fecha_programada",
    )


class SeguimientoPostingreso(Base):
    """Un control después del ingreso (a los 30, 60 o 90 días, o uno adicional)."""

    __tablename__ = "seguimientos_postingreso"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)
    contratacion_id: Mapped[str] = mapped_column(ForeignKey("contrataciones.id"), nullable=False, index=True)

    hito_dias: Mapped[int] = mapped_column(Integer, nullable=False)  # 30, 60, 90...
    fecha_programada: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    fecha_realizada: Mapped[date] = mapped_column(Date, nullable=True)

    # Pendiente | Realizado | Omitido
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Pendiente")
    # Solo al realizarlo: Satisfactorio | Con observaciones | Insatisfactorio
    valoracion: Mapped[str] = mapped_column(String(20), nullable=True)
    observaciones: Mapped[str] = mapped_column(Text, nullable=True)
    realizado_por: Mapped[str] = mapped_column(String(150), nullable=True)

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    contratacion: Mapped[Contratacion] = relationship(back_populates="seguimientos")
