"""
Pydantic schemas for clinical notes.
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ClinicalNoteBase(BaseModel):
    step_hour: float = 0.0
    note_type: str = "PROGRESS"
    note_text: str


class ClinicalNoteCreate(ClinicalNoteBase):
    pass


class ClinicalNoteResponse(ClinicalNoteBase):
    id: str
    visit_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
