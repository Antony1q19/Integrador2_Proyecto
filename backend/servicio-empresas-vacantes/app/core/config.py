"""Configuración de este microservicio (valores del archivo .env).

Por ahora no necesita nada extra: usa lo común (base de datos, claves secretas,
logs) tal como viene de `BaseServiceSettings`. Se deja como clase propia para
poder agregarle ajustes específicos más adelante sin tocar otros servicios.
"""
from shared_kernel.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    pass


# Se crea UNA sola vez; el resto del código usa `settings`.
settings = Settings()  # type: ignore[call-arg]
