"""
Pydantic schemas for patient records.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from server.db.models import CohortType
from server.schemas.visit import VisitResponse


class PatientBase(BaseModel):
    mrn: str
    full_name: str
    age: float
    sex: str
    cohort_type: CohortType = CohortType.OUTPATIENT_CHRONIC
    clinical_history_summary: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[float] = None
    sex: Optional[str] = None
    cohort_type: Optional[CohortType] = None
    clinical_history_summary: Optional[str] = None


class PatientListItem(PatientBase):
    id: str
    visit_count: int = 0
    latest_visit_date: Optional[str] = None
    latest_risk_category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientDetailResponse(PatientBase):
    id: str
    created_at: datetime
    updated_at: datetime
    visits: List[VisitResponse] = []

    model_config = ConfigDict(from_attributes=True)
