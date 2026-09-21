"""Registro de mensajes (logs) con el mismo formato en todos los servicios.

Los logs son lo que ves en `docker logs <contenedor>`. Cada línea sale en
formato JSON e incluye el nombre del servicio que la escribió, para saber de
dónde viene cada mensaje cuando miras varios servicios a la vez.
"""
import logging
import sys


def configurar_logging(nombre_servicio: str, nivel: str = "INFO") -> None:
    formato = (
        '{"servicio": "%s", "nivel": "%%(levelname)s", '
        '"logger": "%%(name)s", "mensaje": "%%(message)s"}' % nombre_servicio
    )
    logging.basicConfig(level=nivel, format=formato, stream=sys.stdout, force=True)
