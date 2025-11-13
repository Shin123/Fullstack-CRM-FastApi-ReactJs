from fastapi import APIRouter

from app.core.config import settings
from app.models import AppConfigPublic

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/", response_model=AppConfigPublic)
def get_app_config() -> AppConfigPublic:
    """
    Public configuration exposed to the frontend.
    """
    return AppConfigPublic(default_currency=settings.DEFAULT_CURRENCY)

