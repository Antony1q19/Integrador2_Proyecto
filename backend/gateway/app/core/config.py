"""Configuración del Gateway.

Además de lo común (BaseServiceSettings), el Gateway necesita: las URLs
internas de cada microservicio (para el proxy), el tiempo de expiración
del JWT que él mismo emite, y los orígenes CORS permitidos (los dos
Front-End: ERP y ANUNCIOS).
"""
from pydantic import Field

from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    jwt_minutos_expiracion: int = Field(default=60, alias="JWT_MINUTOS_EXPIRACION")

    url_servicio_postulantes: str = Field(alias="URL_SERVICIO_POSTULANTES")
    # servicio-empresas-vacantes y servicio-procesos-seleccion todavía no
    # existen (se recortó el alcance a solo postulantes); cuando se creen
    # de nuevo, se agregan acá y en `_MAPA_SERVICIOS` (proxy.py).
    url_servicio_empresas_vacantes: str | None = Field(default=None, alias="URL_SERVICIO_EMPRESAS_VACANTES")
    url_servicio_procesos_seleccion: str | None = Field(default=None, alias="URL_SERVICIO_PROCESOS_SELECCION")

    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:3001", alias="CORS_ORIGINS"
    )

    @property
    def lista_cors_origins(self) -> list[str]:
        return [origen.strip() for origen in self.cors_origins.split(",") if origen.strip()]


settings = Settings()  # type: ignore[call-arg]
