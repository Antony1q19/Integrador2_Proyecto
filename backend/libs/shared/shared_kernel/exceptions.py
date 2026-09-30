"""Errores de negocio con su código HTTP ya asignado.

Idea: en vez de escribir en cada endpoint "si no existe, devuelve 404 con este
mensaje...", basta con escribir:

    raise RecursoNoEncontrado("Postulante 5 no encontrado")

y `registrar_manejadores_excepciones` (más abajo) lo convierte solo en una
respuesta HTTP 404 con el mensaje en formato JSON: {"detail": "..."}.
"""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class ErrorDominio(Exception):
    """Base de todos los errores de negocio. No se lanza directamente:
    usa una de las tres de abajo."""

    status_code: int = status.HTTP_400_BAD_REQUEST


class RecursoNoEncontrado(ErrorDominio):
    """Lo que buscas no existe → HTTP 404."""

    status_code = status.HTTP_404_NOT_FOUND


class ConflictoDeEstado(ErrorDominio):
    """La acción choca con el estado actual (ej. duplicado) → HTTP 409."""

    status_code = status.HTTP_409_CONFLICT


class SolicitudInvalida(ErrorDominio):
    """Los datos enviados no cumplen una regla de negocio → HTTP 400."""

    status_code = status.HTTP_400_BAD_REQUEST


class ServicioNoDisponible(ErrorDominio):
    """Un servicio externo que necesitamos (ej. Supabase Storage) no está configurado o
    no respondió → HTTP 503."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE


def registrar_manejadores_excepciones(app: FastAPI) -> None:
    """Enseña a la app a convertir estos errores en respuestas HTTP.
    Cada servicio lo llama una vez en su main.py."""

    @app.exception_handler(ErrorDominio)
    async def manejar_error_dominio(request: Request, exc: ErrorDominio) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})
