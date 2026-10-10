"""
Pydantic schemas for risk predictions and explainability drivers.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from server.db.models import RiskCategory, TaskType


class TopDriver(BaseModel):
    feature_name: str
    impact_score: float
    description: str


class RiskPredictionBase(BaseModel):
    task_type: TaskType
    disease_name: str
    risk_probability: float
    risk_category: RiskCategory
    top_drivers: List[TopDriver] = []


class RiskPredictionResponse(RiskPredictionBase):
    id: str
    visit_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
