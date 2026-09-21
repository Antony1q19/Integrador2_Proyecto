"""Formato de los datos de empresas ("schemas").

Los nombres están en camelCase porque son los mismos que usa el frontend
(frontend/ERP/features/empresas/types/empresa.ts).
"""
from datetime import date

from pydantic import BaseModel


class EmpresaRespuesta(BaseModel):
    """Una empresa cliente."""

    id: int
    razonSocial: str
    ruc: str
    contactoNombre: str | None = None
    contactoEmail: str | None = None
    contactoTelefono: str | None = None
    sector: str | None = None
    fechaRegistro: date
    anunciosActivos: int  # anuncios que aún no están "Cerrado"
