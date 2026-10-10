"""
CRUD repository operations for Measurement records.
"""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from server.db.models import Measurement
from server.schemas.measurement import MeasurementCreate


def create_measurements_batch(
    db: Session, visit_id: str, measurements_in: List[MeasurementCreate]
) -> List[Measurement]:
    """Insert or update batch of measurements for a visit."""
    records: List[Measurement] = []
    for m in measurements_in:
        db_m = Measurement(
            visit_id=visit_id,
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
        records.append(db_m)

    db.commit()
    for r in records:
        db.refresh(r)
    return records


def get_measurements_by_visit(
    db: Session,
    visit_id: str,
    modality: Optional[str] = None,
    is_synthetic: Optional[bool] = None,
) -> List[Measurement]:
    """Retrieve measurements for a visit with optional modality and synthetic filter."""
    stmt = select(Measurement).where(Measurement.visit_id == visit_id)
    if modality:
        stmt = stmt.where(Measurement.modality == modality)
    if is_synthetic is not None:
        stmt = stmt.where(Measurement.is_synthetic == is_synthetic)

    return list(db.execute(stmt.order_by(Measurement.feature_name.asc())).scalars().all())


def clear_synthetic_measurements(db: Session, visit_id: str) -> int:
    """Clear previously synthesized measurements before a new PULSE run."""
    stmt = select(Measurement).where(
        Measurement.visit_id == visit_id, Measurement.is_synthetic == True  # noqa: E712
    )
    synthetics = db.execute(stmt).scalars().all()
    count = len(synthetics)
    for m in synthetics:
        db.delete(m)
    db.commit()
    return count
