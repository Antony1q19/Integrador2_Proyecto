"""Reglas de las plantillas de WhatsApp."""
import re

from shared_kernel.exceptions import SolicitudInvalida

_VARIABLE = re.compile(r"\{\{(\d+)\}\}")


def contar_variables(cuerpo: str) -> int:
    """Cuántas variables distintas ({{1}}, {{2}}...) tiene el texto."""
    return len(set(_VARIABLE.findall(cuerpo)))


def validar_cuerpo(cuerpo: str, ejemplos: list[str]) -> None:
    """Las variables deben ir seguidas desde {{1}} y tener un ejemplo cada una (lo exige Meta)."""
    numeros = sorted({int(n) for n in _VARIABLE.findall(cuerpo)})
    if numeros != list(range(1, len(numeros) + 1)):
        raise SolicitudInvalida("Las variables deben ser {{1}}, {{2}}, {{3}}... sin saltarse números")
    if len(ejemplos) != len(numeros) or any(not e.strip() for e in ejemplos):
        raise SolicitudInvalida(f"Escribe un ejemplo para cada variable ({len(numeros)} en total)")


def rellenar(cuerpo: str, variables: list[str]) -> str:
    """El texto tal como lo recibe el postulante (para guardarlo en el historial del chat)."""
    return _VARIABLE.sub(
        lambda m: variables[int(m.group(1)) - 1] if int(m.group(1)) <= len(variables) else m.group(0),
        cuerpo,
    )
