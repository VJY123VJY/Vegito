from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.common import APIResponse
from app.services.whatsapp_catalogue_service import WhatsAppCatalogueService

router = APIRouter(prefix="/catalogue", tags=["Catalogue"])


@router.get("/status", summary="Get WhatsApp catalogue integration status and pending items")
@router.get("/whatsapp/status", summary="Get WhatsApp catalogue integration status and pending items")
def get_whatsapp_catalogue_status(db: Session = Depends(get_db)):
    status_data = WhatsAppCatalogueService.get_catalogue_status(db)
    return APIResponse(
        message="WhatsApp catalogue integration status",
        data=status_data,
    )
