"""
Pydantic schemas for measurement data.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MeasurementBase(BaseModel):
    modality: str
    feature_name: str
    feature_value: float
    is_synthetic: bool = False
    unit: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None


class MeasurementCreate(MeasurementBase):
    pass


class MeasurementResponse(MeasurementBase):
    id: str
    visit_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
