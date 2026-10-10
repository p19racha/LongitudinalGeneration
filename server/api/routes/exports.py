"""
Export endpoints for FHIR-compatible bundles, CSV trajectories, and audit trails.
"""
import csv
import io
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from server.db.session import get_db
from server.crud.patient import get_patient
from server.services.audit_logger import record_audit_event, read_recent_audit_events

router = APIRouter(tags=["Exports"])


@router.get("/patients/{patient_id}/export/fhir")
def export_patient_fhir_bundle(
    patient_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Export longitudinal patient record as an HL7 FHIR R4 Bundle resource.
    Contains Patient and Observation resources (distinguishing directly measured vs. synthesized omics).
    """
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    # FHIR Patient resource
    fhir_patient = {
        "resourceType": "Patient",
        "id": patient.id,
        "identifier": [
            {
                "system": "urn:oid:pulse.cdss.mrn",
                "value": patient.mrn,
            }
        ],
        "name": [
            {
                "text": patient.full_name,
            }
        ],
        "gender": "male" if patient.sex.upper() == "M" else "female",
        "extension": [
            {
                "url": "http://pulse-cdss.ai/fhir/StructureDefinition/cohort-type",
                "valueString": patient.cohort_type.value,
            },
            {
                "url": "http://pulse-cdss.ai/fhir/StructureDefinition/age-years",
                "valueDecimal": float(patient.age),
            },
        ],
    }

    # FHIR Observation resources
    entries: List[Dict[str, Any]] = [
        {"resource": fhir_patient}
    ]

    for visit in patient.visits:
        for m in visit.measurements:
            obs: Dict[str, Any] = {
                "resourceType": "Observation",
                "id": m.id,
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "laboratory",
                                "display": "Laboratory",
                            }
                        ]
                    }
                ],
                "code": {
                    "text": m.feature_name,
                    "coding": [
                        {
                            "system": "http://pulse-cdss.ai/biomarkers",
                            "code": m.feature_name,
                            "display": m.feature_name.replace("_", " ").title(),
                        }
                    ],
                },
                "subject": {
                    "reference": f"Patient/{patient.id}",
                },
                "effectiveDateTime": visit.visit_date,
                "valueQuantity": {
                    "value": round(float(m.value), 4),
                    "unit": m.unit,
                },
                "meta": {
                    "tag": [
                        {
                            "system": "http://pulse-cdss.ai/tag/source-type",
                            "code": "pulse-synthesized" if m.is_synthetic else "direct-laboratory",
                            "display": "PULSE Generative Synthesis" if m.is_synthetic else "Direct Laboratory Assay",
                        }
                    ]
                },
            }

            if m.ref_low is not None and m.ref_high is not None:
                obs["referenceRange"] = [
                    {
                        "low": {"value": m.ref_low, "unit": m.unit},
                        "high": {"value": m.ref_high, "unit": m.unit},
                    }
                ]

            if m.confidence_interval_low is not None and m.confidence_interval_high is not None:
                obs["extension"] = [
                    {
                        "url": "http://pulse-cdss.ai/fhir/StructureDefinition/confidence-interval-95",
                        "valueString": f"[{m.confidence_interval_low:.3f}, {m.confidence_interval_high:.3f}]",
                    }
                ]

            entries.append({"resource": obs})

    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": entries,
        "total": len(entries),
    }

    record_audit_event(
        action="EXPORT_FHIR",
        patient_id=patient.id,
        mrn=patient.mrn,
        details={"entries_count": len(entries)},
    )

    return bundle


@router.get("/patients/{patient_id}/export/csv")
def export_patient_csv(
    patient_id: str,
    db: Session = Depends(get_db),
):
    """
    Export longitudinal measurements as a downloadable CSV dataset.
    """
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "patient_id",
        "mrn",
        "full_name",
        "cohort_type",
        "visit_index",
        "visit_date",
        "hours_from_baseline",
        "feature_name",
        "feature_category",
        "value",
        "unit",
        "ref_low",
        "ref_high",
        "is_synthetic",
        "confidence_interval_low",
        "confidence_interval_high",
    ])

    total_rows = 0
    for v in patient.visits:
        for m in v.measurements:
            writer.writerow([
                patient.id,
                patient.mrn,
                patient.full_name,
                patient.cohort_type.value,
                v.visit_index,
                v.visit_date,
                v.hours_from_baseline,
                m.feature_name,
                m.feature_category,
                round(float(m.value), 4),
                m.unit,
                m.ref_low if m.ref_low is not None else "",
                m.ref_high if m.ref_high is not None else "",
                1 if m.is_synthetic else 0,
                round(float(m.confidence_interval_low), 4) if m.confidence_interval_low is not None else "",
                round(float(m.confidence_interval_high), 4) if m.confidence_interval_high is not None else "",
            ])
            total_rows += 1

    csv_content = output.getvalue()

    record_audit_event(
        action="EXPORT_CSV",
        patient_id=patient.id,
        mrn=patient.mrn,
        details={"rows_exported": total_rows},
    )

    filename = f"{patient.mrn.replace(' ', '_')}_longitudinal_trajectory.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/audit-trail")
def get_audit_trail_events(
    limit: int = 50,
) -> Dict[str, Any]:
    """Retrieve operational and SaMD clinical audit logs."""
    events = read_recent_audit_events(limit=limit)
    return {
        "total": len(events),
        "events": events,
    }
