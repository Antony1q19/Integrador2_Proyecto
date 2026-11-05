"""Configuración del microservicio de comunicaciones."""
from pydantic import Field

from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    # --- Meta WhatsApp Cloud API ---
    # developers.facebook.com > tu app > WhatsApp > API Setup.
    meta_access_token: str | None = Field(default=None, alias="META_ACCESS_TOKEN")
    meta_phone_number_id: str | None = Field(default=None, alias="META_PHONE_NUMBER_ID")
    meta_api_version: str = Field(default="v23.0", alias="META_API_VERSION")
    # Identificador de la cuenta de WhatsApp Business (API Setup): las plantillas viven en ella.
    meta_waba_id: str | None = Field(default=None, alias="META_WABA_ID")
    # Palabra secreta que se escribe en Meta al registrar el webhook (WhatsApp > Configuration >
    # "Token de verificación"); Meta la manda de vuelta para comprobar que el webhook es nuestro.
    meta_verify_token: str | None = Field(default=None, alias="META_VERIFY_TOKEN")
    # Opcional: "Clave secreta de la app" (App settings > Basic). Si está, se verifica la firma
    # X-Hub-Signature-256 de cada webhook y se rechaza lo que no venga de Meta.
    meta_app_secret: str | None = Field(default=None, alias="META_APP_SECRET")

    # Dirección del servicio-procesos-seleccion: dice qué postulantes oculta la regla de empresas.
    url_servicio_procesos_seleccion: str | None = Field(
        default=None, alias="URL_SERVICIO_PROCESOS_SELECCION"
    )

    # Dirección del servicio-postulantes (para consultar datos del postulante).
    url_servicio_postulantes: str | None = Field(
        default=None, alias="URL_SERVICIO_POSTULANTES"
    )


settings = Settings()  # type: ignore[call-arg]
