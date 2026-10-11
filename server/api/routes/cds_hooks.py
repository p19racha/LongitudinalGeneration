"""
FastAPI Routes for HL7 FHIR CDS Hooks and Clinical Deterioration Alerts.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from server.db.session import get_db
from server.schemas.cds_hooks import (
    CDSServicesResponse,
    CDSHookRequest,
    CDSHookResponse,
    ClinicalAlert,
    AlertsListResponse,
    AcknowledgeAlertPayload,
)
from server.services.cds_hooks_service import CDSHooksService
from server.services.alert_service import AlertService

cds_hooks_router = APIRouter(tags=["CDS Hooks & Clinical Alerts"])


# --- Official HL7 CDS Hooks Endpoints ---

@cds_hooks_router.get(
    "/cds-services",
    response_model=CDSServicesResponse,
    summary="CDS Service Discovery",
    description="Returns list of available HL7 CDS Hooks services conforming to official specification.",
)
@cds_hooks_router.get(
    "/api/cds-services",
    response_model=CDSServicesResponse,
    include_in_schema=False,
)
def cds_service_discovery():
    service = CDSHooksService.get_instance()
    return service.get_services()


@cds_hooks_router.post(
    "/cds-services/pulse-patient-view",
    response_model=CDSHookResponse,
    summary="Evaluate patient-view Hook",
    description="Evaluates patient record when chart is opened and returns calibrated clinical decision cards.",
)
@cds_hooks_router.post(
    "/api/cds-services/pulse-patient-view",
    response_model=CDSHookResponse,
    include_in_schema=False,
)
def evaluate_patient_view(
    request: CDSHookRequest,
    db: Session = Depends(get_db),
):
    service = CDSHooksService.get_instance()
    return service.handle_patient_view(request, db)


@cds_hooks_router.post(
    "/cds-services/pulse-order-select",
    response_model=CDSHookResponse,
    summary="Evaluate order-select Hook",
    description="Evaluates draft laboratory or medication orders against synthesized organ trajectories.",
)
def evaluate_order_select(
    request: CDSHookRequest,
    db: Session = Depends(get_db),
):
    service = CDSHooksService.get_instance()
    return service.handle_order_select(request, db)


# --- Real-Time Clinical Deterioration Alert Endpoints ---

@cds_hooks_router.get(
    "/api/alerts",
    response_model=AlertsListResponse,
    summary="Get Clinical Deterioration Alerts",
    description="Returns all active clinical alerts with urgency badges and velocity ranking.",
)
def get_alerts(
    unacknowledged_only: bool = False,
    db: Session = Depends(get_db),
):
    alert_service = AlertService.get_instance()
    # If no alerts cached yet, run an initial scan
    alerts_data = alert_service.get_alerts(unacknowledged_only=unacknowledged_only)
    if alerts_data.total_alerts == 0:
        alerts_data = alert_service.scan_all_patients(db)
        if unacknowledged_only:
            alerts_data = alert_service.get_alerts(unacknowledged_only=True)
    return alerts_data


@cds_hooks_router.post(
    "/api/alerts/{alert_id}/acknowledge",
    response_model=ClinicalAlert,
    summary="Acknowledge Clinical Alert",
    description="Marks a clinical alert as reviewed by an attending clinician with 21 CFR Part 11 audit logging.",
)
def acknowledge_alert(
    alert_id: str,
    payload: AcknowledgeAlertPayload,
    db: Session = Depends(get_db),
):
    alert_service = AlertService.get_instance()
    alert = alert_service.acknowledge_alert(
        alert_id=alert_id,
        acknowledged_by=payload.acknowledged_by,
        note=payload.note,
        db=db,
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found.",
        )
    return alert


@cds_hooks_router.post(
    "/api/alerts/scan",
    response_model=AlertsListResponse,
    summary="Trigger Registry Deterioration Scan",
    description="Scans all patients across the registry and populates acute deterioration alerts.",
)
def trigger_alert_scan(
    db: Session = Depends(get_db),
):
    alert_service = AlertService.get_instance()
    return alert_service.scan_all_patients(db)
