"""Formato de los datos de anuncios ("schemas").

Los nombres están en camelCase porque son los mismos que usa el frontend
(frontend/ERP/features/anuncios/types/anuncio.ts).
"""
from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, field_validator, model_validator


class AnuncioRespuesta(BaseModel):
    """Un anuncio de trabajo, con el nombre de su empresa ya incluido."""

    id: int
    empresaId: int
    empresaRazonSocial: str
    cargo: str
    descripcion: str | None = None
    requisitos: str | None = None
    numeroVacantes: int
    salarioMin: float | None = None
    salarioMax: float | None = None
    fechaLimite: date
    estado: str  # Abierto | En proceso | Cerrado
    fechaCreacion: datetime

class _AnuncioCamposComunes(BaseModel):
    """Campos y validaciones compartidas entre crear y actualizar un anuncio.
    Equivalente al `anuncioFormSchema` de Zod en el frontend, incluyendo las
    dos reglas que dependen de más de un campo (salarios y fecha)."""

    empresaId: int
    cargo: str
    descripcion: str
    requisitos: str
    numeroVacantes: int
    salarioMin: float
    salarioMax: float
    fechaLimite: date

    @field_validator("cargo")
    @classmethod
    def validar_cargo(cls, valor: str) -> str:
        if len(valor.strip()) < 3:
            raise ValueError("El cargo debe tener al menos 3 caracteres")
        if len(valor) > 100:
            raise ValueError("El cargo no puede exceder 100 caracteres")
        return valor.strip()

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, valor: str) -> str:
        if len(valor.strip()) < 20:
            raise ValueError("La descripción debe tener al menos 20 caracteres")
        return valor.strip()

    @field_validator("requisitos")
    @classmethod
    def validar_requisitos(cls, valor: str) -> str:
        if len(valor.strip()) < 10:
            raise ValueError("Los requisitos deben tener al menos 10 caracteres")
        return valor.strip()

    @field_validator("numeroVacantes")
    @classmethod
    def validar_numero_vacantes(cls, valor: int) -> int:
        if valor < 1:
            raise ValueError("Debe haber al menos 1 vacante")
        return valor

    @field_validator("salarioMin", "salarioMax")
    @classmethod
    def validar_salario_no_negativo(cls, valor: float) -> float:
        if valor < 0:
            raise ValueError("El salario no puede ser negativo")
        return valor

    @field_validator("fechaLimite")
    @classmethod
    def validar_fecha_futura(cls, valor: date) -> date:
        if valor <= date.today():
            raise ValueError("La fecha límite debe ser una fecha futura")
        return valor

    @model_validator(mode="after")
    def validar_rango_salarial(self) -> "_AnuncioCamposComunes":
        if self.salarioMax < self.salarioMin:
            raise ValueError(
                "El salario máximo debe ser mayor o igual al mínimo"
            )
        return self


class AnuncioCrear(_AnuncioCamposComunes):
    """Datos que llegan al hacer POST /anuncios (publicar uno nuevo).
    No incluye `estado`: siempre nace como 'Abierto' (lo asigna el backend,
    no el formulario)."""


class AnuncioActualizar(_AnuncioCamposComunes):
    """Datos que llegan al hacer PUT /anuncios/{id} (editar uno existente).
    El estado NO se edita aquí — se maneja aparte (ver Paso 6)."""

class AnuncioCambiarEstado(BaseModel):
    """Datos que llegan al hacer PATCH /anuncios/{id}/estado."""

    estado: Literal["Abierto", "En proceso", "Cerrado"]