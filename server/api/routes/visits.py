"""
Clinical visit and measurements API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from server.db.session import get_db
from server.crud.patient import get_patient
from server.crud.visit import create_visit, get_visit, delete_visit
from server.crud.measurement import create_measurements_batch
from server.db.models import ClinicalNote
from server.schemas.visit import VisitCreate, VisitResponse
from server.schemas.measurement import MeasurementCreate, MeasurementResponse
from server.schemas.note import ClinicalNoteCreate, ClinicalNoteResponse

router = APIRouter(tags=["Visits"])


@router.post("/patients/{patient_id}/visits", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
def add_patient_visit(
    patient_id: str,
    visit_in: VisitCreate,
    db: Session = Depends(get_db),
):
    """Add a new clinical visit/encounter to a patient's timeline."""
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    # Automatically set visit_index if not explicitly set
    if visit_in.visit_index == 0 and len(patient.visits) > 0:
        visit_in.visit_index = len(patient.visits)

    created_visit = create_visit(db, patient_id, visit_in)
    return created_visit


@router.get("/visits/{visit_id}", response_model=VisitResponse)
def get_visit_detail(
    visit_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve visit details with measurements, notes, and predictions."""
    visit = get_visit(db, visit_id)
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visit with ID '{visit_id}' not found.",
        )
    return visit


@router.post("/visits/{visit_id}/measurements", response_model=List[MeasurementResponse])
def add_visit_measurements(
    visit_id: str,
    measurements_in: List[MeasurementCreate],
    db: Session = Depends(get_db),
):
    """Add batch measurements (labs or omics) to an existing visit."""
    visit = get_visit(db, visit_id)
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visit with ID '{visit_id}' not found.",
        )

    records = create_measurements_batch(db, visit_id, measurements_in)
    return records


@router.post("/visits/{visit_id}/notes", response_model=ClinicalNoteResponse, status_code=status.HTTP_201_CREATED)
def add_visit_clinical_note(
    visit_id: str,
    note_in: ClinicalNoteCreate,
    db: Session = Depends(get_db),
):
    """Add a narrative clinical progress or admission note to a visit."""
    visit = get_visit(db, visit_id)
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visit with ID '{visit_id}' not found.",
        )

    db_note = ClinicalNote(
        visit_id=visit_id,
        step_hour=note_in.step_hour,
        note_type=note_in.note_type,
        note_text=note_in.note_text,
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@router.delete("/visits/{visit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_visit_record(
    visit_id: str,
    db: Session = Depends(get_db),
):
    """Delete a visit and all its associated measurements and predictions."""
    success = delete_visit(db, visit_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visit with ID '{visit_id}' not found.",
        )
    return None
