"""
Pydantic schemas for clinical visits.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from server.schemas.measurement import MeasurementCreate, MeasurementResponse
from server.schemas.note import ClinicalNoteCreate, ClinicalNoteResponse
from server.schemas.prediction import RiskPredictionResponse


class LatentStateResponse(BaseModel):
    id: str
    visit_id: str
    z_vector: List[float]
    past_vector: Optional[List[float]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VisitBase(BaseModel):
    visit_index: int = 0
    visit_date: str
    hours_from_baseline: float = 0.0
    visit_summary: Optional[str] = None


class VisitCreate(VisitBase):
    measurements: List[MeasurementCreate] = []
    clinical_notes: List[ClinicalNoteCreate] = []


class VisitResponse(VisitBase):
    id: str
    patient_id: str
    created_at: datetime
    measurements: List[MeasurementResponse] = []
    clinical_notes: List[ClinicalNoteResponse] = []
    latent_state: Optional[LatentStateResponse] = None
    predictions: List[RiskPredictionResponse] = []

    model_config = ConfigDict(from_attributes=True)
