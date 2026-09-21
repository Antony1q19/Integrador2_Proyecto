"""Junta todas las rutas de este servicio en un solo paquete.

main.py monta este paquete una sola vez. Si se agrega un archivo de rutas
nuevo, se registra aquí abajo.
"""
from fastapi import APIRouter

from app.api.v1 import documentos, postulantes

router = APIRouter()
router.include_router(postulantes.router)  # /postulantes...
router.include_router(documentos.router)   # /postulantes/{id}/documentos...
