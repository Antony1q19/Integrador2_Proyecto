"""Modelos SQLAlchemy de servicio-postulantes.

Este servicio es dueño de la IDENTIDAD del postulante: sus datos
personales, documentos y consentimientos (Ley N.º 29733). NO conoce
estados de pipeline ni evaluaciones -eso vive en servicio-procesos-
seleccion- ni anuncios/empresas -eso vive en servicio-empresas-vacantes-.
La relación entre dominios se hace por id (String) desde el otro
servicio, nunca por FK cruzada.
"""
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared_kernel.database import Base


def _nuevo_id() -> str:
    return str(uuid.uuid4())


class Postulante(Base):
    __tablename__ = "postulantes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)

    # Datos personales (equivalente a `DatosPersonales` en el Front-End)
    nombres: Mapped[str] = mapped_column(String(150), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(150), nullable=False)
    documento_tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    documento_numero: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    telefono: Mapped[str] = mapped_column(String(30), nullable=True)
    cargo_postulado: Mapped[str] = mapped_column(String(150), nullable=True)
    empresa_cliente: Mapped[str] = mapped_column(String(150), nullable=True)

    # Estructuras variables (formación, idiomas, experiencia): se guardan
    # como JSON para no explotar en tablas adicionales en esta etapa; si
    # el equipo necesita consultarlas/filtrarlas en SQL más adelante, se
    # normalizan en tablas propias sin tocar el resto del servicio.
    formacion_academica: Mapped[list] = mapped_column(JSON, default=list)
    idiomas: Mapped[list] = mapped_column(JSON, default=list)
    experiencia: Mapped[list] = mapped_column(JSON, default=list)

    # Consentimientos (Ley N.º 29733): el tratamiento de datos es
    # obligatorio para crear la cuenta; las comunicaciones comerciales son
    # opcionales (ver `app.domain.postulantes.validar_consentimiento_obligatorio`).
    consentimiento_tratamiento_datos: Mapped[bool] = mapped_column(Boolean, default=False)
    consentimiento_comunicaciones_comerciales: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha_aceptacion_consentimiento: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    fecha_registro: Mapped[date] = mapped_column(Date, default=date.today)

    documentos: Mapped[list["Documento"]] = relationship(
        back_populates="postulante", cascade="all, delete-orphan"
    )


class Documento(Base):
    __tablename__ = "documentos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)
    postulante_id: Mapped[str] = mapped_column(ForeignKey("postulantes.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)  # CV, DNI, certificado, etc.
    nombre_archivo: Mapped[str] = mapped_column(String(255), nullable=False)
    referencia_almacenamiento: Mapped[str] = mapped_column(String(500), nullable=False)
    fecha_subida: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    postulante: Mapped[Postulante] = relationship(back_populates="documentos")
