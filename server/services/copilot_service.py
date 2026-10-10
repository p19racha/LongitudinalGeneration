"""
Clinical AI Co-Pilot Service for PULSE Decision Support System.
Generates structured clinical explanations, SBAR handover briefings,
and literature-backed answers for medical personnel.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from server.crud.patient import get_patient
from server.schemas.copilot import SBARReport, CopilotQueryResponse
from server.services.audit_logger import record_audit_event


class ClinicalCopilotService:
    """
    Intelligent Clinical Decision Support Co-Pilot assisting physicians and nursing staff.
    """

    CITATIONS = [
        "Wu, W. et al. 'Longitudinal alignments and syntheses of multimodal clinical data for personalized medicine with the PULSE framework.' Nature Computational Science (2026). DOI: 10.1038/s43588-026-00957-5",
        "Grundy, S. M. et al. '2018 AHA/ACC Guideline on the Management of Blood Cholesterol.' Journal of the American College of Cardiology 73.24 (2019): e285-e350.",
        "Evans, L. et al. 'Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021.' Critical Care Medicine 49.11 (2021): e1063-e1143.",
        "Jack, C. R. et al. 'NIA-AA Research Framework: Toward a biological definition of Alzheimer's disease.' Alzheimer's & Dementia 14.4 (2018): 535-562.",
    ]

    def __init__(self, db: Session):
        self.db = db

    def generate_sbar(self, patient_id: str) -> SBARReport:
        """
        Generate structured SBAR (Situation, Background, Assessment, Recommendation)
        clinical handover briefing.
        """
        patient = get_patient(self.db, patient_id)
        if not patient:
            raise ValueError(f"Patient with ID {patient_id} not found.")

        cohort_str = (
            patient.cohort_type.value
            if hasattr(patient.cohort_type, "value")
            else str(patient.cohort_type)
        )
        is_icu = "ICU" in cohort_str
        visits = patient.visits or []
        latest_visit = visits[-1] if visits else None
        first_visit = visits[0] if visits else None

        predictions = latest_visit.predictions if latest_visit else []
        critical_or_high_preds = [
            p for p in predictions if p.risk_category in ("CRITICAL", "HIGH")
        ]

        # 1. SITUATION
        if is_icu:
            acute_alert = (
                f"Critical alert: {critical_or_high_preds[0].disease_name.replace('_', ' ').upper()} risk at {round(critical_or_high_preds[0].risk_probability * 100)}% ({critical_or_high_preds[0].risk_category})."
                if critical_or_high_preds
                else "Hemodynamically monitored ICU patient under serial observation."
            )
            situation = (
                f"Patient {patient.full_name} ({patient.mrn}), {patient.age}yo {patient.sex}, "
                f"in Intensive Care Unit. Current monitoring depth: {len(visits)} consecutive 4-hour timepoints "
                f"(total elapsed: {latest_visit.hours_from_baseline if latest_visit else 0}h). {acute_alert}"
            )
        else:
            top_risk_desc = (
                f"Primary concern: {critical_or_high_preds[0].disease_name.replace('_', ' ').upper()} forecasted at {round(critical_or_high_preds[0].risk_probability * 100)}% 10-year risk ({critical_or_high_preds[0].risk_category})."
                if critical_or_high_preds
                else "Routine chronic longitudinal surveillance; risks within moderate/low thresholds."
            )
            situation = (
                f"Patient {patient.full_name} ({patient.mrn}), {patient.age}yo {patient.sex}, "
                f"under Outpatient Multimodal Omics Screening. Longitudinal depth: {len(visits)} annual visits. {top_risk_desc}"
            )

        # 2. BACKGROUND
        history_text = patient.clinical_history_summary or "No baseline comorbidities documented."
        notes_summary = ""
        if latest_visit and latest_visit.clinical_notes:
            notes_summary = f" Most recent physician note: '{latest_visit.clinical_notes[-1].note_text[:200]}...'"

        background = (
            f"Baseline Clinical Profile: {history_text}. Enrolled under {patient.cohort_type.replace('_', ' ')}. "
            f"Baseline encounter recorded on {first_visit.visit_date if first_visit else 'N/A'}.{notes_summary}"
        )

        # 3. ASSESSMENT
        # Gather measurements
        meas_map = {}
        synth_omics = []
        if latest_visit and latest_visit.measurements:
            for m in latest_visit.measurements:
                meas_map[m.feature_name] = m.value
                if m.is_synthetic:
                    synth_omics.append(f"{m.feature_name} ({m.value:.2f} {m.unit})")

        # Trajectory deltas
        trajectory_delta_text = ""
        if len(visits) > 1 and first_visit and latest_visit:
            baseline_meas = {m.feature_name: m.value for m in first_visit.measurements}
            key_markers = ["lactate", "map", "creatinine"] if is_icu else ["ldl_cholesterol", "hba1c", "crp_hs"]
            deltas = []
            for k in key_markers:
                if k in baseline_meas and k in meas_map:
                    diff = meas_map[k] - baseline_meas[k]
                    sign = "+" if diff > 0 else ""
                    deltas.append(f"{k}: {baseline_meas[k]} -> {meas_map[k]} ({sign}{diff:.1f})")
            if deltas:
                trajectory_delta_text = f" Longitudinal trajectory evolution: {', '.join(deltas)}."

        risk_summary_list = [
            f"{p.disease_name.replace('_', ' ').title()}: {round(p.risk_probability * 100)}% ({p.risk_category})"
            for p in predictions
        ]
        risk_str = "; ".join(risk_summary_list) if risk_summary_list else "No predictions generated."

        omics_str = (
            f" Imputed molecular omics: {', '.join(synth_omics[:4])}."
            if synth_omics
            else " Molecular omics awaiting PULSE latent synthesis."
        )

        assessment = (
            f"PULSE Prognostic Assessment: {risk_str}.{trajectory_delta_text}{omics_str} "
            f"Cross-modal latent representations indicate aligned multidimensional biological strain."
        )

        # 4. RECOMMENDATION
        if is_icu:
            recommendation = (
                "1. Hemodynamic Resuscitation: Maintain Mean Arterial Pressure (MAP) >= 65 mmHg; titrate vasopressors if refractory.\n"
                "2. Metabolic Clearance: Serial arterial blood gas with lactate surveillance every 2-4 hours to verify clearance curve.\n"
                "3. Organ Protection: Monitor urine output hourly; adjust nephrotoxic agents given creatinine trajectory.\n"
                "4. SaMD Safety Guardrail: Confirm statistical model projections against bedside arterial line and central laboratory testing."
            )
        else:
            rec_points = []
            if any("heart_failure" in p.disease_name or "myocardial_infarction" in p.disease_name for p in critical_or_high_preds):
                rec_points.append("Consider lipid-lowering therapy intensification (high-intensity statin / ezetimibe) and cardioprotective lifestyle regimen.")
            if any("dementia" in p.disease_name for p in critical_or_high_preds):
                rec_points.append("Elevated neurodegenerative markers (GFAP / NfL): Recommend baseline cognitive battery (MoCA) and volumetric brain MRI consideration.")
            if any("diabetes" in p.disease_name for p in critical_or_high_preds):
                rec_points.append("Elevated cardiometabolic indicators: Order repeat HbA1c in 3 months; consider metformin or GLP-1 receptor agonist initiation.")
            if not rec_points:
                rec_points.append("Maintain routine outpatient surveillance; recheck lipid and metabolic panel in 6-12 months.")
            rec_points.append("SaMD Guardrail: Synthesized omics represent generative probabilistic inferences; order direct venous plasma confirmatory tests before invasive diagnostic interventions.")

            recommendation = "\n".join([f"{i+1}. {pt}" for i, pt in enumerate(rec_points)])

        # Log audit trail event
        record_audit_event(
            action="GENERATE_SBAR_HANDOVER",
            patient_id=patient.id,
            mrn=patient.mrn,
            operator="CLINICAL_COPILOT_AI",
            details={"mrn": patient.mrn, "cohort": patient.cohort_type},
        )

        return SBARReport(
            patient_id=patient.id,
            mrn=patient.mrn,
            full_name=patient.full_name,
            cohort_type=cohort_str,
            situation=situation,
            background=background,
            assessment=assessment,
            recommendation=recommendation,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    def answer_query(
        self, patient_id: str, query: str, include_sbar: bool = False
    ) -> CopilotQueryResponse:
        """
        Synthesize natural language clinical answers using patient history,
        PULSE model outputs, and clinical evidence.
        """
        patient = get_patient(self.db, patient_id)
        if not patient:
            raise ValueError(f"Patient with ID {patient_id} not found.")

        q_lower = query.lower()
        cohort_str = (
            patient.cohort_type.value
            if hasattr(patient.cohort_type, "value")
            else str(patient.cohort_type)
        )
        is_icu = "ICU" in cohort_str
        visits = patient.visits or []
        latest_visit = visits[-1] if visits else None
        first_visit = visits[0] if visits else None
        predictions = latest_visit.predictions if latest_visit else []
        measurements = latest_visit.measurements if latest_visit else []

        sbar_report: Optional[SBARReport] = None
        if include_sbar or any(w in q_lower for w in ["sbar", "handover", "handoff", "shift report"]):
            sbar_report = self.generate_sbar(patient_id)

        answer_parts = []
        followups = []

        # Category 1: SBAR or Handover request
        if any(w in q_lower for w in ["sbar", "handover", "handoff", "briefing"]):
            if not sbar_report:
                sbar_report = self.generate_sbar(patient_id)
            answer_parts.append(
                f"### Clinical SBAR Handover for {patient.full_name} ({patient.mrn})\n\n"
                f"**Situation:**\n{sbar_report.situation}\n\n"
                f"**Background:**\n{sbar_report.background}\n\n"
                f"**Assessment:**\n{sbar_report.assessment}\n\n"
                f"**Recommendation:**\n{sbar_report.recommendation}"
            )
            followups = [
                "What are the top biological drivers of this risk score?",
                "What would happen if we intervene on blood pressure or LDL?",
                "Which synthesized proteomics markers are elevated?",
            ]

        # Category 2: Risk drivers and explainability
        elif any(w in q_lower for w in ["risk", "why", "driver", "cause", "dementia", "heart failure", "mortality", "scorecard"]):
            if not predictions:
                answer_parts.append(
                    "No disease risk predictions have been generated yet for this patient. "
                    "Please execute the **Run PULSE Engine** action on the patient profile to calculate "
                    "calibrated multi-disease prognostic probabilities and feature attribution weights."
                )
            else:
                answer_parts.append(
                    f"### PULSE Prognostic Attribution Analysis for {patient.full_name}\n\n"
                    "The PULSE deep generative framework projects disease risk by mapping multimodal routine laboratory observations "
                    "into an integrated 16-dimensional latent representation ($Z_t$) aligned with historical priors ($Z_P$).\n"
                )
                for pred in predictions:
                    pct = round(pred.risk_probability * 100)
                    drivers_text = ""
                    if pred.top_drivers:
                        driver_items = []
                        for d in pred.top_drivers:
                            if isinstance(d, dict):
                                d_desc = d.get("description") or d.get("feature_name", "Biomarker")
                                d_score = d.get("impact_score", 0.0)
                            else:
                                d_desc = getattr(d, "description", "") or getattr(d, "feature_name", "Biomarker")
                                d_score = getattr(d, "impact_score", 0.0)
                            sign = "+" if d_score > 0 else ""
                            driver_items.append(f"• **{d_desc}**: impact weight `{sign}{d_score:.2f}`")

                        drivers_text = "\n  Key Drivers:\n  " + "\n  ".join(driver_items)

                    answer_parts.append(
                        f"• **{pred.disease_name.replace('_', ' ').upper()}**: **{pct}%** ({pred.risk_category} risk){drivers_text}\n"
                    )

                if any("dementia" in p.disease_name for p in predictions):
                    answer_parts.append(
                        "\n**Pathophysiological Context (Neurodegeneration):** As reported by Wu et al. (Nature Comp Sci 2026), "
                        "plasma Glial Fibrillary Acidic Protein (GFAP) and Neurofilament Light Chain (NfL) reflect ongoing reactive astrogliosis "
                        "and neuroaxonal disruption years prior to syndromic cognitive decline."
                    )
                if any("heart_failure" in p.disease_name or "myocardial_infarction" in p.disease_name for p in predictions):
                    answer_parts.append(
                        "\n**Pathophysiological Context (Cardiovascular):** High atherogenic lipid fractions (ApoB/ApoA1 ratio, large LDL free cholesterol) "
                        "together with myocardial stretch markers (NT-proBNP) strongly amplify 10-year ischemic risk."
                    )

            followups = [
                "How does the Digital Twin simulate risk reduction if we start treatment?",
                "Can you generate an SBAR handover summary?",
                "Explain the synthesized molecular omics panel.",
            ]

        # Category 3: Synthesized Omics (Proteomics & Metabolomics)
        elif any(w in q_lower for w in ["omics", "protein", "proteomic", "metabolom", "gfap", "nfl", "bnp", "troponin", "cystatin", "lipid"]):
            synthetic_meas = [m for m in measurements if m.is_synthetic]
            if not synthetic_meas:
                answer_parts.append(
                    "No synthetic omics have been imputed yet. Click **Run PULSE Engine** to reconstruct high-dimensional "
                    "plasma proteomics and metabolomics profiles from the patient's routine laboratory tests."
                )
            else:
                answer_parts.append(
                    f"### Synthesized Molecular Omics Profile for {patient.full_name}\n\n"
                    "The PULSE generative cross-modal autoencoder inferred the following molecular biomarkers "
                    "with statistical 95% confidence intervals:\n"
                )
                for m in synthetic_meas:
                    ref_str = f"[{m.ref_low}–{m.ref_high} {m.unit}]" if m.ref_low is not None else ""
                    ci_str = (
                        f" (95% CI: [{m.confidence_interval_low:.2f}, {m.confidence_interval_high:.2f}])"
                        if m.confidence_interval_low is not None
                        else ""
                    )
                    status = "Normal"
                    if m.ref_high is not None and m.value > m.ref_high:
                        status = "⚠️ ELEVATED"
                    elif m.ref_low is not None and m.value < m.ref_low:
                        status = "⚠️ LOW"

                    answer_parts.append(
                        f"• **{m.feature_name}** ({m.feature_category}): **{m.value:.2f} {m.unit}** {ref_str}{ci_str} — *{status}*"
                    )

                answer_parts.append(
                    "\n> **Clinical Caution:** These synthetic values represent mathematical reconstructions from standard clinical tests. "
                    "Always order confirmatory high-throughput mass spectrometry or immunoassay testing for definitive diagnostic decisions."
                )

            followups = [
                "Why is GFAP elevated and what does it mean for dementia?",
                "How would statin therapy affect downstream omics?",
                "Generate an SBAR handover report.",
            ]

        # Category 4: Longitudinal Trajectories & Trends
        elif any(w in q_lower for w in ["trend", "trajectory", "change", "worse", "improve", "time", "progression"]):
            if len(visits) < 2:
                answer_parts.append(
                    f"Patient {patient.full_name} currently has only {len(visits)} recorded encounter. "
                    "Add additional clinical visits or ICU time steps using the **Add Encounter** wizard to map "
                    "longitudinal trajectory slope and temporal inflection points."
                )
            else:
                first_meas = {m.feature_name: m.value for m in first_visit.measurements}
                latest_meas = {m.feature_name: m.value for m in latest_visit.measurements}

                answer_parts.append(
                    f"### Longitudinal Trajectory Dynamics ({len(visits)} Encounters Recorded)\n\n"
                    f"Observation window spans from {first_visit.visit_date} to {latest_visit.visit_date} "
                    f"({latest_visit.hours_from_baseline}h elapsed):\n"
                )

                tracked = ["lactate", "map", "creatinine", "wbc"] if is_icu else ["ldl_cholesterol", "hba1c", "crp_hs", "triglycerides", "creatinine"]
                for t in tracked:
                    if t in first_meas and t in latest_meas:
                        v0 = first_meas[t]
                        v1 = latest_meas[t]
                        delta = v1 - v0
                        sign = "+" if delta > 0 else ""
                        direction = "📈 Increased" if delta > 0 else ("📉 Decreased" if delta < 0 else "➡️ Stable")
                        answer_parts.append(
                            f"• **{t.replace('_', ' ').title()}**: {v0} ➔ **{v1}** ({sign}{delta:.2f}) — {direction}"
                        )

            followups = [
                "What clinical interventions could reverse this trend?",
                "Explain the current risk scorecard.",
                "Generate an SBAR handover report.",
            ]

        # Category 5: Interventions & Digital Twin Sandbox Advice
        elif any(w in q_lower for w in ["intervene", "treatment", "digital twin", "what-if", "reduce", "therapy", "medication", "target"]):
            answer_parts.append(
                f"### Counterfactual Digital Twin Guidance for {patient.full_name}\n\n"
                "Using the **Digital Twin (What-If Sandbox)** tab, you can simulate hypothetical clinical interventions "
                "and propagate therapeutic biomarker targets through the PULSE latent state space ($Z_P$):\n"
            )
            if is_icu:
                answer_parts.append(
                    "**Recommended ICU Resuscitation Targets:**\n"
                    "1. **Mean Arterial Pressure (MAP)**: Target 65–80 mmHg with titratable norepinephrine/vasopressin.\n"
                    "2. **Serum Lactate Clearance**: Target lactate < 2.0 mmol/L to alleviate cellular anaerobic glycolysis.\n"
                    "3. **Oxygenation Index (PaO2/FiO2)**: Target > 300 via lung-protective mechanical ventilation.\n"
                    "\n*Simulate these in the Digital Twin sandbox to evaluate predicted 30-day survival improvements.*"
                )
            else:
                answer_parts.append(
                    "**Evidence-Based Chronic Disease Interventions:**\n"
                    "1. **Lipid Escalation**: Target LDL-C < 70 mg/dL (or < 55 mg/dL for very high risk) via high-potency statins + ezetimibe.\n"
                    "2. **Metabolic Control**: Target Fasting Glucose < 100 mg/dL and HbA1c < 6.5% via SGLT2 inhibitors or GLP-1 RAs.\n"
                    "3. **Anti-inflammatory Impact**: Reducing systemic hs-CRP mitigates atherothrombotic plaque vulnerability.\n"
                    "\n*Test these target values in the Digital Twin sandbox to observe counterfactual risk reduction.*"
                )

            followups = [
                "Run a digital twin simulation for statin therapy",
                "Explain the top disease risk drivers",
                "Generate an SBAR handover report",
            ]

        # Default fallback: Comprehensive clinical briefing
        else:
            answer_parts.append(
                f"### Clinical Decision Support Briefing for {patient.full_name} ({patient.mrn})\n\n"
                f"I am the PULSE Clinical AI Co-Pilot, trained on the multimodal architectures from *Nature Computational Science* (2026).\n\n"
                f"**Current Status:**\n"
                f"• Cohort: **{patient.cohort_type.replace('_', ' ')}**\n"
                f"• Longitudinal Encounters: **{len(visits)}**\n"
            )
            if predictions:
                top_p = max(predictions, key=lambda x: x.risk_probability)
                answer_parts.append(
                    f"• Primary Prognostic Flag: **{top_p.disease_name.replace('_', ' ').upper()}** ({round(top_p.risk_probability * 100)}% risk, {top_p.risk_category})\n"
                )
            answer_parts.append(
                "You can ask me to:\n"
                "1. **'Explain risk drivers'**: Understand why specific disease probabilities are elevated.\n"
                "2. **'Interpret omics'**: Review synthesized plasma proteomics and metabolomics.\n"
                "3. **'Analyze trends'**: Compare longitudinal baseline against latest encounter.\n"
                "4. **'Generate SBAR'**: Produce a structured handover note for physician handoff.\n"
                "5. **'Digital twin advice'**: Recommend hypothetical therapeutic targets."
            )
            followups = [
                "Generate an SBAR clinical handover",
                "What are the top biological drivers of risk?",
                "Interpret the synthesized omics panel",
            ]

        # Log Co-Pilot Query to Audit Trail
        record_audit_event(
            action="COPILOT_QUERY",
            patient_id=patient.id,
            mrn=patient.mrn,
            operator="CLINICAL_COPILOT_AI",
            details={"query": query, "include_sbar": include_sbar},
        )

        return CopilotQueryResponse(
            answer="\n".join(answer_parts),
            citations=self.CITATIONS,
            sbar=sbar_report,
            suggested_followups=followups,
        )
