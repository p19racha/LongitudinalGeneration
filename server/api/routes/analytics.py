"""
API routes for Population Health Analytics, Clinical Triage Radar, and Batch Lab Ingestion.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from server.db.session import get_db
from server.schemas.analytics import (
    CohortOverviewResponse,
    TriageRadarResponse,
    BatchImportResult,
)
from server.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Population Health & Analytics"])


class CsvImportPayload(BaseModel):
    csv_content: str
    auto_run_pulse: bool = True


@router.get(
    "/overview",
    response_model=CohortOverviewResponse,
    summary="Retrieve hospital-wide population health metrics and disease distributions",
)
def get_cohort_overview(
    db: Session = Depends(get_db),
):
    """
    Get aggregated population health statistics: total cohort counts, chronic risk distribution,
    molecular omics synthesis rates, and prevalent high-risk conditions.
    """
    service = AnalyticsService(db)
    return service.get_cohort_overview()


@router.get(
    "/triage-radar",
    response_model=TriageRadarResponse,
    summary="Get clinical triage radar queue rank-ordered by longitudinal risk velocity",
)
def get_triage_radar(
    db: Session = Depends(get_db),
):
    """
    Prioritize patient cohort by longitudinal disease acceleration rate and acute deterioration flags.
    """
    service = AnalyticsService(db)
    return service.get_triage_radar()


@router.post(
    "/import-csv",
    response_model=BatchImportResult,
    summary="Batch import multi-patient laboratory records via CSV payload",
)
def import_csv_dataset(
    payload: CsvImportPayload,
    db: Session = Depends(get_db),
):
    """
    Ingest multi-patient CSV laboratory data with column auto-mapping and optional automatic PULSE synthesis.
    """
    service = AnalyticsService(db)

    if not payload.csv_content.strip():
        return BatchImportResult(
            patients_created=0,
            visits_created=0,
            measurements_created=0,
            pulse_runs_triggered=0,
            errors=["CSV content is empty."],
        )

    try:
        result = service.import_csv_data(
            payload.csv_content, auto_run_pulse=payload.auto_run_pulse
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process CSV import: {str(e)}",
        )
