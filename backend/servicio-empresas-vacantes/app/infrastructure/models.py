"""Tablas de la base de datos de empresas y vacantes (empresas_vacantes_db).

Un "modelo" es una clase de Python que representa una tabla: cada atributo es
una columna y cada objeto creado es una fila.

Tablas de este servicio:
  - empresas → las empresas cliente para las que se recluta.
  - anuncios → las ofertas de trabajo (vacantes) que publica cada empresa.

Qué NO se guarda aquí: qué postulantes se presentaron a cada anuncio. Esa
relación (la "postulación") pertenece a servicio-procesos-seleccion, que se
refiere al anuncio únicamente por su `id`. Así cada servicio es dueño de lo suyo.

Solo es la TABLA: todavía no hay rutas que las usen.
"""
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared_kernel.database import Base


class Empresa(Base):
    __tablename__ = "empresas"

    # Número que sube solo (1, 2, 3...). Coincide con los ids que ya usa el
    # frontend en sus datos de ejemplo, y con la lista `empresas_visibles` de
    # cada trabajador del ERP.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    razon_social: Mapped[str] = mapped_column(String(255), nullable=False)
    # RUC = número de identificación de la empresa en Perú. No puede repetirse.
    ruc: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)

    # Persona de contacto en la empresa.
    contacto_nombre: Mapped[str] = mapped_column(String(150), nullable=True)
    contacto_email: Mapped[str] = mapped_column(String(255), nullable=True)
    contacto_telefono: Mapped[str] = mapped_column(String(30), nullable=True)

    sector: Mapped[str] = mapped_column(String(100), nullable=True)
    fecha_registro: Mapped[date] = mapped_column(Date, default=date.today)

    # Relación: una empresa tiene MUCHOS anuncios.
    anuncios: Mapped[list["Anuncio"]] = relationship(back_populates="empresa")


class Anuncio(Base):
    __tablename__ = "anuncios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ForeignKey = "llave foránea": este anuncio pertenece a la empresa con ese id.
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), nullable=False)

    cargo: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=True)
    requisitos: Mapped[str] = mapped_column(Text, nullable=True)
    numero_vacantes: Mapped[int] = mapped_column(Integer, default=1)
    salario_min: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    salario_max: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)

    # Último día para postular.
    fecha_limite: Mapped[date] = mapped_column(Date, nullable=False)

    # Abierto | En proceso | Cerrado
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Abierto")

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    empresa: Mapped[Empresa] = relationship(back_populates="anuncios")
