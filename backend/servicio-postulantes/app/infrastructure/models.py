"""Tablas de la base de datos de postulantes (postulantes_db).

Un "modelo" es una clase de Python que representa una tabla: cada atributo es
una columna y cada objeto creado es una fila.

Tablas de este servicio:
  - postulantes → los datos personales de cada postulante.
  - documentos  → sus archivos (CV, DNI...).
  - usuarios    → sus CUENTAS DE ACCESO a la app ANUNCIOS (correo + contraseña).
                  Son distintas e independientes de los usuarios del ERP, que
                  viven en otra base de datos (usuario_db, en el Gateway).

Este servicio solo guarda la IDENTIDAD del postulante. Las evaluaciones, el
estado en el proceso de selección y los anuncios NO se guardan aquí: pertenecen
a otros servicios, que se refieren al postulante únicamente por su `id`.
"""
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared_kernel.database import Base


def _nuevo_id() -> str:
    """Genera un identificador único aleatorio, ej. "3f2b8c1e-9d4a-..."."""
    return str(uuid.uuid4())


class Postulante(Base):
    __tablename__ = "postulantes"  # nombre de la tabla en PostgreSQL

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)

    # --- Datos personales ---------------------------------------------------
    nombres: Mapped[str] = mapped_column(String(150), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(150), nullable=False)
    documento_tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # DNI, CE, PASAPORTE
    # unique=True → no pueden existir dos postulantes con el mismo documento ni el mismo correo.
    documento_numero: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    telefono: Mapped[str] = mapped_column(String(30), nullable=True)
    cargo_postulado: Mapped[str] = mapped_column(String(150), nullable=True)
    empresa_cliente: Mapped[str] = mapped_column(String(150), nullable=True)
    fecha_nacimiento: Mapped[date] = mapped_column(Date, nullable=True)
    direccion: Mapped[str] = mapped_column(String(255), nullable=True)
    # Cómo llegó a nosotros (LinkedIn, Referido, Bolsa de trabajo...).
    fuente_reclutamiento: Mapped[str] = mapped_column(String(100), nullable=True)

    # --- Listas guardadas como JSON -----------------------------------------
    # Formación, idiomas y experiencia son listas de tamaño variable. Se guardan
    # como JSON dentro de una sola columna para no crear tablas extra; si algún
    # día hay que buscar por ellas en SQL, se pasan a tablas propias.
    formacion_academica: Mapped[list] = mapped_column(JSON, default=list)
    idiomas: Mapped[list] = mapped_column(JSON, default=list)
    experiencia: Mapped[list] = mapped_column(JSON, default=list)

    # --- Consentimientos (Ley N.º 29733) -------------------------------------
    # El de tratamiento de datos es OBLIGATORIO (se valida en domain/postulantes.py);
    # el de comunicaciones comerciales es opcional.
    consentimiento_tratamiento_datos: Mapped[bool] = mapped_column(Boolean, default=False)
    consentimiento_comunicaciones_comerciales: Mapped[bool] = mapped_column(Boolean, default=False)
    # Vacía si nunca aceptó (por ejemplo, un postulante registrado a mano por RRHH).
    fecha_aceptacion_consentimiento: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    fecha_registro: Mapped[date] = mapped_column(Date, default=date.today)

    # Relaciones: un postulante tiene MUCHOS documentos y, como máximo, UNA
    # cuenta de acceso. "delete-orphan" significa que si se borra el postulante,
    # sus documentos y su cuenta se borran con él.
    documentos: Mapped[list["Documento"]] = relationship(
        back_populates="postulante", cascade="all, delete-orphan"
    )
    usuario: Mapped["Usuario | None"] = relationship(
        back_populates="postulante", cascade="all, delete-orphan", uselist=False
    )


class Documento(Base):
    __tablename__ = "documentos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)
    # ForeignKey = "llave foránea": este documento pertenece al postulante con ese id.
    postulante_id: Mapped[str] = mapped_column(ForeignKey("postulantes.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)  # CV, DNI, certificado, etc.
    nombre_archivo: Mapped[str] = mapped_column(String(255), nullable=False)
    # Dónde está guardado el archivo (el archivo en sí NO se guarda en la base de datos).
    # Con Cloudinary, aquí va la URL https del archivo.
    referencia_almacenamiento: Mapped[str] = mapped_column(String(500), nullable=False)

    # Datos de Cloudinary (vacíos en los documentos que no se subieron ahí, como el
    # de prueba). Se guardan para poder BORRAR el archivo de Cloudinary después.
    public_id: Mapped[str] = mapped_column(String(255), nullable=True)
    tipo_recurso: Mapped[str] = mapped_column(String(20), nullable=True)  # "image" o "raw"
    tamano_bytes: Mapped[int] = mapped_column(Integer, nullable=True)

    fecha_subida: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    postulante: Mapped[Postulante] = relationship(back_populates="documentos")


class Usuario(Base):
    """Cuenta de acceso de un postulante (la que usará en la app ANUNCIOS).

    Solo es la TABLA: todavía no hay rutas de login ni de registro que la usen.
    """

    __tablename__ = "usuarios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_nuevo_id)

    # A qué postulante pertenece esta cuenta. unique=True → una sola cuenta por postulante.
    postulante_id: Mapped[str] = mapped_column(
        ForeignKey("postulantes.id"), unique=True, nullable=False
    )

    # Correo con el que inicia sesión. No puede repetirse.
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    # Contraseña convertida en hash (nunca la contraseña real).
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Activo | Suspendido | Eliminado (igual que en los usuarios del ERP).
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Activo")

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    postulante: Mapped[Postulante] = relationship(back_populates="usuario")
