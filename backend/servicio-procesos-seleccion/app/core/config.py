"""Configuración de este microservicio (valores del archivo .env).

Usa lo común (base de datos, claves secretas, logs) de `BaseServiceSettings` y agrega la
dirección de servicio-empresas-vacantes.
"""
from pydantic import Field

from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    # Dirección INTERNA de servicio-empresas-vacantes (solo existe dentro de la red de
    # Docker). Se usa para saber qué anuncios (y por tanto qué empresas) puede ver cada
    # usuario. Si falta, RRHH/Supervisor no podrán consultar postulaciones (error 503).
    url_servicio_empresas_vacantes: str | None = Field(default=None, alias="URL_SERVICIO_EMPRESAS_VACANTES")


# Se crea UNA sola vez; el resto del código usa `settings`.
settings = Settings()  # type: ignore[call-arg]
