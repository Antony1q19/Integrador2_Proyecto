"""Configuración del Gateway (valores que vienen del archivo gateway/.env).

Hereda lo común (base de datos, claves secretas, logs) de `BaseServiceSettings`
y agrega lo propio del Gateway.
"""
from pydantic import Field

from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    # Cuántos minutos dura un token de login antes de tener que iniciar sesión otra vez.
    jwt_minutos_expiracion: int = Field(default=60, alias="JWT_MINUTOS_EXPIRACION")

    # Dirección INTERNA del microservicio de postulantes (el nombre
    # "servicio-postulantes" solo existe dentro de la red de Docker).
    url_servicio_postulantes: str = Field(alias="URL_SERVICIO_POSTULANTES")

    # Direcciones internas de los otros dos microservicios. Son opcionales: si una
    # falta en el .env, las rutas de ese servicio responden 404 (ver
    # `_URL_POR_SERVICIO` en api/v1/proxy.py).
    url_servicio_empresas_vacantes: str | None = Field(default=None, alias="URL_SERVICIO_EMPRESAS_VACANTES")
    url_servicio_procesos_seleccion: str | None = Field(default=None, alias="URL_SERVICIO_PROCESOS_SELECCION")

    # Páginas web autorizadas a llamar a este servidor desde el navegador:
    # el ERP (puerto 3000) y ANUNCIOS (puerto 3001). Se escriben separadas por coma.
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:3001", alias="CORS_ORIGINS"
    )

    # Clave que comparten el Gateway y los servidores de Next.js (ERP y ANUNCIOS). Con ella Next.js
    # demuestra que la IP que manda en "X-Cliente-IP" es la del usuario real (ver
    # core/limite_peticiones.py). Si falta, los límites por IP cuentan la IP del servidor de Next.js.
    frontend_proxy_secret: str | None = Field(default=None, alias="FRONTEND_PROXY_SECRET")

    @property
    def lista_cors_origins(self) -> list[str]:
        """Convierte el texto "a,b" en la lista ["a", "b"]."""
        return [origen.strip() for origen in self.cors_origins.split(",") if origen.strip()]


# Se crea UNA sola vez, al importar este archivo; el resto del código usa `settings`.
settings = Settings()  # type: ignore[call-arg]
