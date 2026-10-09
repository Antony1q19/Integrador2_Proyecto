from fastapi import APIRouter

from app.api.v1 import conversaciones, webhook

router = APIRouter()
router.include_router(conversaciones.router)
router.include_router(webhook.router)