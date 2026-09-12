"""Agrega todos los sub-routers de v1 en un solo `APIRouter` que
`main.py` monta una sola vez."""
from fastapi import APIRouter

from app.api.v1 import documentos, postulantes

router = APIRouter()
router.include_router(postulantes.router)
router.include_router(documentos.router)
