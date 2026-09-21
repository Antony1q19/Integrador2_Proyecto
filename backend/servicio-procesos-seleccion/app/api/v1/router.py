"""Junta todas las rutas de este servicio en un solo paquete.

main.py monta este paquete una sola vez. Si se agrega un archivo de rutas
nuevo, se registra aqui abajo.
"""
from fastapi import APIRouter

from app.api.v1 import dashboard, evaluaciones, procesos

router = APIRouter()
router.include_router(procesos.router)       # /procesos...
router.include_router(evaluaciones.router)   # /evaluaciones...
router.include_router(dashboard.router)      # /dashboard
