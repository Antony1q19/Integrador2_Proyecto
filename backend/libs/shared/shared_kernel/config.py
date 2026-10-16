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
from urllib.parse import quote

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    # Si existe un archivo ".env" lo lee; si no, usa solo las variables de
    # entorno que ya vengan puestas (en Docker Compose vienen puestas).
    # "extra=ignore" = ignora variables que este servicio no necesita.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "desarrollo" crea las tablas solas al arrancar (ver main.py).
    entorno: str = Field(default="desarrollo", alias="ENTORNO")

    # Dirección de la base de datos de ESTE servicio (usuario, clave, host, nombre).
    # En AWS no se escribe completa: se arma con DB_HOST, DB_PORT, DB_NOMBRE, DB_USUARIO y
    # DB_PASSWORD (la contraseña llega como secreto desde SSM Parameter Store; ver abajo).
    database_url: str = Field(default="", alias="DATABASE_URL")
    db_host: str | None = Field(default=None, alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_nombre: str = Field(default="talenterp", alias="DB_NOMBRE")
    db_usuario: str = Field(default="talenterp", alias="DB_USUARIO")
    db_password: str | None = Field(default=None, alias="DB_PASSWORD")

    # true = al encender crea las tablas que falten aunque no sea "desarrollo" (sin datos de prueba).
    # Se usa en AWS: una base nueva queda lista sola; en una base que ya tiene sus tablas no cambia nada.
    inicializar_bd: bool = Field(default=False, alias="INICIALIZAR_BD")

    # Esquema (carpeta) de la base de datos donde viven las tablas de este servicio, ej.
    # "postulantes". Vacío = el esquema normal ("public", el caso del Postgres local).
    # Ojo: el valor que realmente se usa lo lee shared_kernel/database.py directamente de
    # la variable de entorno; este campo solo lo deja a la vista.
    db_schema: str | None = Field(default=None, alias="DB_SCHEMA")

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

    @model_validator(mode="after")
    def _armar_database_url(self):
        """Si no viene DATABASE_URL pero sí DB_HOST/DB_PASSWORD (AWS), la arma (con SSL)."""
        if not self.database_url:
            if not (self.db_host and self.db_password):
                raise ValueError("Falta DATABASE_URL (o DB_HOST + DB_PASSWORD) en la configuración")
            self.database_url = (
                f"postgresql+asyncpg://{quote(self.db_usuario, safe='')}:{quote(self.db_password, safe='')}"
                f"@{self.db_host}:{self.db_port}/{self.db_nombre}?ssl=require"
            )
        return self
