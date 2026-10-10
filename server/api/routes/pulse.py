"""
PULSE synthesis and longitudinal trajectory API endpoints.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from server.db.session import get_db
from server.crud.patient import get_patient
from server.schemas.patient import PatientDetailResponse
from server.services.pulse_engine import PulseInferenceService
from server.services.feature_definitions import get_feature_meta

router = APIRouter(tags=["PULSE Engine"])


class RunPulseResponse(BaseModel):
    message: str
    patient: PatientDetailResponse
    synthesized_measurements_count: int
    latent_states_count: int
    predictions_count: int


class TrajectoryPoint(BaseModel):
    visit_id: str
    visit_index: int
    visit_date: str
    hours_from_baseline: float
    feature_value: float
    is_synthetic: bool
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None


class FeatureTrajectory(BaseModel):
    feature_name: str
    display_name: str
    modality: str
    unit: Optional[str] = None
    category: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    points: List[TrajectoryPoint]


class PatientTrajectoriesResponse(BaseModel):
    patient_id: str
    mrn: str
    full_name: str
    features: List[FeatureTrajectory]


@router.post("/patients/{patient_id}/run-pulse", response_model=RunPulseResponse)
def execute_pulse_synthesis(
    patient_id: str,
    db: Session = Depends(get_db),
):
    """
    Execute on-demand PULSE longitudinal synthesis and multi-disease risk forecasting.
    - Encodes chronological observed labs.
    - Propagates historical latent prior state (Z_P) via temporal autoregression.
    - Imputes missing metabolomics and proteomics profiles.
    - Computes calibrated disease risk scorecards and top explainability drivers.
    """
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    if len(patient.visits) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot run PULSE on a patient record without clinical visits.",
        )

    service = PulseInferenceService.get_instance()
    updated_patient = service.run_synthesis_and_prediction(db, patient_id)

    # Compute output summary stats
    synth_count = 0
    pred_count = 0
    latent_count = 0
    for v in updated_patient.visits:
        synth_count += sum(1 for m in v.measurements if m.is_synthetic)
        pred_count += len(v.predictions)
        if v.latent_state:
            latent_count += 1

    from server.services.audit_logger import record_audit_event
    record_audit_event(
        action="PULSE_SYNTHESIS_EXECUTION",
        patient_id=patient.id,
        mrn=patient.mrn,
        details={
            "synthesized_measurements": synth_count,
            "latent_states": latent_count,
            "predictions": pred_count,
        },
    )

    return RunPulseResponse(
        message="PULSE synthesis and risk assessment successfully executed.",
        patient=updated_patient,
        synthesized_measurements_count=synth_count,
        latent_states_count=latent_count,
        predictions_count=pred_count,
    )


class InterventionSimulationRequest(BaseModel):
    interventions: Dict[str, float]


@router.post("/patients/{patient_id}/simulate-intervention")
def simulate_counterfactual_intervention(
    patient_id: str,
    payload: InterventionSimulationRequest,
    db: Session = Depends(get_db),
):
    """
    Simulate what-if counterfactual intervention targets (PULSE Digital Twin Sandbox).
    """
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )
    if not patient.visits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot simulate interventions for patient with no visits.",
        )

    service = PulseInferenceService.get_instance()
    try:
        result = service.simulate_counterfactual_intervention(
            db, patient_id, payload.interventions
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/patients/{patient_id}/trajectories", response_model=PatientTrajectoriesResponse)
def get_patient_trajectories(
    patient_id: str,
    modality: Optional[str] = Query(None, description="Optional modality filter"),
    db: Session = Depends(get_db),
):
    """
    Retrieve longitudinal trend curves across time for all biomarkers (measured and synthesized).
    Formatted for Recharts visualization.
    """
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    feature_points_map: Dict[str, List[TrajectoryPoint]] = {}

    for visit in patient.visits:
        for m in visit.measurements:
            if modality and m.modality != modality:
                continue

            if m.feature_name not in feature_points_map:
                feature_points_map[m.feature_name] = []

            feature_points_map[m.feature_name].append(
                TrajectoryPoint(
                    visit_id=visit.id,
                    visit_index=visit.visit_index,
                    visit_date=visit.visit_date,
                    hours_from_baseline=visit.hours_from_baseline,
                    feature_value=m.feature_value,
                    is_synthetic=m.is_synthetic,
                    confidence_lower=m.confidence_lower,
                    confidence_upper=m.confidence_upper,
                    reference_low=m.reference_low,
                    reference_high=m.reference_high,
                )
            )

    trajectories: List[FeatureTrajectory] = []
    for feat_name, points in feature_points_map.items():
        meta = get_feature_meta(feat_name)
        trajectories.append(
            FeatureTrajectory(
                feature_name=feat_name,
                display_name=meta.display_name if meta else feat_name,
                modality=meta.modality if meta else "unknown",
                unit=meta.unit if meta else None,
                category=meta.category if meta else None,
                reference_low=meta.ref_low if meta else None,
                reference_high=meta.ref_high if meta else None,
                points=sorted(points, key=lambda p: p.visit_index),
            )
        )

    return PatientTrajectoriesResponse(
        patient_id=patient.id,
        mrn=patient.mrn,
        full_name=patient.full_name,
        features=trajectories,
    )
