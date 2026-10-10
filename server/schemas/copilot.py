"""
Pydantic schemas for Clinical AI Co-Pilot and SBAR handover reporting.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class SBARReport(BaseModel):
    """
    Structured Clinical SBAR (Situation, Background, Assessment, Recommendation) Handover Report.
    """
    patient_id: str
    mrn: str
    full_name: str
    cohort_type: str
    situation: str = Field(..., description="Current acute clinical situation and primary alert")
    background: str = Field(..., description="Pertinent baseline history, demographics, and prior trajectory")
    assessment: str = Field(..., description="Objective clinical findings, synthesized omics, and PULSE prognostic risk score")
    recommendation: str = Field(..., description="Actionable clinical next steps, monitoring goals, and diagnostic verification")
    generated_at: str


class CopilotQueryRequest(BaseModel):
    """
    Incoming query payload for the Clinical AI Co-Pilot.
    """
    query: str = Field(..., min_length=1, description="Natural language clinical question or command")
    include_sbar: bool = Field(False, description="Whether to include structured SBAR handover in response")


class CopilotQueryResponse(BaseModel):
    """
    Response from the Clinical AI Co-Pilot.
    """
    answer: str = Field(..., description="Synthesized clinical response backed by PULSE models and medical guidelines")
    citations: List[str] = Field(default_factory=list, description="Academic literature and clinical practice guideline citations")
    sbar: Optional[SBARReport] = Field(None, description="Structured SBAR handover if requested or indicated")
    suggested_followups: List[str] = Field(default_factory=list, description="Suggested follow-up questions for the clinician")
