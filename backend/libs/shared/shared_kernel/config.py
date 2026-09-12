"""Configuración base común a todos los microservicios.

Cada microservicio define su propia clase `Settings` (en su `core/config.py`)
heredando de `BaseServiceSettings`. Mantener los campos comunes en un solo
lugar evita que cada servicio reinvente cómo lee variables de entorno y
asegura que todos hablen el mismo idioma con el Gateway (mismo secreto JWT,
mismo secreto de firma).
"""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    entorno: str = Field(default="desarrollo", alias="ENTORNO")
    database_url: str = Field(alias="DATABASE_URL")

    # El Gateway es el único que EMITE JWT (ver ADR-002: "centraliza
    # autenticación"). Cada microservicio solo los VERIFICA, por eso
    # comparte el mismo secreto pero nunca llama a `crear_token_acceso`.
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_algoritmo: str = Field(default="HS256", alias="JWT_ALGORITMO")

    # HMAC que el Gateway agrega a cada petición reenviada, para que el
    # microservicio pueda rechazar peticiones que no hayan pasado por él.
    gateway_shared_secret: str = Field(alias="GATEWAY_SHARED_SECRET")

    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
