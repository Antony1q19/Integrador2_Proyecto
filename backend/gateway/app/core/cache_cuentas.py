"""Memoria de corta duración con el estado de cada cuenta (trabajadores del ERP y postulantes).

En CADA petición con sesión el Gateway comprueba que la cuenta siga valiendo: que no esté
suspendida, que su rol no haya cambiado, que su contraseña no haya cambiado después de iniciar
sesión y (RRHH/Supervisor) qué empresas puede ver (ver api/deps.py). Preguntarlo a la base de datos
en cada petición cuesta un viaje a Supabase (~200 ms), así que el resultado se recuerda unos segundos.

¿Se pierde el "cambio al instante"? No: cuando un Admin edita a un trabajador, cambia su estado o
su contraseña, esa ruta llama a `olvidar` y el cambio vale de inmediato. El tiempo máximo
(`SEGUNDOS_DE_VIDA`) solo es una red de seguridad (cambios hechos directo en la base de datos,
varios Gateways, o cuentas de postulantes, que viven en otro servicio).

Claves: "erp:<id>" para trabajadores y "anuncios:<id>" para cuentas de postulantes.
"""
import time
from typing import Any

SEGUNDOS_DE_VIDA = 15

# clave -> (momento en que vence, datos de la cuenta; None = la cuenta no existe)
_memoria: dict[str, tuple[float, Any]] = {}
_NO_GUARDADO = object()


def recordado(clave: str) -> Any:
    """Los datos guardados de esa cuenta, o `NO_GUARDADO` si no hay nada (o ya venció)."""
    guardado = _memoria.get(clave)
    if guardado is None or guardado[0] < time.monotonic():
        return _NO_GUARDADO
    return guardado[1]


def recordar(clave: str, datos: Any) -> None:
    _memoria[clave] = (time.monotonic() + SEGUNDOS_DE_VIDA, datos)
    if len(_memoria) > 20_000:  # limpieza ocasional
        ahora = time.monotonic()
        for vieja in [c for c, (vence, _) in _memoria.items() if vence < ahora]:
            del _memoria[vieja]


def olvidar(clave: str) -> None:
    """Se llama cuando cambian las empresas, el rol, el estado o la contraseña de una cuenta."""
    _memoria.pop(clave, None)


NO_GUARDADO = _NO_GUARDADO
