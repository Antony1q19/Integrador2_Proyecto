"""Memoria de corta duración con las empresas asignadas a cada trabajador.

Para cada petición de RRHH o Supervisor, el Gateway necesita saber qué empresas puede ver esa persona
(ver shared_kernel/visibilidad.py). Preguntarlo a la base de datos EN CADA petición cuesta un viaje a
Supabase (~200 ms), así que el resultado se recuerda unos segundos.

¿Se pierde el "cambio al instante"? No: cuando un Admin edita a un trabajador o cambia su estado, esa
ruta llama a `olvidar` y el cambio vale de inmediato. El tiempo máximo (`SEGUNDOS_DE_VIDA`) solo es una
red de seguridad (por si el cambio se hiciera directo en la base de datos, o si hubiera varios Gateways).
"""
import time

SEGUNDOS_DE_VIDA = 15

# id del usuario -> (momento en que vence, ids de sus empresas; lista vacía si no puede ver ninguna)
_memoria: dict[str, tuple[float, list[int]]] = {}


def recordado(usuario_id: str) -> list[int] | None:
    """Las empresas guardadas de ese usuario, o None si no hay nada guardado (o ya venció)."""
    guardado = _memoria.get(usuario_id)
    if guardado is None or guardado[0] < time.monotonic():
        return None
    return guardado[1]


def recordar(usuario_id: str, empresas: list[int]) -> None:
    _memoria[usuario_id] = (time.monotonic() + SEGUNDOS_DE_VIDA, list(empresas))


def olvidar(usuario_id: str) -> None:
    """Se llama cuando cambian las empresas, el rol o el estado de un usuario."""
    _memoria.pop(usuario_id, None)
