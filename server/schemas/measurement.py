"""
Pydantic schemas for measurement data.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, computed_field


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

    @computed_field
    @property
    def value(self) -> float:
        """Alias for feature_value for client compatibility."""
        return self.feature_value

    @computed_field
    @property
    def feature_category(self) -> str:
        """Alias for modality for client compatibility."""
        return self.modality

    @computed_field
    @property
    def ref_low(self) -> Optional[float]:
        """Alias for reference_low for client compatibility."""
        return self.reference_low

    @computed_field
    @property
    def ref_high(self) -> Optional[float]:
        """Alias for reference_high for client compatibility."""
        return self.reference_high

    @computed_field
    @property
    def confidence_interval_low(self) -> Optional[float]:
        """Alias for confidence_lower for client compatibility."""
        return self.confidence_lower

    @computed_field
    @property
    def confidence_interval_high(self) -> Optional[float]:
        """Alias for confidence_upper for client compatibility."""
        return self.confidence_upper
