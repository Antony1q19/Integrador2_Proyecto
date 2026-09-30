"""Configuración del microservicio de postulantes (valores del archivo .env).

Usa lo común (base de datos, claves secretas, logs) de `BaseServiceSettings` y
agrega los datos de Supabase Storage, donde se guardan los archivos
(CV, DNI, imágenes...) que suben los usuarios.
"""
from pydantic import Field

from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    # Dirección INTERNA de servicio-procesos-seleccion (solo existe dentro de la red de
    # Docker). Se usa para saber qué postulantes debe ocultar a RRHH/Supervisor según las
    # empresas que tienen asignadas. Si falta, esos roles no podrán consultar postulantes (503).
    url_servicio_procesos_seleccion: str | None = Field(default=None, alias="URL_SERVICIO_PROCESOS_SELECCION")

    # --- Supabase Storage (donde se guardan los archivos: CV, DNI, certificados) --------------
    # Se sacan del proyecto de Supabase donde vive la base de datos de este servicio
    # ("talenterp-personas"): Project Settings > API. La clave es SECRETA (da control total del
    # proyecto): solo va en el archivo .env (que git ignora), nunca en el código ni en el navegador.
    # Si faltan, subir un archivo responde error 503 con un mensaje claro; el resto sigue funcionando.
    supabase_url: str = Field(default="", alias="SUPABASE_URL")  # ej. https://<id-del-proyecto>.supabase.co
    supabase_service_key: str = Field(default="", alias="SUPABASE_SERVICE_KEY")  # "service_role" o "secret key"
    # Bucket (carpeta grande) PRIVADO donde se guardan los archivos; se crea solo al encender el servicio.
    supabase_bucket: str = Field(default="postulantes-documentos", alias="SUPABASE_BUCKET")

# Se crea UNA sola vez; el resto del código usa `settings`.
settings = Settings()  # type: ignore[call-arg]
