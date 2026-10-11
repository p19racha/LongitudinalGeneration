"""
Pydantic schemas for Population Health Analytics, Triage Radar, and Batch Lab Ingestion.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class CohortOverviewResponse(BaseModel):
    """
    Hospital-wide population health summary metrics.
    """
    total_patients: int
    outpatient_count: int
    icu_count: int
    risk_distribution: Dict[str, int] = Field(..., description="Count of patients in CRITICAL, HIGH, MODERATE, LOW categories")
    average_encounters_per_patient: float
    total_measurements: int
    synthetic_omics_count: int
    omics_synthesis_rate_pct: float
    prevalent_high_risk_diseases: List[Dict[str, Any]]


class TriageItem(BaseModel):
    """
    Individual patient entry in the Clinical Triage Radar.
    """
    patient_id: str
    mrn: str
    full_name: str
    cohort_type: str
    latest_risk_score: float
    latest_risk_category: str
    primary_disease: str
    risk_velocity: float = Field(..., description="Longitudinal rate of change in risk probability")
    velocity_direction: str = Field(..., description="ACCELERATING_UP, STABLE, or IMPROVING_DOWN")
    is_urgent: bool
    latest_visit_date: Optional[str] = None
    total_visits: int


class TriageRadarResponse(BaseModel):
    """
    Prioritized clinical triage radar response.
    """
    total_patients_analyzed: int
    urgent_count: int
    triage_queue: List[TriageItem]


class BatchImportResult(BaseModel):
    """
    Outcome summary of batch CSV lab ingestion.
    """
    patients_created: int
    visits_created: int
    measurements_created: int
    pulse_runs_triggered: int
    errors: List[str] = Field(default_factory=list)
