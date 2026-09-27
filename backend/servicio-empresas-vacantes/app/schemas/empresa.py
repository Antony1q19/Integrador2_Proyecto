"""Formato de los datos de empresas ("schemas").

Los nombres están en camelCase porque son los mismos que usa el frontend
(frontend/ERP/features/empresas/types/empresa.ts).
"""
import re
from datetime import date

from pydantic import BaseModel, field_validator


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

class _EmpresaCamposComunes(BaseModel):
    """Campos y validaciones compartidas entre crear y actualizar una empresa.
    Equivalente al `anuncioFormSchema` de Zod en el frontend: aquí viven las
    mismas reglas (razón social, RUC, email, teléfono)."""

    razonSocial: str
    ruc: str
    contactoNombre: str
    contactoEmail: str
    contactoTelefono: str
    sector: str | None = None

    @field_validator("razonSocial")
    @classmethod
    def validar_razon_social(cls, valor: str) -> str:
        if len(valor.strip()) < 3:
            raise ValueError("La razón social debe tener al menos 3 caracteres")
        return valor.strip()

    @field_validator("ruc")
    @classmethod
    def validar_ruc(cls, valor: str) -> str:
        if not re.fullmatch(r"\d{11}", valor):
            raise ValueError("El RUC debe tener exactamente 11 dígitos numéricos")
        return valor

    @field_validator("contactoEmail")
    @classmethod
    def validar_email(cls, valor: str) -> str:
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", valor):
            raise ValueError("Ingresa un email válido (ej: nombre@empresa.com)")
        return valor

    @field_validator("contactoTelefono")
    @classmethod
    def validar_telefono(cls, valor: str) -> str:
        solo_numeros = re.sub(r"\D", "", valor)
        if len(solo_numeros) < 9:
            raise ValueError("El teléfono debe tener al menos 9 dígitos")
        return valor


class EmpresaCrear(_EmpresaCamposComunes):
    """Datos que llegan al hacer POST /empresas (registrar una nueva)."""


class EmpresaActualizar(_EmpresaCamposComunes):
    """Datos que llegan al hacer PUT /empresas/{id} (editar una existente).
    Mismas reglas que al crear; el formulario de edición del frontend envía
    el formulario completo, no solo los campos que cambiaron."""