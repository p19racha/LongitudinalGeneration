"""
CRUD repository operations for Patient records.
"""
from typing import List, Optional, Tuple
from sqlalchemy import or_, select, func
from sqlalchemy.orm import Session, selectinload

from server.db.models import Patient, Visit, RiskPrediction
from server.schemas.patient import PatientCreate, PatientUpdate, PatientListItem


def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
    """Retrieve patient with all related visits, measurements, and predictions."""
    stmt = (
        select(Patient)
        .options(
            selectinload(Patient.visits).selectinload(Visit.measurements),
            selectinload(Patient.visits).selectinload(Visit.clinical_notes),
            selectinload(Patient.visits).selectinload(Visit.latent_state),
            selectinload(Patient.visits).selectinload(Visit.predictions),
        )
        .where(Patient.id == patient_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def get_patient_by_mrn(db: Session, mrn: str) -> Optional[Patient]:
    """Retrieve patient by unique MRN."""
    stmt = select(Patient).where(Patient.mrn == mrn)
    return db.execute(stmt).scalar_one_or_none()


def list_patients(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    cohort_type: Optional[str] = None,
    search_query: Optional[str] = None,
) -> Tuple[List[PatientListItem], int]:
    """
    List patients with search, cohort filtering, and summary statistics.
    Returns (list_of_summaries, total_count).
    """
    stmt = select(Patient)

    if cohort_type:
        stmt = stmt.where(Patient.cohort_type == cohort_type)

    if search_query:
        query_pattern = f"%{search_query.strip()}%"
        stmt = stmt.where(
            or_(
                Patient.full_name.ilike(query_pattern),
                Patient.mrn.ilike(query_pattern),
            )
        )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    # Paginated results
    stmt = (
        stmt.options(selectinload(Patient.visits).selectinload(Visit.predictions))
        .order_by(Patient.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    patients = db.execute(stmt).scalars().all()

    items: List[PatientListItem] = []
    for p in patients:
        visit_count = len(p.visits)
        latest_visit_date = p.visits[-1].visit_date if visit_count > 0 else None
        latest_risk = None
        if visit_count > 0 and p.visits[-1].predictions:
            # Pick highest risk prediction
            latest_risk = p.visits[-1].predictions[0].risk_category.value

        items.append(
            PatientListItem(
                id=p.id,
                mrn=p.mrn,
                full_name=p.full_name,
                age=p.age,
                sex=p.sex,
                cohort_type=p.cohort_type,
                clinical_history_summary=p.clinical_history_summary,
                visit_count=visit_count,
                latest_visit_date=latest_visit_date,
                latest_risk_category=latest_risk,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )

    return items, total


def create_patient(db: Session, patient_in: PatientCreate) -> Patient:
    """Create a new patient record."""
    db_patient = Patient(
        mrn=patient_in.mrn,
        full_name=patient_in.full_name,
        age=patient_in.age,
        sex=patient_in.sex,
        cohort_type=patient_in.cohort_type,
        clinical_history_summary=patient_in.clinical_history_summary,
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


def update_patient(db: Session, db_patient: Patient, patient_in: PatientUpdate) -> Patient:
    """Update patient demographic and clinical details."""
    update_data = patient_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_patient, field, value)

    db.commit()
    db.refresh(db_patient)
    return db_patient


def delete_patient(db: Session, patient_id: str) -> bool:
    """Delete patient and all cascaded visits/measurements."""
    db_patient = db.get(Patient, patient_id)
    if not db_patient:
        return False
    db.delete(db_patient)
    db.commit()
    return True
