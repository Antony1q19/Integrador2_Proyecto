"""Configuración del microservicio de postulantes (valores del archivo .env).

Usa lo común (base de datos, claves secretas, logs) de `BaseServiceSettings` y agrega dónde se
guardan los archivos que suben los usuarios (S3 o carpeta local) y cómo se envían los correos
(Amazon SES o, en desarrollo, el log).
"""
from pydantic import Field

from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    # Dirección INTERNA de servicio-procesos-seleccion (solo existe dentro de la red de
    # Docker). Se usa para saber qué postulantes debe ocultar a RRHH/Supervisor según las
    # empresas que tienen asignadas. Si falta, esos roles no podrán consultar postulantes (503).
    url_servicio_procesos_seleccion: str | None = Field(default=None, alias="URL_SERVICIO_PROCESOS_SELECCION")

    # --- Archivos (CV, DNI, certificados) -----------------------------------------------------
    # "s3" en AWS (bucket privado; el permiso lo da el rol de IAM de la tarea, sin claves) o
    # "local" para desarrollar en la PC (se guardan en una carpeta del contenedor).
    almacenamiento: str = Field(default="local", alias="ALMACENAMIENTO")
    s3_bucket_documentos: str = Field(default="", alias="S3_BUCKET_DOCUMENTOS")
    carpeta_archivos_local: str = Field(default="/app/archivos", alias="CARPETA_ARCHIVOS_LOCAL")
    aws_region: str = Field(default="us-east-1", alias="AWS_REGION")

    @property
    def contenedor_archivos(self) -> str:
        """Nombre del "contenedor" de archivos que se guarda junto a cada ruta (bucket o carpeta)."""
        return self.s3_bucket_documentos if self.almacenamiento == "s3" else "local"

    # --- Correo ----------------------------------------------------------------------------------
    # "ses" en AWS (Amazon SES; el remitente debe estar verificado en SES) o "consola" para
    # desarrollar: el correo no se envía, se escribe en el log (con su enlace) para poder probarlo.
    correo: str = Field(default="consola", alias="CORREO")
    correo_remitente_email: str = Field(default="", alias="CORREO_REMITENTE_EMAIL")
    correo_remitente_nombre: str = Field(default="TalentERP", alias="CORREO_REMITENTE_NOMBRE")
    # Dirección pública de la app ANUNCIOS: el correo enlaza a su página de registro.
    url_anuncios: str = Field(default="http://localhost:3001", alias="URL_ANUNCIOS")


# Se crea UNA sola vez; el resto del código usa `settings`.
settings = Settings()  # type: ignore[call-arg]
