"""
Clinical Deterioration Alert Rule Engine and Notification Service.
Tracks longitudinal patient state velocity, generates calibrated alerts,
manages acknowledgment workflows, and maintains 21 CFR Part 11 audit trails.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from server.db.models import Patient, Visit, RiskPrediction, Measurement
from server.schemas.cds_hooks import ClinicalAlert, AlertsListResponse
from server.services.audit_logger import record_audit_event


class AlertService:
    _instance: Optional["AlertService"] = None

    def __init__(self):
        self._alerts: Dict[str, ClinicalAlert] = {}

    @classmethod
    def get_instance(cls) -> "AlertService":
        if cls._instance is None:
            cls._instance = AlertService()
        return cls._instance

    def evaluate_patient_alerts(self, patient: Patient) -> List[ClinicalAlert]:
        """
        Evaluate clinical deterioration rules for an individual patient
        based on longitudinal trajectory dynamics and latest PULSE risk predictions.
        """
        visits = patient.visits or []
        if not visits:
            return []

        latest_visit = visits[-1]
        first_visit = visits[0]
        latest_preds = latest_visit.predictions or []
        if not latest_preds:
            return []

        # Find highest risk prediction on latest encounter
        primary_pred = max(latest_preds, key=lambda x: x.risk_probability)
        latest_score = float(primary_pred.risk_probability)
        category_str = (
            primary_pred.risk_category.value
            if hasattr(primary_pred.risk_category, "value")
            else str(primary_pred.risk_category)
        )
        cohort_str = (
            patient.cohort_type.value
            if hasattr(patient.cohort_type, "value")
            else str(patient.cohort_type)
        )

        # Compute longitudinal risk velocity
        velocity = 0.0
        if len(visits) > 1 and first_visit.predictions:
            first_match = next(
                (pr for pr in first_visit.predictions if pr.disease_name == primary_pred.disease_name),
                first_visit.predictions[0] if first_visit.predictions else None,
            )
            if first_match:
                prev_score = float(first_match.risk_probability)
                velocity = round((latest_score - prev_score) / max(1, len(visits) - 1), 3)

        if velocity > 0.04:
            velocity_direction = "ACCELERATING_UP"
        elif velocity < -0.04:
            velocity_direction = "IMPROVING_DOWN"
        else:
            velocity_direction = "STABLE"

        generated_alerts: List[ClinicalAlert] = []
        now_iso = datetime.now(timezone.utc).isoformat()

        # Rule 1: ICU Acute Sepsis / Shock Deterioration
        if cohort_str == "INPATIENT_ACUTE_ICU":
            if latest_score >= 0.65 or velocity >= 0.12 or category_str == "CRITICAL":
                alert_id = f"alt-icu-{patient.id[:8]}-{primary_pred.disease_name}"
                title = f"CRITICAL DETERIORATION: Acute {primary_pred.disease_name.replace('_', ' ').title()}"
                message = (
                    f"Acute ICU trajectory shows high deterioration probability ({int(latest_score * 100)}%) "
                    f"with velocity {velocity:+.3f}/interval ({velocity_direction}). Immediate clinical re-evaluation, "
                    f"hemodynamic titration, and sepsis bundle adherence indicated."
                )
                alert = ClinicalAlert(
                    id=alert_id,
                    patient_id=patient.id,
                    mrn=patient.mrn,
                    patient_name=patient.full_name,
                    cohort_type=cohort_str,
                    severity="CRITICAL",
                    title=title,
                    message=message,
                    disease_task=primary_pred.disease_name,
                    risk_score=latest_score,
                    risk_velocity=velocity,
                    velocity_direction=velocity_direction,
                    created_at=now_iso,
                    is_acknowledged=False,
                )
                generated_alerts.append(alert)
            elif latest_score >= 0.40 or velocity > 0.05:
                alert_id = f"alt-icu-warn-{patient.id[:8]}-{primary_pred.disease_name}"
                title = f"WARNING: ICU Trajectory Escalation ({primary_pred.disease_name.replace('_', ' ').title()})"
                message = (
                    f"Patient demonstrates rising organ dysfunction score ({int(latest_score * 100)}%, {velocity_direction}). "
                    f"Monitor arterial lactate and fluid responsiveness."
                )
                alert = ClinicalAlert(
                    id=alert_id,
                    patient_id=patient.id,
                    mrn=patient.mrn,
                    patient_name=patient.full_name,
                    cohort_type=cohort_str,
                    severity="WARNING",
                    title=title,
                    message=message,
                    disease_task=primary_pred.disease_name,
                    risk_score=latest_score,
                    risk_velocity=velocity,
                    velocity_direction=velocity_direction,
                    created_at=now_iso,
                    is_acknowledged=False,
                )
                generated_alerts.append(alert)

        # Rule 2: Outpatient Chronic Multi-Morbidity & Accelerated Divergence
        else:
            if latest_score >= 0.50 or (latest_score >= 0.35 and velocity >= 0.08) or category_str == "CRITICAL":
                alert_id = f"alt-op-crit-{patient.id[:8]}-{primary_pred.disease_name}"
                title = f"CRITICAL: Accelerated 10-Year {primary_pred.disease_name.replace('_', ' ').title()} Risk"
                message = (
                    f"Synthesized deep omics and longitudinal clinical trends reveal critical 10-year risk ({int(latest_score * 100)}%, {velocity_direction}). "
                    f"Multidisciplinary specialty referral and guideline-directed medical therapy recommended."
                )
                alert = ClinicalAlert(
                    id=alert_id,
                    patient_id=patient.id,
                    mrn=patient.mrn,
                    patient_name=patient.full_name,
                    cohort_type=cohort_str,
                    severity="CRITICAL",
                    title=title,
                    message=message,
                    disease_task=primary_pred.disease_name,
                    risk_score=latest_score,
                    risk_velocity=velocity,
                    velocity_direction=velocity_direction,
                    created_at=now_iso,
                    is_acknowledged=False,
                )
                generated_alerts.append(alert)
            elif latest_score >= 0.30 or velocity > 0.04:
                alert_id = f"alt-op-warn-{patient.id[:8]}-{primary_pred.disease_name}"
                title = f"WARNING: Rising Cardiometabolic Divergence ({primary_pred.disease_name.replace('_', ' ').title()})"
                message = (
                    f"10-year risk trajectory exceeds population threshold ({int(latest_score * 100)}%). "
                    f"Review routine labs and synthesized lipid/proteomic panels."
                )
                alert = ClinicalAlert(
                    id=alert_id,
                    patient_id=patient.id,
                    mrn=patient.mrn,
                    patient_name=patient.full_name,
                    cohort_type=cohort_str,
                    severity="WARNING",
                    title=title,
                    message=message,
                    disease_task=primary_pred.disease_name,
                    risk_score=latest_score,
                    risk_velocity=velocity,
                    velocity_direction=velocity_direction,
                    created_at=now_iso,
                    is_acknowledged=False,
                )
                generated_alerts.append(alert)

        # Store or update in alert cache
        for a in generated_alerts:
            # Preserve existing acknowledgement if already recorded
            if a.id in self._alerts and self._alerts[a.id].is_acknowledged:
                a.is_acknowledged = True
                a.acknowledged_by = self._alerts[a.id].acknowledged_by
                a.acknowledged_at = self._alerts[a.id].acknowledged_at
            self._alerts[a.id] = a

        return generated_alerts

    def scan_all_patients(self, db: Session) -> AlertsListResponse:
        """
        Scan all patients in the registry, evaluate deterioration rules,
        and update the live alert registry.
        """
        stmt = select(Patient).options(
            selectinload(Patient.visits).selectinload(Visit.predictions),
        )
        patients = db.execute(stmt).scalars().all()

        for p in patients:
            self.evaluate_patient_alerts(p)

        record_audit_event(
            action="ALERT_SCAN_COMPLETED",
            patient_id="ALL",
            mrn="SYSTEM",
            details={
                "patients_scanned": len(patients),
                "total_alerts": len(self._alerts),
            },
            operator="SYSTEM_ALERT_ENGINE",
        )
        return self.get_alerts()

    def get_alerts(self, unacknowledged_only: bool = False) -> AlertsListResponse:
        """Get formatted list of clinical alerts sorted by severity and velocity."""
        alerts = list(self._alerts.values())

        if unacknowledged_only:
            alerts = [a for a in alerts if not a.is_acknowledged]

        # Sort order: CRITICAL first, then WARNING, then by risk score descending
        severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
        alerts.sort(key=lambda x: (severity_order.get(x.severity, 3), -x.risk_score))

        unack_count = sum(1 for a in self._alerts.values() if not a.is_acknowledged)
        crit_count = sum(1 for a in self._alerts.values() if a.severity == "CRITICAL" and not a.is_acknowledged)

        return AlertsListResponse(
            total_alerts=len(alerts),
            unacknowledged_count=unack_count,
            critical_count=crit_count,
            alerts=alerts,
        )

    def acknowledge_alert(
        self,
        alert_id: str,
        acknowledged_by: str,
        note: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> Optional[ClinicalAlert]:
        """Acknowledge a clinical deterioration alert with clinician identity logging."""
        alert = self._alerts.get(alert_id)
        if not alert:
            return None

        alert.is_acknowledged = True
        alert.acknowledged_by = acknowledged_by
        alert.acknowledged_at = datetime.now(timezone.utc).isoformat()

        record_audit_event(
            action="CLINICAL_ALERT_ACKNOWLEDGED",
            patient_id=alert.patient_id,
            mrn=alert.mrn,
            details={
                "alert_id": alert.id,
                "severity": alert.severity,
                "disease_task": alert.disease_task,
                "risk_score": alert.risk_score,
                "clinical_note": note,
            },
            operator=acknowledged_by,
        )

        return alert
