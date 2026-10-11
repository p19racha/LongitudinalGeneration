"""
Population Health Analytics, Clinical Triage Radar, and Batch Lab Ingestion Service.
"""
import csv
import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from server.db.models import Patient, Visit, Measurement, RiskPrediction, CohortType
from server.schemas.analytics import (
    CohortOverviewResponse,
    TriageItem,
    TriageRadarResponse,
    BatchImportResult,
)
from server.services.audit_logger import record_audit_event
from server.services.pulse_engine import PulseInferenceService
from server.crud.patient import create_patient
from server.crud.visit import create_visit
from server.crud.measurement import create_measurements_batch
from server.schemas.patient import PatientCreate
from server.schemas.visit import VisitCreate
from server.schemas.measurement import MeasurementCreate


# Standard biomarker aliases for smart CSV mapping
COLUMN_ALIASES: Dict[str, str] = {
    "glucose": "glucose_fasting",
    "fbs": "glucose_fasting",
    "fasting_glucose": "glucose_fasting",
    "blood_glucose": "glucose_fasting",
    "ldl": "ldl_cholesterol",
    "ldl_c": "ldl_cholesterol",
    "hdl": "hdl_cholesterol",
    "hdl_c": "hdl_cholesterol",
    "cholesterol": "cholesterol_total",
    "total_cholesterol": "cholesterol_total",
    "chol": "cholesterol_total",
    "tg": "triglycerides",
    "trig": "triglycerides",
    "cr": "creatinine",
    "creat": "creatinine",
    "urea": "bun",
    "blood_urea_nitrogen": "bun",
    "crp": "crp_hs",
    "hs_crp": "crp_hs",
    "lact": "lactate",
    "leukocytes": "wbc",
    "white_blood_cells": "wbc",
    "plt": "platelets",
    "mean_arterial_pressure": "map",
    "pf_ratio": "pao2_fio2",
}


