"""
CRUD repository operations for Visit records.
"""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from server.db.models import Visit, Measurement, ClinicalNote
from server.schemas.visit import VisitCreate


def get_visit(db: Session, visit_id: str) -> Optional[Visit]:
    """Retrieve single visit with measurements, notes, and predictions."""
    stmt = (
        select(Visit)
        .options(
            selectinload(Visit.measurements),
            selectinload(Visit.clinical_notes),
            selectinload(Visit.latent_state),
            selectinload(Visit.predictions),
        )
        .where(Visit.id == visit_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def list_visits_by_patient(db: Session, patient_id: str) -> List[Visit]:
    """List all visits for a patient in chronological sequence."""
    stmt = (
        select(Visit)
        .options(
            selectinload(Visit.measurements),
            selectinload(Visit.clinical_notes),
            selectinload(Visit.latent_state),
            selectinload(Visit.predictions),
        )
        .where(Visit.patient_id == patient_id)
        .order_by(Visit.visit_index.asc())
    )
    return list(db.execute(stmt).scalars().all())


def create_visit(db: Session, patient_id: str, visit_in: VisitCreate) -> Visit:
    """Create a new clinical visit along with initial measurements and notes."""
    db_visit = Visit(
        patient_id=patient_id,
        visit_index=visit_in.visit_index,
        visit_date=visit_in.visit_date,
        hours_from_baseline=visit_in.hours_from_baseline,
        visit_summary=visit_in.visit_summary,
    )
    db.add(db_visit)
    db.flush()  # assign ID to db_visit

    # Add initial measurements
    for m in visit_in.measurements:
        db_m = Measurement(
            visit_id=db_visit.id,
            modality=m.modality,
            feature_name=m.feature_name,
            feature_value=m.feature_value,
            is_synthetic=m.is_synthetic,
            unit=m.unit,
            reference_low=m.reference_low,
            reference_high=m.reference_high,
            confidence_lower=m.confidence_lower,
            confidence_upper=m.confidence_upper,
        )
        db.add(db_m)

    # Add clinical notes
    for n in visit_in.clinical_notes:
        db_n = ClinicalNote(
            visit_id=db_visit.id,
            step_hour=n.step_hour,
            note_type=n.note_type,
            note_text=n.note_text,
        )
        db.add(db_n)

    db.commit()
    return get_visit(db, db_visit.id)  # return reloaded object with relationships


def delete_visit(db: Session, visit_id: str) -> bool:
    """Delete a visit."""
    db_visit = db.get(Visit, visit_id)
    if not db_visit:
        return False
    db.delete(db_visit)
    db.commit()
    return True
