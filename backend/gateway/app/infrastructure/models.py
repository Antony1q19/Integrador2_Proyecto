"""Modelo de usuario del Gateway: credenciales + rol.

Es la única tabla del sistema con contraseñas. Los microservicios de
dominio (postulantes, empresas-vacantes, procesos-selección) reciben solo
`X-Usuario-Id` / `X-Usuario-Rol` ya validados, nunca el password."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from shared_kernel.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # Admin | RRHH | Supervisor (personal interno del ERP) | Postulante (ANUNCIOS)
    rol: Mapped[str] = mapped_column(String(50), nullable=False)
    # Activo | Suspendido | Eliminado (soft-delete: nunca se hace DELETE
    # real, para no perder la referencia de quién hizo qué en historiales
    # de evaluaciones/estados de otros servicios).
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="Activo")
    # IDs de Empresa (hoy mock en el Front-End, `features/empresas/data/mock_empresas.ts`)
    # que este usuario puede ver. Solo aplica a RRHH/Supervisor -un Admin
    # ve todas las empresas sin importar esta lista, ver
    # `app.domain.usuarios.puede_ver_empresa`-.
    empresas_visibles: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
