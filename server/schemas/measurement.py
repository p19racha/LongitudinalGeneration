"""
Pydantic schemas for measurement data.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, computed_field, model_validator


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

    @model_validator(mode="before")
    @classmethod
    def handle_client_aliases(cls, data):
        if isinstance(data, dict):
            # map feature_category -> modality
            if "modality" not in data and "feature_category" in data:
                data["modality"] = data["feature_category"]
            # map value -> feature_value
            if "feature_value" not in data and "value" in data:
                data["feature_value"] = data["value"]
            # map ref_low -> reference_low
            if "reference_low" not in data and "ref_low" in data:
                data["reference_low"] = data["ref_low"]
            # map ref_high -> reference_high
            if "reference_high" not in data and "ref_high" in data:
                data["reference_high"] = data["ref_high"]
            # map confidence_interval_low -> confidence_lower
            if "confidence_lower" not in data and "confidence_interval_low" in data:
                data["confidence_lower"] = data["confidence_interval_low"]
            # map confidence_interval_high -> confidence_upper
            if "confidence_upper" not in data and "confidence_interval_high" in data:
                data["confidence_upper"] = data["confidence_interval_high"]
        return data


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