class AnalyticsService:
    """
    Population health aggregation, clinical triage prioritization, and data ingestion service.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_cohort_overview(self) -> CohortOverviewResponse:
        """
        Aggregate hospital-wide population health statistics across all enrolled cohorts.
        """
        stmt = select(Patient).options(
            selectinload(Patient.visits).selectinload(Visit.measurements),
            selectinload(Patient.visits).selectinload(Visit.predictions),
        )
        patients = self.db.execute(stmt).scalars().all()

        total_patients = len(patients)
        outpatient_count = 0
        icu_count = 0

        risk_dist = {"CRITICAL": 0, "HIGH": 0, "MODERATE": 0, "LOW": 0, "UNSCORED": 0}
        total_visits = 0
        total_measurements = 0
        synthetic_omics_count = 0
        disease_high_risk_counts: Dict[str, int] = {}

        for p in patients:
            cohort_str = p.cohort_type.value if hasattr(p.cohort_type, "value") else str(p.cohort_type)
            if "ICU" in cohort_str:
                icu_count += 1
            else:
                outpatient_count += 1

            visits = p.visits or []
            total_visits += len(visits)

            patient_highest_risk = None
            for v in visits:
                for m in v.measurements:
                    total_measurements += 1
                    if m.is_synthetic:
                        synthetic_omics_count += 1

                for pred in v.predictions:
                    cat = pred.risk_category.value if hasattr(pred.risk_category, "value") else str(pred.risk_category)
                    if cat in ("HIGH", "CRITICAL"):
                        disease_high_risk_counts[pred.disease_name] = disease_high_risk_counts.get(pred.disease_name, 0) + 1

            # Stratify patient based on latest visit
            if visits and visits[-1].predictions:
                latest_preds = visits[-1].predictions
                max_pred = max(latest_preds, key=lambda x: x.risk_probability)
                cat = max_pred.risk_category.value if hasattr(max_pred.risk_category, "value") else str(max_pred.risk_category)
                risk_dist[cat] = risk_dist.get(cat, 0) + 1
            else:
                risk_dist["UNSCORED"] += 1

        avg_encounters = round(total_visits / max(1, total_patients), 2)
        synthesis_rate = round((synthetic_omics_count / max(1, total_measurements)) * 100, 1)

        prevalent_diseases = [
            {"disease": d.replace("_", " ").title(), "count": c}
            for d, c in sorted(disease_high_risk_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        return CohortOverviewResponse(
            total_patients=total_patients,
            outpatient_count=outpatient_count,
            icu_count=icu_count,
            risk_distribution=risk_dist,
            average_encounters_per_patient=avg_encounters,
            total_measurements=total_measurements,
            synthetic_omics_count=synthetic_omics_count,
            omics_synthesis_rate_pct=synthesis_rate,
            prevalent_high_risk_diseases=prevalent_diseases,
        )

    def get_triage_radar(self) -> TriageRadarResponse:
        """
        Compute longitudinal risk velocity and prioritize clinical triage radar.
        """
        stmt = select(Patient).options(
            selectinload(Patient.visits).selectinload(Visit.predictions),
        )
        patients = self.db.execute(stmt).scalars().all()

        triage_items: List[TriageItem] = []
        urgent_count = 0

        for p in patients:
            cohort_str = p.cohort_type.value if hasattr(p.cohort_type, "value") else str(p.cohort_type)
            visits = p.visits or []

            if not visits:
                continue

            latest_visit = visits[-1]
            first_visit = visits[0]
            latest_preds = latest_visit.predictions or []

            if not latest_preds:
                triage_items.append(
                    TriageItem(
                        patient_id=p.id,
                        mrn=p.mrn,
                        full_name=p.full_name,
                        cohort_type=cohort_str,
                        latest_risk_score=0.0,
                        latest_risk_category="UNSCORED",
                        primary_disease="Awaiting Inference",
                        risk_velocity=0.0,
                        velocity_direction="STABLE",
                        is_urgent=False,
                        latest_visit_date=latest_visit.visit_date,
                        total_visits=len(visits),
                    )
                )
                continue

            # Pick highest risk prediction on latest visit
            primary_pred = max(latest_preds, key=lambda x: x.risk_probability)
            latest_score = float(primary_pred.risk_probability)
            category_str = (
                primary_pred.risk_category.value
                if hasattr(primary_pred.risk_category, "value")
                else str(primary_pred.risk_category)
            )

            # Compute longitudinal velocity
            velocity = 0.0
            if len(visits) > 1 and first_visit.predictions:
                # Find matching disease on baseline visit if possible
                first_matching = next(
                    (pr for pr in first_visit.predictions if pr.disease_name == primary_pred.disease_name),
                    first_visit.predictions[0] if first_visit.predictions else None,
                )
                if first_matching:
                    prev_score = float(first_matching.risk_probability)
                    velocity = round((latest_score - prev_score) / max(1, len(visits) - 1), 3)

            # Direction
            if velocity > 0.04:
                direction = "ACCELERATING_UP"
            elif velocity < -0.04:
                direction = "IMPROVING_DOWN"
            else:
                direction = "STABLE"

            # Urgency criterion
            is_urgent = (
                category_str == "CRITICAL"
                or (category_str == "HIGH" and velocity >= 0)
                or velocity >= 0.15
            )
            if is_urgent:
                urgent_count += 1

            triage_items.append(
                TriageItem(
                    patient_id=p.id,
                    mrn=p.mrn,
                    full_name=p.full_name,
                    cohort_type=cohort_str,
                    latest_risk_score=round(latest_score, 3),
                    latest_risk_category=category_str,
                    primary_disease=primary_pred.disease_name.replace("_", " ").title(),
                    risk_velocity=velocity,
                    velocity_direction=direction,
                    is_urgent=is_urgent,
                    latest_visit_date=latest_visit.visit_date,
                    total_visits=len(visits),
                )
            )

        # Sort: Urgent first, then highest risk score, then highest positive velocity
        triage_items.sort(
            key=lambda x: (1 if x.is_urgent else 0, x.latest_risk_score, x.risk_velocity),
            reverse=True,
        )

        return TriageRadarResponse(
            total_patients_analyzed=len(patients),
            urgent_count=urgent_count,
            triage_queue=triage_items,
        )

    def import_csv_data(
        self, csv_content: str, auto_run_pulse: bool = True
    ) -> BatchImportResult:
        """
        Parse multi-patient laboratory time-series CSV and ingest into database.
        """
        f = io.StringIO(csv_content)
        reader = csv.DictReader(f)

        if not reader.fieldnames:
            return BatchImportResult(
                patients_created=0,
                visits_created=0,
                measurements_created=0,
                pulse_runs_triggered=0,
                errors=["CSV file is empty or missing headers."],
            )

        # Normalize header keys
        header_map = {}
        for h in reader.fieldnames:
            cleaned = h.strip().lower().replace(" ", "_").replace("-", "_")
            canonical = COLUMN_ALIASES.get(cleaned, cleaned)
            header_map[h] = canonical

        patients_created = 0
        visits_created = 0
        measurements_created = 0
        pulse_runs = 0
        errors = []
        touched_patient_ids = set()

        rows = list(reader)
        # Group by MRN
        grouped_by_mrn: Dict[str, List[Dict[str, str]]] = {}
        for r_idx, row in enumerate(rows, start=2):
            mrn_key = next((k for k in row if header_map.get(k) == "mrn"), None)
            mrn = row.get(mrn_key, "").strip() if mrn_key else ""
            if not mrn:
                errors.append(f"Row {r_idx}: Missing required 'mrn' field.")
                continue
            grouped_by_mrn.setdefault(mrn, []).append(row)

        for mrn, patient_rows in grouped_by_mrn.items():
            try:
                # Find or create patient
                stmt = select(Patient).where(Patient.mrn == mrn)
                db_patient = self.db.execute(stmt).scalar_one_or_none()

                first_row = patient_rows[0]
                if not db_patient:
                    # Resolve patient metadata
                    name_key = next((k for k in first_row if header_map.get(k) in ("full_name", "name", "patient_name")), None)
                    full_name = first_row.get(name_key, f"Imported Patient ({mrn})").strip() if name_key else f"Imported Patient ({mrn})"

                    age_key = next((k for k in first_row if header_map.get(k) == "age"), None)
                    age_val = float(first_row.get(age_key, 60)) if age_key and first_row.get(age_key) else 60.0

                    sex_key = next((k for k in first_row if header_map.get(k) in ("sex", "gender")), None)
                    sex_val = first_row.get(sex_key, "M").strip().upper() if sex_key else "M"
                    if sex_val not in ("M", "F"):
                        sex_val = "M"

                    cohort_key = next((k for k in first_row if header_map.get(k) == "cohort_type"), None)
                    cohort_raw = first_row.get(cohort_key, "OUTPATIENT_CHRONIC").strip().upper() if cohort_key else "OUTPATIENT_CHRONIC"
                    cohort_enum = CohortType.INPATIENT_ICU if "ICU" in cohort_raw else CohortType.OUTPATIENT_CHRONIC

                    p_in = PatientCreate(
                        mrn=mrn,
                        full_name=full_name,
                        age=age_val,
                        sex=sex_val,
                        cohort_type=cohort_enum.value,
                        clinical_history_summary="Batch ingested via clinical CSV import pipeline.",
                    )
                    db_patient = create_patient(self.db, p_in)
                    patients_created += 1

                touched_patient_ids.add(db_patient.id)

                # Process encounter visits
                existing_visits_count = len(db_patient.visits) if db_patient.visits else 0
                for v_idx, row in enumerate(patient_rows, start=1):
                    date_key = next((k for k in row if header_map.get(k) in ("visit_date", "date", "timestamp")), None)
                    visit_date = row.get(date_key, datetime.now(timezone.utc).strftime("%Y-%m-%d")) if date_key else datetime.now(timezone.utc).strftime("%Y-%m-%d")

                    hours_key = next((k for k in row if header_map.get(k) in ("hours_from_baseline", "hours", "hour")), None)
                    hours_val = float(row.get(hours_key, (v_idx - 1) * 8760)) if hours_key and row.get(hours_key) else float((v_idx - 1) * 8760)

                    v_in = VisitCreate(
                        visit_index=existing_visits_count + v_idx,
                        visit_date=visit_date,
                        hours_from_baseline=hours_val,
                        visit_summary="CSV Batch Import Encounter",
                    )
                    db_visit = create_visit(self.db, db_patient.id, v_in)
                    visits_created += 1

                    # Extract laboratory measurements from row
                    meas_list = []
                    for col_raw, col_norm in header_map.items():
                        if col_norm in ("mrn", "full_name", "name", "patient_name", "age", "sex", "gender", "cohort_type", "visit_date", "date", "hours_from_baseline", "hours", "hour"):
                            continue
                        val_str = row.get(col_raw, "").strip()
                        if val_str:
                            try:
                                num_val = float(val_str)
                                meas_list.append(
                                    MeasurementCreate(
                                        modality="routine_labs",
                                        feature_name=col_norm,
                                        feature_value=num_val,
                                        is_synthetic=False,
                                    )
                                )
                            except ValueError:
                                pass

                    if meas_list:
                        create_measurements_batch(self.db, db_visit.id, meas_list)
                        measurements_created += len(meas_list)

            except Exception as e:
                errors.append(f"Patient {mrn}: {str(e)}")

        # Execute automatic PULSE synthesis if requested
        if auto_run_pulse:
            inference_engine = PulseInferenceService.get_instance()
            for p_id in touched_patient_ids:
                try:
                    inference_engine.run_synthesis_and_prediction(self.db, p_id)
                    pulse_runs += 1
                except Exception as e:
                    errors.append(f"PULSE Synthesis for {p_id} failed: {str(e)}")

        # Record audit log
        record_audit_event(
            action="BATCH_CSV_IMPORT",
            patient_id="MULTIPLE",
            mrn=f"{len(grouped_by_mrn)}_PATIENTS",
            operator="CLINICAL_DATA_PIPELINE",
            details={
                "patients_created": patients_created,
                "visits_created": visits_created,
                "measurements_created": measurements_created,
                "pulse_runs": pulse_runs,
            },
        )

        return BatchImportResult(
            patients_created=patients_created,
            visits_created=visits_created,
            measurements_created=measurements_created,
            pulse_runs_triggered=pulse_runs,
            errors=errors,
        )
