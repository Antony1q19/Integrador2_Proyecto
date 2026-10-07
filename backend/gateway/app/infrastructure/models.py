"""Tabla `usuarios` del Gateway.

Un "modelo" es una clase de Python que representa una tabla de la base de
datos: cada atributo es una columna y cada objeto creado es una fila.

Esta es la ÚNICA tabla del sistema con contraseñas. Los microservicios solo
reciben el id y el rol de quien hace la petición, nunca su contraseña.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, String, false
from sqlalchemy.orm import Mapped, mapped_column

from shared_kernel.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"  # nombre de la tabla en PostgreSQL

    # Identificador único. Se genera solo (texto aleatorio tipo "3f2b8c1e-...").
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Correo: es el "usuario" con el que se inicia sesión. No puede repetirse (unique).
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    nombre: Mapped[str] = mapped_column(String(255), nullable=False)

    # Contraseña convertida en hash (nunca la contraseña real). Ver core/security.py.
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Rol: Admin | RRHH | Supervisor. Solo trabajadores del ERP (los postulantes tienen su
    # propia tabla de cuentas en servicio-postulantes).
    rol: Mapped[str] = mapped_column(String(50), nullable=False)

    # Estado de la cuenta: Activo | Suspendido | Eliminado.
    # "Eliminado" es un borrado LÓGICO: la fila sigue existiendo en la base (para
    # conservar el historial de quién hizo qué), pero la cuenta ya no puede
    # entrar ni aparece en el listado.
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Activo")

    # Lista de ids de las empresas que este trabajador puede ver, ej. [1, 3].
    # Un Admin ve todas sin importar esta lista (ver domain/usuarios.py).
    # (Hoy los ids son los de las empresas de prueba del frontend.)
    empresas_visibles: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # True mientras la persona siga con la contraseña TEMPORAL que le generó un Admin (al crearla o
    # al restablecerla). Mientras sea True, su sesión solo sirve para cambiar su propia contraseña.
    # (Columna agregada después: la crea app/infrastructure/migraciones.py al encender.)
    debe_cambiar_password: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )

    # Cuándo cambió su contraseña por última vez (o se la restableció un Admin). Los tokens emitidos
    # ANTES de esa fecha dejan de valer (ver api/deps.py). (La crea app/infrastructure/migraciones.py.)
    password_cambiada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
