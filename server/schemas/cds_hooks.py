"""
Pydantic schemas for HL7 FHIR CDS Hooks (v1.0/2.0) specification
and Real-Time Clinical Deterioration Alerts.
"""
from typing import Optional, Any, List, Dict
from pydantic import BaseModel, Field


class CDSService(BaseModel):
    hook: str
    title: str
    description: str
    id: str
    prefetch: Optional[Dict[str, str]] = None


class CDSServicesResponse(BaseModel):
    services: List[CDSService]


class CDSHookRequest(BaseModel):
    hook: str
    hookInstance: Optional[str] = None
    fhirServer: Optional[str] = None
    fhirAuthorization: Optional[Dict[str, Any]] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    prefetch: Optional[Dict[str, Any]] = None


class CDSSuggestionAction(BaseModel):
    type: str = "create"
    description: str
    resource: Optional[Dict[str, Any]] = None


class CDSSuggestion(BaseModel):
    label: str
    uuid: Optional[str] = None
    isRecommended: Optional[bool] = True
    actions: Optional[List[CDSSuggestionAction]] = None


class CDSLink(BaseModel):
    label: str
    url: str
    type: str = "absolute"


class CDSSource(BaseModel):
    label: str
    url: Optional[str] = "https://www.nature.com/articles/s43588-026-00957-5"
    icon: Optional[str] = None


class CDSCard(BaseModel):
    uuid: Optional[str] = None
    summary: str
    detail: Optional[str] = None
    indicator: str = "info"  # "info", "warning", "critical"
    source: CDSSource
    suggestions: Optional[List[CDSSuggestion]] = None
    selectionBehavior: Optional[str] = "at-most-one"
    links: Optional[List[CDSLink]] = None


class CDSHookResponse(BaseModel):
    cards: List[CDSCard]


class ClinicalAlert(BaseModel):
    id: str
    patient_id: str
    mrn: str
    patient_name: str
    cohort_type: str
    severity: str  # "CRITICAL", "WARNING", "INFO"
    title: str
    message: str
    disease_task: str
    risk_score: float
    risk_velocity: float
    velocity_direction: str
    created_at: str
    is_acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None


class AlertsListResponse(BaseModel):
    total_alerts: int
    unacknowledged_count: int
    critical_count: int
    alerts: List[ClinicalAlert]


class AcknowledgeAlertPayload(BaseModel):
    acknowledged_by: str = "Attending Clinician"
    note: Optional[str] = None
