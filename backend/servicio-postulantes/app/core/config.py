"""Configuración de servicio-postulantes. No añade nada propio sobre
`BaseServiceSettings`, pero se declara igual como clase separada para que
cada servicio pueda crecer con settings específicas sin tocar el resto."""
from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    pass


settings = Settings()  # type: ignore[call-arg]
