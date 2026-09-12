"""Excepciones de dominio comunes + registro de manejadores FastAPI.

Cada microservicio llama a `registrar_manejadores_excepciones(app)` en su
`main.py` para que los errores de negocio (no encontrado, conflicto,
solicitud inválida) se traduzcan siempre al mismo formato de respuesta,
sin repetir try/except en cada endpoint.
"""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class ErrorDominio(Exception):
    """Excepción base de reglas de negocio. No usar directamente: lanzar
    una de las subclases de abajo."""

    status_code: int = status.HTTP_400_BAD_REQUEST


class RecursoNoEncontrado(ErrorDominio):
    status_code = status.HTTP_404_NOT_FOUND


class ConflictoDeEstado(ErrorDominio):
    status_code = status.HTTP_409_CONFLICT


class SolicitudInvalida(ErrorDominio):
    status_code = status.HTTP_400_BAD_REQUEST


def registrar_manejadores_excepciones(app: FastAPI) -> None:
    @app.exception_handler(ErrorDominio)
    async def manejar_error_dominio(request: Request, exc: ErrorDominio) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})
