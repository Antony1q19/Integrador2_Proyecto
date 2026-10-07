"""Qué empresas puede ver cada usuario ("visibilidad").

Regla del sistema:
  - Admin (y Postulante) → no tienen filtro por empresa. (Un Postulante no usa el ERP;
    lo que puede hacer lo limitan sus roles, no las empresas.)
  - RRHH y Supervisor    → SOLO ven las empresas que un Admin les asignó en /perfil, y
    todo lo que dependa de ellas: sus anuncios, las postulaciones a esos anuncios y los
    postulantes que solo postularon ahí.

¿Cómo llega esa información a cada microservicio?
  El Gateway consulta la lista de empresas asignadas del usuario en su base de datos
  (en cada petición, así un cambio del Admin vale al instante) y la manda en la cabecera
  `X-Usuario-Empresas`, ej. "1,3". Cada microservicio la lee con `parsear_empresas`.

Algunos servicios necesitan preguntarle algo a otro (ej. procesos-seleccion pregunta a
empresas-vacantes qué anuncios puede ver el usuario). Para eso está `llamar_a_servicio`:
firma la llamada igual que el Gateway y reenvía la identidad del usuario.
"""
from typing import Any
from urllib.parse import quote

import httpx

from shared_kernel.exceptions import ServicioNoDisponible
from shared_kernel.firma_http import gancho_de_firma

# Roles a los que se les limitan las empresas.
ROLES_CON_EMPRESAS_ASIGNADAS = {"RRHH", "Supervisor"}

_TIEMPO_MAXIMO_SEGUNDOS = 10


def parsear_empresas(rol: str, cabecera: str | None) -> set[int] | None:
    """Convierte la cabecera "1,3" en {1, 3}.

    Devuelve None cuando el usuario NO tiene filtro (ve todas las empresas). Para RRHH y
    Supervisor devuelve siempre un conjunto; si la cabecera falta o está vacía, es el
    conjunto vacío (no ve ninguna): ante la duda, se niega el acceso.
    """
    if rol not in ROLES_CON_EMPRESAS_ASIGNADAS:
        return None
    return {int(parte) for parte in (cabecera or "").split(",") if parte.strip().isdigit()}


def cabeceras_de_usuario(usuario: dict[str, Any]) -> dict[str, str]:
    """Las cabeceras que identifican al usuario (para reenviarlas a otro servicio)."""
    cabeceras = {
        "X-Usuario-Id": str(usuario["id"]),
        "X-Usuario-Rol": str(usuario["rol"]),
        "X-Usuario-Nombre": quote(str(usuario.get("nombre", ""))),
    }
    if usuario.get("empresas") is not None:
        cabeceras["X-Usuario-Empresas"] = ",".join(str(i) for i in sorted(usuario["empresas"]))
    if usuario.get("postulante_id"):
        cabeceras["X-Usuario-Postulante-Id"] = str(usuario["postulante_id"])
    return cabeceras


async def llamar_a_servicio(
    url_base: str | None,
    ruta: str,
    usuario: dict[str, Any],
    secreto_gateway: str,
    permitir_404: bool = False,
    metodo: str = "GET",
    json: Any = None,
) -> Any:
    """Hace una petición (GET por defecto) a otro microservicio, en nombre del usuario, y
    devuelve su JSON.

    La llamada lleva la firma del Gateway (misma clave compartida) y la identidad del
    usuario, así el otro servicio aplica el mismo filtro de empresas. Si el servicio no
    responde, se lanza `ServicioNoDisponible` (503): no se "adivina" una respuesta.

    Con `permitir_404=True`, un 404 ("no existe" o "no lo puedes ver") devuelve None en vez
    de error: sirve para preguntar "¿existe este anuncio?".
    """
    if not url_base:
        raise ServicioNoDisponible("Falta configurar la dirección de otro servicio interno")

    try:
        # La firma la pone el "gancho" justo antes de enviar (ver shared_kernel/firma_http.py).
        async with httpx.AsyncClient(
            timeout=_TIEMPO_MAXIMO_SEGUNDOS, event_hooks={"request": [gancho_de_firma(secreto_gateway)]}
        ) as cliente:
            respuesta = await cliente.request(metodo, f"{url_base}{ruta}", headers=cabeceras_de_usuario(usuario), json=json)
    except httpx.HTTPError as exc:
        raise ServicioNoDisponible("No se pudo consultar otro servicio interno. Intenta nuevamente.") from exc

    if permitir_404 and respuesta.status_code == 404:
        return None
    if respuesta.status_code != 200:
        raise ServicioNoDisponible("Otro servicio interno respondió con un error. Intenta nuevamente.")
    return respuesta.json()
