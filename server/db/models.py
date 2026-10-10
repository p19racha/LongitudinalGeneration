"""
SQLAlchemy database models for PULSE Clinical Decision Support System (CDSS).
"""
from __future__ import annotations

import enum
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.db.base import Base, utc_now


def generate_uuid() -> str:
    """Generate a clean 32-character hex UUID string."""
    return uuid.uuid4().hex


class CohortType(str, enum.Enum):
    OUTPATIENT_CHRONIC = "OUTPATIENT_CHRONIC"
    INPATIENT_ICU = "INPATIENT_ICU"


class ModalityType(str, enum.Enum):
    ROUTINE_LABS = "routine_labs"
    METABOLOMICS = "metabolomics"
    PROTEOMICS = "proteomics"
    RETINAL_FUNDUS = "retinal_fundus"
    VITALS = "vitals"


class TaskType(str, enum.Enum):
    CHRONIC_10Y_RISK = "CHRONIC_10Y_RISK"
    ICU_30D_READMISSION = "ICU_30D_READMISSION"
    ICU_30D_MORTALITY = "ICU_30D_MORTALITY"


class RiskCategory(str, enum.Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Patient(Base):
    """
    Patient master record containing demographics and clinical classification.
    """
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    mrn: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    age: Mapped[float] = mapped_column(Float, nullable=False)
    sex: Mapped[str] = mapped_column(String(16), nullable=False)  # "M" / "F" / "Other"
    cohort_type: Mapped[CohortType] = mapped_column(
        Enum(CohortType), default=CohortType.OUTPATIENT_CHRONIC, nullable=False
    )
    clinical_history_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    # Relationships
    visits: Mapped[List[Visit]] = relationship(
        "Visit",
        back_populates="patient",
        cascade="all, delete-orphan",
        order_by="Visit.visit_index",
    )

    def __repr__(self) -> str:
        return f"<Patient(id='{self.id}', mrn='{self.mrn}', name='{self.full_name}', cohort='{self.cohort_type}')>"


class Visit(Base):
    """
    Chronological clinical encounter for a patient.
    """
    __tablename__ = "visits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    visit_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    visit_date: Mapped[str] = mapped_column(String(64), nullable=False)  # ISO string or date
    hours_from_baseline: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    visit_summary: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        UniqueConstraint("patient_id", "visit_index", name="uq_patient_visit_index"),
        Index("ix_visit_patient_order", "patient_id", "visit_index"),
    )

    # Relationships
    patient: Mapped[Patient] = relationship("Patient", back_populates="visits")
    measurements: Mapped[List[Measurement]] = relationship(
        "Measurement", back_populates="visit", cascade="all, delete-orphan"
    )
    clinical_notes: Mapped[List[ClinicalNote]] = relationship(
        "ClinicalNote", back_populates="visit", cascade="all, delete-orphan"
    )
    latent_state: Mapped[Optional[LatentState]] = relationship(
        "LatentState", back_populates="visit", uselist=False, cascade="all, delete-orphan"
    )
    predictions: Mapped[List[RiskPrediction]] = relationship(
        "RiskPrediction", back_populates="visit", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Visit(id='{self.id}', patient_id='{self.patient_id}', index={self.visit_index}, hours={self.hours_from_baseline})>"


class Measurement(Base):
    """
    Individual laboratory or omics biomarker observation.
    Differentiates directly measured lab values from PULSE synthesized ones.
    """
    __tablename__ = "measurements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    visit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="CASCADE"), index=True, nullable=False
    )
    modality: Mapped[str] = mapped_column(String(64), nullable=False)
    feature_name: Mapped[str] = mapped_column(String(128), nullable=False)
    feature_value: Mapped[float] = mapped_column(Float, nullable=False)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    reference_low: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reference_high: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence_lower: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence_upper: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index("ix_measurement_visit_modality", "visit_id", "modality"),
        Index("ix_measurement_feature", "visit_id", "feature_name"),
    )

    visit: Mapped[Visit] = relationship("Visit", back_populates="measurements")

    def __repr__(self) -> str:
        status = "SYNTHETIC" if self.is_synthetic else "MEASURED"
        return f"<Measurement({self.feature_name}={self.feature_value} {self.unit} [{status}])>"


class ClinicalNote(Base):
    """
    Unstructured narrative note associated with a clinical visit/step (crucial for ICU).
    """
    __tablename__ = "clinical_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    visit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="CASCADE"), index=True, nullable=False
    )
    step_hour: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    note_type: Mapped[str] = mapped_column(String(64), default="PROGRESS", nullable=False)
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    visit: Mapped[Visit] = relationship("Visit", back_populates="clinical_notes")


class LatentState(Base):
    """
    PULSE 16-dimensional latent representations for the visit and past context.
    """
    __tablename__ = "latent_states"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    visit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    z_state_json: Mapped[str] = mapped_column(Text, nullable=False)  # List[float] length 16
    past_state_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # List[float] length 16
    temporal_context_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    visit: Mapped[Visit] = relationship("Visit", back_populates="latent_state")

    def get_z_vector(self) -> List[float]:
        return json.loads(self.z_state_json)

    def set_z_vector(self, vec: List[float]) -> None:
        self.z_state_json = json.dumps(vec)


class RiskPrediction(Base):
    """
    Predicted acute or chronic disease risk scores computed by PULSE.
    """
    __tablename__ = "risk_predictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    visit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="CASCADE"), index=True, nullable=False
    )
    task_type: Mapped[TaskType] = mapped_column(Enum(TaskType), nullable=False)
    disease_name: Mapped[str] = mapped_column(String(64), nullable=False)
    risk_probability: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 - 1.0
    risk_category: Mapped[RiskCategory] = mapped_column(Enum(RiskCategory), nullable=False)
    top_drivers_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index("ix_risk_visit_disease", "visit_id", "disease_name"),
    )

    visit: Mapped[Visit] = relationship("Visit", back_populates="predictions")

    def get_top_drivers(self) -> List[Dict[str, Any]]:
        if not self.top_drivers_json:
            return []
        return json.loads(self.top_drivers_json)

    def set_top_drivers(self, drivers: List[Dict[str, Any]]) -> None:
        self.top_drivers_json = json.dumps(drivers)
