"""Reenvío: pasa las peticiones del navegador al microservicio correcto.

Ejemplo de recorrido de  GET /api/v1/postulantes :
    1. El navegador llama al Gateway con su token.
    2. Este archivo comprueba el token (si es falso → 401, y ahí termina).
    3. Ve que la ruta empieza con "postulantes" → sabe que le toca al
       microservicio de postulantes.
    4. Le reenvía la petición agregando:
         - la FIRMA secreta del Gateway (así el microservicio confía en él), y
         - quién es el usuario (id y rol), sacado del token.
    5. Devuelve al navegador, tal cual, lo que respondió el microservicio.

El microservicio NO vuelve a revisar el token: se fía de la firma y de esos
dos datos. Por eso NUNCA debe poder llamársele directo, sin pasar por aquí.
"""
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, Request, Response

from app.api.deps import obtener_usuario_actual
from app.core.config import settings
from app.core.http_client import cabeceras_firmadas, obtener_cliente
from shared_kernel.visibilidad import ROLES_CON_EMPRESAS_ASIGNADAS

router = APIRouter()

# Tabla de direcciones: primera palabra de la ruta → dirección interna del
# microservicio que la atiende. Para agregar un servicio nuevo, se añade una
# línea aquí y su URL en core/config.py. (Si la URL no está configurada en el
# .env, vale None y esa ruta responde 404 "Servicio no encontrado".)
_URL_POR_SERVICIO = {
    "postulantes": settings.url_servicio_postulantes,                   # servicio-postulantes
    "empresas": settings.url_servicio_empresas_vacantes,                # servicio-empresas-vacantes
    "anuncios": settings.url_servicio_empresas_vacantes,                # servicio-empresas-vacantes
    "procesos": settings.url_servicio_procesos_seleccion,               # servicio-procesos-seleccion
    "evaluaciones": settings.url_servicio_procesos_seleccion,           # servicio-procesos-seleccion
    "dashboard": settings.url_servicio_procesos_seleccion,              # servicio-procesos-seleccion (indicadores)
    "entrevistas": settings.url_servicio_procesos_seleccion,            # servicio-procesos-seleccion
    "contrataciones": settings.url_servicio_procesos_seleccion,         # servicio-procesos-seleccion
    "seguimientos": settings.url_servicio_procesos_seleccion,           # servicio-procesos-seleccion
}


@router.api_route(
    # Ruta "comodín": atrapa /api/v1/<servicio> y todo lo que venga después.
    # Se escribe SIN "/" entre las dos partes a propósito, para que también
    # coincida la ruta pelada  /api/v1/postulantes  (sin nada más detrás).
    "/{servicio}{ruta:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def reenviar(
    servicio: str,  # ej. "postulantes"
    ruta: str,      # el resto de la dirección, ej. "/123/documentos" (o "" si no hay más)
    request: Request,
    usuario: dict = Depends(obtener_usuario_actual),  # PASO 2: comprueba el token (y que la cuenta siga activa)
) -> Response:
    # PASO 3: ¿existe un microservicio con ese nombre?
    url_base = _URL_POR_SERVICIO.get(servicio)
    if url_base is None:
        return Response(
            content=b'{"detail": "Servicio no encontrado"}',
            status_code=404,
            media_type="application/json",
        )

    # PASO 4: preparar las cabeceras (firma + quién es el usuario). El nombre va
    # "codificado" con quote() (ej. "María" → "Mar%C3%ADa"): las cabeceras HTTP
    # no admiten bien las tildes; el microservicio lo decodifica.
    cabeceras = cabeceras_firmadas(
    {
        "X-Usuario-Id": str(usuario.get("sub", "")),
        "X-Usuario-Rol": str(usuario.get("rol", "")),
        "X-Usuario-Nombre": quote(str(usuario.get("nombre", ""))),
        # El token del postulante (app ANUNCIOS) incluye "postulanteId" en sus claims.
        # Se propaga como cabecera interna para que los microservicios puedan
        # validar que un postulante solo vea/crea SUS PROPIOS procesos.
        "X-Usuario-Postulante-Id": str(usuario.get("postulanteId", "")),
        "Content-Type": request.headers.get("content-type", "application/json"),
    }
)
    # PASO 4b: RRHH y Supervisor solo ven las empresas que un Admin les asignó. La lista sale de la
    # base de datos (no del token): la trae `obtener_usuario_actual` (api/deps.py), así un cambio del
    # Admin vale al instante.
    if usuario.get("rol") in ROLES_CON_EMPRESAS_ASIGNADAS:
        cabeceras["X-Usuario-Empresas"] = ",".join(str(i) for i in usuario.get("empresas_visibles", []))

    # Reenviar la petición. La dirección final es  <url_base>/<servicio><ruta>,
    # ej. http://servicio-postulantes:8001/postulantes/123 (el microservicio
    # define sus rutas empezando por "/postulantes", por eso se repite).
    cliente = obtener_cliente()
    respuesta = await cliente.request(
        request.method,
        f"{url_base}/{servicio}{ruta}",
        params=request.query_params,
        content=await request.body(),
        headers=cabeceras,
    )

    # PASO 5: devolver al navegador lo que respondió el microservicio, CON sus cabeceras
    # (ej. Content-Disposition, que dice el nombre del archivo al descargar un CV).
    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        headers=_cabeceras_de_respuesta(respuesta.headers),
    )


# Cabeceras que NO se copian de la respuesta del microservicio:
#   - las "de conexión" (hop-by-hop): describen la conexión Gateway↔microservicio, no la del navegador;
#   - content-length y content-encoding: httpx ya descomprimió el cuerpo, así que el tamaño y la
#     compresión originales ya no son ciertos (Starlette vuelve a calcular el tamaño solo).
_CABECERAS_EXCLUIDAS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "content-encoding",
}


def _cabeceras_de_respuesta(cabeceras: httpx.Headers) -> dict[str, str]:
    """Las cabeceras del microservicio que sí deben llegar al navegador."""
    return {
        nombre: valor
        for nombre, valor in cabeceras.items()
        if nombre.lower() not in _CABECERAS_EXCLUIDAS
    }
