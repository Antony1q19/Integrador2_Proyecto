"""Logging uniforme para los cuatro servicios (Gateway + 3 microservicios).

Se usa un formato JSON simple con `logging` estándar en vez de una
dependencia adicional (structlog, etc.): es suficiente para correlacionar
logs por `nombre_servicio` en esta etapa del curso. Se documenta como
mejora futura en el README si el equipo necesita trazas distribuidas.
"""
import logging
import sys


def configurar_logging(nombre_servicio: str, nivel: str = "INFO") -> None:
    formato = (
        '{"servicio": "%s", "nivel": "%%(levelname)s", '
        '"logger": "%%(name)s", "mensaje": "%%(message)s"}' % nombre_servicio
    )
    logging.basicConfig(level=nivel, format=formato, stream=sys.stdout, force=True)
