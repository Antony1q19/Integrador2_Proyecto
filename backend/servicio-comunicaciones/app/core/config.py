"""Configuración del microservicio de comunicaciones."""
from pydantic import Field

from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    # --- Cliente de WhatsApp (emulador en dev, Meta en prod) ---
    # URL base de la API. En desarrollo: http://localhost:4300 (kapso-emulator).
    # En producción: https://graph.facebook.com/v23.0
    whatsapp_api_url: str = Field(
        default="http://localhost:4300",
        alias="WHATSAPP_API_URL",
    )
    # API Key o Access Token de Meta.
    # En dev, puede ser cualquier valor (el emulador no verifica).
    whatsapp_api_key: str = Field(default="cualquier-clave", alias="WHATSAPP_API_KEY")
    # Phone Number ID (el número de prueba de Meta, ej. "555111222333").
    whatsapp_phone_number_id: str = Field(
        default="555111222333",
        alias="WHATSAPP_PHONE_NUMBER_ID",
    )
    # Secreto para verificar la firma de los webhooks entrantes.
    whatsapp_webhook_secret: str = Field(
        default="mi-secreto-de-prueba",
        alias="WHATSAPP_WEBHOOK_SECRET",
    )

    # Dirección del servicio-postulantes (para consultar datos del postulante).
    url_servicio_postulantes: str | None = Field(
        default=None, alias="URL_SERVICIO_POSTULANTES"
    )


settings = Settings()  # type: ignore[call-arg]