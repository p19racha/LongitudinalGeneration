"""
Patient management API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from server.db.session import get_db
from server.crud.patient import (
    get_patient,
    get_patient_by_mrn,
    list_patients,
    create_patient,
    update_patient,
    delete_patient,
)
from server.schemas.patient import (
    PatientCreate,
    PatientUpdate,
    PatientListItem,
    PatientDetailResponse,
)

router = APIRouter(prefix="/patients", tags=["Patients"])


class PaginatedPatientsResponse(BaseModel):
    items: List[PatientListItem]
    total: int
    page: int
    limit: int


@router.get("", response_model=PaginatedPatientsResponse)
def get_patients_list(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    cohort_type: Optional[str] = Query(None, description="Filter by cohort (OUTPATIENT_CHRONIC / INPATIENT_ICU)"),
    search: Optional[str] = Query(None, description="Search by name or MRN"),
    db: Session = Depends(get_db),
):
    """List patients with search, cohort filtering, and visit statistics."""
    skip = (page - 1) * limit
    items, total = list_patients(
        db, skip=skip, limit=limit, cohort_type=cohort_type, search_query=search
    )
    return PaginatedPatientsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.post("", response_model=PatientDetailResponse, status_code=status.HTTP_201_CREATED)
def create_new_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
):
    """Create a new patient record."""
    existing = get_patient_by_mrn(db, patient_in.mrn)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient with MRN '{patient_in.mrn}' already exists.",
        )
    created = create_patient(db, patient_in)
    return get_patient(db, created.id)


@router.get("/{patient_id}", response_model=PatientDetailResponse)
def get_patient_detail(
    patient_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve full patient record with chronological visits, measurements, and predictions."""
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )
    return patient


@router.put("/{patient_id}", response_model=PatientDetailResponse)
def update_patient_record(
    patient_id: str,
    patient_in: PatientUpdate,
    db: Session = Depends(get_db),
):
    """Update patient demographic and clinical metadata."""
    patient = get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )
    update_patient(db, patient, patient_in)
    return get_patient(db, patient_id)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_record(
    patient_id: str,
    db: Session = Depends(get_db),
):
    """Delete a patient record and all associated longitudinal visits."""
    success = delete_patient(db, patient_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )
    return None
