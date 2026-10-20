"""Configuración del microservicio de postulantes (variables de entorno de la tarea de ECS).

Usa lo común (base de datos, claves secretas, logs) de `BaseServiceSettings` y agrega dónde se
guardan los archivos que suben los usuarios (Amazon S3) y cómo se envían los correos (Amazon SES).
"""
from pydantic import Field

from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    # Dirección INTERNA de servicio-procesos-seleccion (solo existe dentro de ECS, por
    # Service Connect). Se usa para saber qué postulantes debe ocultar a RRHH/Supervisor según las
    # empresas que tienen asignadas. Si falta, esos roles no podrán consultar postulantes (503).
    url_servicio_procesos_seleccion: str | None = Field(default=None, alias="URL_SERVICIO_PROCESOS_SELECCION")

    # --- Archivos (CV, DNI, certificados) -----------------------------------------------------
    # Bucket privado de S3; el permiso lo da el rol de IAM de la tarea (sin claves).
    s3_bucket_documentos: str = Field(default="", alias="S3_BUCKET_DOCUMENTOS")
    aws_region: str = Field(default="us-east-1", alias="AWS_REGION")

    @property
    def contenedor_archivos(self) -> str:
        """Nombre del bucket, que se guarda junto a cada ruta de archivo."""
        return self.s3_bucket_documentos

    # --- Correo (Amazon SES; el remitente debe estar verificado en SES) ---------------------------
    correo_remitente_email: str = Field(default="", alias="CORREO_REMITENTE_EMAIL")
    correo_remitente_nombre: str = Field(default="TalentERP", alias="CORREO_REMITENTE_NOMBRE")
    # Dirección pública de la app ANUNCIOS (CloudFront): el correo enlaza a su página de registro.
    url_anuncios: str = Field(default="", alias="URL_ANUNCIOS")


# Se crea UNA sola vez; el resto del código usa `settings`.
settings = Settings()  # type: ignore[call-arg]
