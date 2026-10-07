"""Junta todas las rutas de este servicio en un solo paquete.

main.py monta este paquete una sola vez. Si se agrega un archivo de rutas
nuevo, se registra aqui abajo.
"""
from fastapi import APIRouter

from app.api.v1 import anuncios, empresas, internos, publico

router = APIRouter()
router.include_router(empresas.router)  # /empresas...
router.include_router(anuncios.router)  # /anuncios...
router.include_router(publico.router)   # /publico/anuncios... (app ANUNCIOS, sin sesión)
router.include_router(internos.router)  # /internos/... (solo otros microservicios; el Gateway no las reenvía)
