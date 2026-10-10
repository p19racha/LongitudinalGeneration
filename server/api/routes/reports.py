"""
Clinical Decision Support Report API endpoints.
"""
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from server.db.session import get_db
from server.crud.patient import get_patient
from server.db.models import CohortType, RiskCategory

router = APIRouter(tags=["Reports"])


class ClinicalActionItem(BaseModel):
    category: str
    urgency: str  # "ROUTINE", "PRIORITY", "URGENT"
    recommendation: str


class ClinicalReportResponse(BaseModel):
    patient_id: str
    mrn: str
    full_name: str
    age: float
    sex: str
    cohort_type: str
    total_visits: int
    baseline_date: str
    latest_visit_date: str
    latest_visit_summary: str
    risk_summary: List[Dict[str, Any]]
    synthesized_markers_count: int
    measured_markers_count: int
    action_items: List[ClinicalActionItem]
    clinical_disclaimer: str


@router.get("/patients/{patient_id}/report", response_model=ClinicalReportResponse)
def generate_patient_clinical_report(
    patient_id: str,
    db: Session = Depends(get_db),
):
    """Generate a printable clinical decision summary report with risk stratification and recommendations."""
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    if len(patient.visits) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate report for a patient with no visits.",
        )

    latest_visit = patient.visits[-1]
    baseline_visit = patient.visits[0]

    synth_count = sum(1 for m in latest_visit.measurements if m.is_synthetic)
    meas_count = sum(1 for m in latest_visit.measurements if not m.is_synthetic)

    # Format risk summary
    risk_summary: List[Dict[str, Any]] = []
    action_items: List[ClinicalActionItem] = []

    for p in latest_visit.predictions:
        drivers = p.get_top_drivers()
        risk_summary.append({
            "disease_name": p.disease_name,
            "risk_probability": p.risk_probability,
            "risk_percentage": f"{p.risk_probability * 100:.1f}%",
            "risk_category": p.risk_category.value,
            "top_drivers": drivers,
        })

        # Generate action items based on risk
        if p.disease_name in ("myocardial_infarction", "heart_failure") and p.risk_category in (RiskCategory.HIGH, RiskCategory.CRITICAL):
            action_items.append(
                ClinicalActionItem(
                    category="Cardiovascular Prevention",
                    urgency="PRIORITY",
                    recommendation="Cardiology consultation recommended. Consider initiating or optimizing high-intensity statin therapy and reviewing echocardiographic ventricular parameters.",
                )
            )
        elif p.disease_name == "dementia" and p.risk_category in (RiskCategory.HIGH, RiskCategory.CRITICAL):
            action_items.append(
                ClinicalActionItem(
                    category="Neurology / Cognitive Assessment",
                    urgency="PRIORITY",
                    recommendation="Elevated neuroaxonal / astrocytic biomarker trajectory. Recommend comprehensive neurocognitive battery (MoCA/MMSE) and referral for dedicated memory evaluation.",
                )
            )
        elif p.disease_name == "diabetes" and p.risk_category in (RiskCategory.HIGH, RiskCategory.CRITICAL):
            action_items.append(
                ClinicalActionItem(
                    category="Endocrine & Glycemic Control",
                    urgency="PRIORITY",
                    recommendation="Glycated hemoglobin in diabetic range. Recommend lifestyle intervention, continuous glucose monitoring evaluation, and initial metformin therapy.",
                )
            )
        elif p.disease_name == "icu_readmission" and p.risk_category in (RiskCategory.HIGH, RiskCategory.CRITICAL):
            action_items.append(
                ClinicalActionItem(
                    category="Critical Care Discharge Safety",
                    urgency="URGENT",
                    recommendation="High risk of 30-day ICU readmission. Delay step-down transfer until hemodynamic lactate clearance stability and respiratory weaning criteria are fully documented.",
                )
            )

    if not action_items:
        action_items.append(
            ClinicalActionItem(
                category="General Preventive Care",
                urgency="ROUTINE",
                recommendation="Patient physiological markers remain stable within expected baseline parameters. Continue routine annual outpatient follow-up.",
            )
        )

    disclaimer = (
        "IMPORTANT MEDICAL NOTICE: PULSE Decision Support Engine is an investigational software-as-a-medical-device (SaMD) tool. "
        "Synthesized molecular biomarkers (metabolomics and proteomics) represent statistical generative reconstructions inferred from "
        "longitudinal routine panels and clinical priors. All recommendations must be correlated with clinical judgment, direct confirmatory "
        "laboratory testing, and diagnostic imaging."
    )

    return ClinicalReportResponse(
        patient_id=patient.id,
        mrn=patient.mrn,
        full_name=patient.full_name,
        age=patient.age,
        sex=patient.sex,
        cohort_type=patient.cohort_type.value,
        total_visits=len(patient.visits),
        baseline_date=baseline_visit.visit_date,
        latest_visit_date=latest_visit.visit_date,
        latest_visit_summary=latest_visit.visit_summary or "Clinical Encounter",
        risk_summary=risk_summary,
        synthesized_markers_count=synth_count,
        measured_markers_count=meas_count,
        action_items=action_items,
        clinical_disclaimer=disclaimer,
    )
