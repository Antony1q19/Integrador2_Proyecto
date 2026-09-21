"""Configuración común a todos los servicios (lo que se lee del archivo .env).

¿Cómo funciona?
- Cada servicio tiene un archivo `.env` con líneas como `DATABASE_URL=...`.
- Docker Compose (o tú, al correr el servicio) convierte esas líneas en
  "variables de entorno".
- La clase de abajo las lee automáticamente y las deja como atributos:
  `settings.database_url`, `settings.jwt_secret`, etc.

Cada servicio crea su propia clase `Settings` heredando de esta y agrega lo
que solo él necesita.
"""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    # Si existe un archivo ".env" lo lee; si no, usa solo las variables de
    # entorno que ya vengan puestas (en Docker Compose vienen puestas).
    # "extra=ignore" = ignora variables que este servicio no necesita.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "desarrollo" crea las tablas solas al arrancar (ver main.py).
    entorno: str = Field(default="desarrollo", alias="ENTORNO")

    # Dirección de la base de datos de ESTE servicio (usuario, clave, host, nombre).
    database_url: str = Field(alias="DATABASE_URL")

    # Clave secreta con la que se FIRMAN los tokens de login (JWT).
    # Solo el Gateway crea tokens; los microservicios únicamente los revisan.
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_algoritmo: str = Field(default="HS256", alias="JWT_ALGORITMO")

    # Segunda clave secreta, compartida SOLO entre el Gateway y los
    # microservicios. El Gateway firma cada petición interna con ella y el
    # microservicio comprueba la firma: así sabe que la petición pasó por el
    # Gateway y no la mandó alguien directo al puerto del microservicio.
    gateway_shared_secret: str = Field(alias="GATEWAY_SHARED_SECRET")

    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
