"""
API routes for Clinical AI Co-Pilot and SBAR handover reporting.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from server.db.session import get_db
from server.schemas.copilot import (
    CopilotQueryRequest,
    CopilotQueryResponse,
    SBARReport,
)
from server.services.copilot_service import ClinicalCopilotService

router = APIRouter(prefix="/patients/{patient_id}", tags=["Clinical AI Co-Pilot"])


@router.post(
    "/copilot",
    response_model=CopilotQueryResponse,
    summary="Query the PULSE Clinical AI Co-Pilot for explainability and clinical insights",
)
def query_copilot(
    patient_id: str,
    payload: CopilotQueryRequest,
    db: Session = Depends(get_db),
):
    """
    Submit a clinical inquiry regarding patient trajectories, biological risk drivers,
    synthesized omics interpretations, or SBAR handover summaries.
    """
    copilot_service = ClinicalCopilotService(db)
    try:
        response = copilot_service.answer_query(
            patient_id=patient_id,
            query=payload.query,
            include_sbar=payload.include_sbar,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Co-Pilot synthesis failure: {str(e)}",
        )


@router.get(
    "/sbar",
    response_model=SBARReport,
    summary="Generate structured SBAR (Situation, Background, Assessment, Recommendation) handover report",
)
def get_sbar_report(
    patient_id: str,
    db: Session = Depends(get_db),
):
    """
    Generate an SBAR handover report ready for clinical rounds or shift changes.
    """
    copilot_service = ClinicalCopilotService(db)
    try:
        sbar = copilot_service.generate_sbar(patient_id)
        return sbar
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SBAR generation failure: {str(e)}",
        )
