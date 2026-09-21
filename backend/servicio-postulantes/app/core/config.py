"""Configuración del microservicio de postulantes (valores del archivo .env).

Usa lo común (base de datos, claves secretas, logs) de `BaseServiceSettings` y
agrega los datos de Cloudinary, el servicio donde se guardan los archivos
(CV, DNI, imágenes...) que suben los usuarios.
"""
from pydantic import Field

from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    # Dirección INTERNA de servicio-procesos-seleccion (solo existe dentro de la red de
    # Docker). Se usa para saber qué postulantes debe ocultar a RRHH/Supervisor según las
    # empresas que tienen asignadas. Si falta, esos roles no podrán consultar postulantes (503).
    url_servicio_procesos_seleccion: str | None = Field(default=None, alias="URL_SERVICIO_PROCESOS_SELECCION")

    # --- Cloudinary ---------------------------------------------------------
    # Los 3 datos se sacan del panel de Cloudinary (cloudinary.com → Settings →
    # API Keys; el "cloud name" está arriba, en el Dashboard). Son secretos: solo
    # van en el archivo .env (que git ignora), nunca en el código.
    # Si faltan, subir un archivo responde error 503 con un mensaje claro; el
    # resto del servicio sigue funcionando.
    cloudinary_cloud_name: str = Field(default="", alias="CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key: str = Field(default="", alias="CLOUDINARY_API_KEY")
    cloudinary_api_secret: str = Field(default="", alias="CLOUDINARY_API_SECRET")

    # Carpeta de Cloudinary donde se guardan los archivos (se separa por postulante).
    cloudinary_carpeta: str = Field(default="talenterp/postulantes", alias="CLOUDINARY_CARPETA")

    # Dirección de la API de Cloudinary. Solo se cambia para pruebas (apuntando a
    # un servidor falso); en el uso normal no se toca.
    cloudinary_api_base: str = Field(
        default="https://api.cloudinary.com/v1_1", alias="CLOUDINARY_API_BASE"
    )


# Se crea UNA sola vez; el resto del código usa `settings`.
settings = Settings()  # type: ignore[call-arg]
