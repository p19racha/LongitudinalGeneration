"""
Preloaded clinically realistic patient trajectories and demo cohorts.
"""
from typing import List
from sqlalchemy.orm import Session

from server.db.models import (
    CohortType,
    Patient,
    Visit,
    Measurement,
    ClinicalNote,
    LatentState,
    RiskPrediction,
    TaskType,
    RiskCategory,
)
from server.crud.patient import get_patient_by_mrn


def seed_database(db: Session, overwrite: bool = False) -> List[Patient]:
    """
    Populate database with demonstration cohorts if empty.
    Returns the list of seeded patients.
    """
    # Check if already seeded
    existing = db.query(Patient).first()
    if existing and not overwrite:
        return list(db.query(Patient).all())

    if existing and overwrite:
        db.query(Patient).delete()
        db.commit()

    created_patients: List[Patient] = []

    # =========================================================================
    # Patient 1: Arthur Pendelton (Cardiovascular & Metabolic Progression)
    # =========================================================================
    p1 = Patient(
        mrn="MRN-CV-10029",
        full_name="Arthur Pendelton",
        age=62.0,
        sex="M",
        cohort_type=CohortType.OUTPATIENT_CHRONIC,
        clinical_history_summary="62yo male with baseline pre-diabetes, grade 1 essential hypertension, and family history of premature coronary artery disease. Evaluated across 3 annual checkups.",
    )
    db.add(p1)
    db.flush()

    # P1 Visit 0 (Baseline - 2023-01-15)
    v1_0 = Visit(
        patient_id=p1.id,
        visit_index=0,
        visit_date="2023-01-15",
        hours_from_baseline=0.0,
        visit_summary="Annual Comprehensive Health Checkup (Baseline paired labs & metabolomics)",
    )
    db.add(v1_0)
    db.flush()

    v1_0_labs = [
        ("routine_labs", "Glucose_Fasting", 104.0, False, "mg/dL", 70.0, 99.0, None, None),
        ("routine_labs", "HbA1c", 5.8, False, "%", 4.0, 5.6, None, None),
        ("routine_labs", "Cholesterol_Total", 210.0, False, "mg/dL", 125.0, 200.0, None, None),
        ("routine_labs", "Triglycerides", 160.0, False, "mg/dL", 40.0, 150.0, None, None),
        ("routine_labs", "HDL_Cholesterol", 42.0, False, "mg/dL", 40.0, 60.0, None, None),
        ("routine_labs", "LDL_Cholesterol", 136.0, False, "mg/dL", 50.0, 100.0, None, None),
        ("routine_labs", "ALT", 28.0, False, "U/L", 7.0, 56.0, None, None),
        ("routine_labs", "AST", 24.0, False, "U/L", 10.0, 40.0, None, None),
        ("routine_labs", "Creatinine", 0.95, False, "mg/dL", 0.7, 1.3, None, None),
        ("routine_labs", "hsCRP", 1.8, False, "mg/L", 0.0, 3.0, None, None),
        # Measured metabolomics at baseline
        ("metabolomics", "Free_Cholesterol_to_Total_Lipid_large_LDL", 0.28, False, "ratio", 0.22, 0.32, None, None),
        ("metabolomics", "TG_to_PG_ratio", 1.15, False, "ratio", 0.90, 1.40, None, None),
        ("metabolomics", "small_VLDL_TG_pct", 0.35, False, "fraction", 0.25, 0.40, None, None),
    ]
    for mod, feat, val, syn, u, r_low, r_high, c_low, c_high in v1_0_labs:
        db.add(Measurement(
            visit_id=v1_0.id, modality=mod, feature_name=feat, feature_value=val,
            is_synthetic=syn, unit=u, reference_low=r_low, reference_high=r_high,
            confidence_lower=c_low, confidence_upper=c_high
        ))

    db.add(LatentState(
        visit_id=v1_0.id,
        z_state_json="[-0.12, 0.45, -0.22, 0.08, 0.19, -0.34, 0.51, 0.02, -0.15, 0.28, -0.41, 0.11, 0.05, -0.19, 0.31, -0.07]",
        past_state_json="[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]",
    ))

    db.add(RiskPrediction(
        visit_id=v1_0.id,
        task_type=TaskType.CHRONIC_10Y_RISK,
        disease_name="myocardial_infarction",
        risk_probability=0.142,
        risk_category=RiskCategory.LOW,
        top_drivers_json='[{"feature_name": "LDL_Cholesterol", "impact_score": 0.24, "description": "Borderline elevated LDL"}, {"feature_name": "hsCRP", "impact_score": 0.18, "description": "Low-grade systemic inflammation"}]',
    ))

    # P1 Visit 1 (Year 1 - 2024-01-20)
    v1_1 = Visit(
        patient_id=p1.id,
        visit_index=1,
        visit_date="2024-01-20",
        hours_from_baseline=8760.0,  # 1 year
        visit_summary="12-Month Follow-Up (Routine Labs measured, Metabolomics missing -> Synthesized by PULSE)",
    )
    db.add(v1_1)
    db.flush()

    v1_1_labs = [
        ("routine_labs", "Glucose_Fasting", 118.0, False, "mg/dL", 70.0, 99.0, None, None),
        ("routine_labs", "HbA1c", 6.3, False, "%", 4.0, 5.6, None, None),
        ("routine_labs", "Cholesterol_Total", 232.0, False, "mg/dL", 125.0, 200.0, None, None),
        ("routine_labs", "Triglycerides", 195.0, False, "mg/dL", 40.0, 150.0, None, None),
        ("routine_labs", "HDL_Cholesterol", 38.0, False, "mg/dL", 40.0, 60.0, None, None),
        ("routine_labs", "LDL_Cholesterol", 152.0, False, "mg/dL", 50.0, 100.0, None, None),
        ("routine_labs", "hsCRP", 2.6, False, "mg/L", 0.0, 3.0, None, None),
        # PULSE Synthesized Metabolomics
        ("metabolomics", "Free_Cholesterol_to_Total_Lipid_large_LDL", 0.33, True, "ratio", 0.22, 0.32, 0.31, 0.35),
        ("metabolomics", "TG_to_PG_ratio", 1.34, True, "ratio", 0.90, 1.40, 1.25, 1.43),
        ("metabolomics", "small_VLDL_TG_pct", 0.44, True, "fraction", 0.25, 0.40, 0.41, 0.48),
    ]
    for mod, feat, val, syn, u, r_low, r_high, c_low, c_high in v1_1_labs:
        db.add(Measurement(
            visit_id=v1_1.id, modality=mod, feature_name=feat, feature_value=val,
            is_synthetic=syn, unit=u, reference_low=r_low, reference_high=r_high,
            confidence_lower=c_low, confidence_upper=c_high
        ))

    db.add(LatentState(
        visit_id=v1_1.id,
        z_state_json="[-0.05, 0.62, -0.31, 0.14, 0.28, -0.45, 0.68, 0.09, -0.22, 0.41, -0.55, 0.19, 0.11, -0.27, 0.44, -0.12]",
        past_state_json="[-0.10, 0.48, -0.24, 0.09, 0.20, -0.36, 0.53, 0.03, -0.16, 0.30, -0.43, 0.12, 0.06, -0.20, 0.33, -0.08]",
    ))

    db.add(RiskPrediction(
        visit_id=v1_1.id,
        task_type=TaskType.CHRONIC_10Y_RISK,
        disease_name="myocardial_infarction",
        risk_probability=0.241,
        risk_category=RiskCategory.HIGH,
        top_drivers_json='[{"feature_name": "Free_Cholesterol_to_Total_Lipid_large_LDL", "impact_score": 0.38, "description": "Accelerated atherogenic LDL lipid ratio shift (+17.8% from baseline)"}, {"feature_name": "HbA1c", "impact_score": 0.29, "description": "Progression into overt pre-diabetic glycemic range (6.3%)"}]',
    ))
    db.add(RiskPrediction(
        visit_id=v1_1.id,
        task_type=TaskType.CHRONIC_10Y_RISK,
        disease_name="heart_failure",
        risk_probability=0.184,
        risk_category=RiskCategory.MODERATE,
        top_drivers_json='[{"feature_name": "small_VLDL_TG_pct", "impact_score": 0.31, "description": "Synthesized triglyceride-rich lipoprotein fraction expansion"}, {"feature_name": "hsCRP", "impact_score": 0.22, "description": "Persistent inflammatory activation"}]',
    ))

    # P1 Visit 2 (Year 2 - 2025-02-10)
    v1_2 = Visit(
        patient_id=p1.id,
        visit_index=2,
        visit_date="2025-02-10",
        hours_from_baseline=17520.0,  # 2 years
        visit_summary="24-Month Follow-Up (Glycemic & Lipid deterioration confirmed, synthesized omics show critical atherogenic shift)",
    )
    db.add(v1_2)
    db.flush()

    v1_2_labs = [
        ("routine_labs", "Glucose_Fasting", 126.0, False, "mg/dL", 70.0, 99.0, None, None),
        ("routine_labs", "HbA1c", 6.7, False, "%", 4.0, 5.6, None, None),
        ("routine_labs", "Cholesterol_Total", 245.0, False, "mg/dL", 125.0, 200.0, None, None),
        ("routine_labs", "Triglycerides", 218.0, False, "mg/dL", 40.0, 150.0, None, None),
        ("routine_labs", "HDL_Cholesterol", 36.0, False, "mg/dL", 40.0, 60.0, None, None),
        ("routine_labs", "LDL_Cholesterol", 164.0, False, "mg/dL", 50.0, 100.0, None, None),
        ("routine_labs", "hsCRP", 3.4, False, "mg/L", 0.0, 3.0, None, None),
        # PULSE Synthesized Metabolomics
        ("metabolomics", "Free_Cholesterol_to_Total_Lipid_large_LDL", 0.38, True, "ratio", 0.22, 0.32, 0.35, 0.41),
        ("metabolomics", "TG_to_PG_ratio", 1.48, True, "ratio", 0.90, 1.40, 1.38, 1.58),
        ("metabolomics", "small_VLDL_TG_pct", 0.51, True, "fraction", 0.25, 0.40, 0.47, 0.55),
    ]
    for mod, feat, val, syn, u, r_low, r_high, c_low, c_high in v1_2_labs:
        db.add(Measurement(
            visit_id=v1_2.id, modality=mod, feature_name=feat, feature_value=val,
            is_synthetic=syn, unit=u, reference_low=r_low, reference_high=r_high,
            confidence_lower=c_low, confidence_upper=c_high
        ))

    db.add(LatentState(
        visit_id=v1_2.id,
        z_state_json="[0.02, 0.78, -0.42, 0.21, 0.39, -0.58, 0.82, 0.16, -0.29, 0.54, -0.68, 0.27, 0.18, -0.36, 0.58, -0.19]",
        past_state_json="[-0.04, 0.65, -0.33, 0.15, 0.29, -0.47, 0.71, 0.10, -0.23, 0.43, -0.57, 0.20, 0.12, -0.28, 0.46, -0.13]",
    ))

    db.add(RiskPrediction(
        visit_id=v1_2.id,
        task_type=TaskType.CHRONIC_10Y_RISK,
        disease_name="myocardial_infarction",
        risk_probability=0.315,
        risk_category=RiskCategory.HIGH,
        top_drivers_json='[{"feature_name": "Free_Cholesterol_to_Total_Lipid_large_LDL", "impact_score": 0.42, "description": "Persistent abnormal cholesterol enrichment in LDL subfractions (+35.7% from baseline)"}, {"feature_name": "HbA1c", "impact_score": 0.33, "description": "New diagnosis threshold for Type 2 Diabetes (6.7%)"}]',
    ))
    db.add(RiskPrediction(
        visit_id=v1_2.id,
        task_type=TaskType.CHRONIC_10Y_RISK,
        disease_name="heart_failure",
        risk_probability=0.268,
        risk_category=RiskCategory.HIGH,
        top_drivers_json='[{"feature_name": "small_VLDL_TG_pct", "impact_score": 0.36, "description": "Extreme VLDL triglyceride enrichment"}, {"feature_name": "hsCRP", "impact_score": 0.28, "description": "High-risk systemic vascular inflammation (3.4 mg/L)"}]',
    ))
    db.add(RiskPrediction(
        visit_id=v1_2.id,
        task_type=TaskType.CHRONIC_10Y_RISK,
        disease_name="diabetes",
        risk_probability=0.362,
        risk_category=RiskCategory.CRITICAL,
        top_drivers_json='[{"feature_name": "HbA1c", "impact_score": 0.55, "description": "Diabetic HbA1c elevation"}, {"feature_name": "Glucose_Fasting", "impact_score": 0.40, "description": "Impaired fasting glucose (126 mg/dL)"}]',
    ))

    created_patients.append(p1)

    # =========================================================================
    # Patient 2: Eleanor Vance (Neurodegenerative & Proteomics Trajectory)
    # =========================================================================
    p2 = Patient(
        mrn="MRN-ND-20481",
        full_name="Eleanor Vance",
        age=69.0,
        sex="F",
        cohort_type=CohortType.OUTPATIENT_CHRONIC,
        clinical_history_summary="69yo female with maternal history of late-onset Alzheimer's disease. Self-reported mild word-finding difficulty. Tracked across 2 outpatient neurology evaluations.",
    )
    db.add(p2)
    db.flush()

    # P2 Visit 0 (Baseline)
    v2_0 = Visit(
        patient_id=p2.id,
        visit_index=0,
        visit_date="2023-03-10",
        hours_from_baseline=0.0,
        visit_summary="Memory Clinic Initial Consultation (Routine Blood Panel + Baseline Proteomics)",
    )
    db.add(v2_0)
    db.flush()

    v2_0_labs = [
        ("routine_labs", "Homocysteine", 11.2, False, "umol/L", 4.0, 15.0, None, None),
        ("routine_labs", "Vitamin_B12", 380.0, False, "pg/mL", 200.0, 900.0, None, None),
        ("routine_labs", "TSH", 2.1, False, "uIU/mL", 0.4, 4.0, None, None),
        ("routine_labs", "hsCRP", 1.2, False, "mg/L", 0.0, 3.0, None, None),
        ("routine_labs", "Albumin", 4.3, False, "g/dL", 3.5, 5.0, None, None),
        # Measured proteomics baseline
        ("proteomics", "GFAP", 85.0, False, "pg/mL", 40.0, 120.0, None, None),
        ("proteomics", "NEFL_NfL", 14.2, False, "pg/mL", 6.0, 20.0, None, None),
        ("proteomics", "GDF15", 620.0, False, "pg/mL", 300.0, 800.0, None, None),
    ]
    for mod, feat, val, syn, u, r_low, r_high, c_low, c_high in v2_0_labs:
        db.add(Measurement(
            visit_id=v2_0.id, modality=mod, feature_name=feat, feature_value=val,
            is_synthetic=syn, unit=u, reference_low=r_low, reference_high=r_high,
            confidence_lower=c_low, confidence_upper=c_high
        ))

    db.add(LatentState(
        visit_id=v2_0.id,
        z_state_json="[0.18, -0.22, 0.35, -0.11, 0.42, 0.05, -0.18, 0.29, -0.06, 0.14, -0.21, 0.33, -0.08, 0.25, -0.14, 0.09]",
        past_state_json="[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]",
    ))

    db.add(RiskPrediction(
        visit_id=v2_0.id,
        task_type=TaskType.CHRONIC_10Y_RISK,
        disease_name="dementia",
        risk_probability=0.165,
        risk_category=RiskCategory.LOW,
        top_drivers_json='[{"feature_name": "Age", "impact_score": 0.32, "description": "Baseline age risk"}, {"feature_name": "NEFL_NfL", "impact_score": 0.21, "description": "Normal baseline neurofilament light chain"}]',
    ))

    # P2 Visit 1 (Year 1 Follow-up)
    v2_1 = Visit(
        patient_id=p2.id,
        visit_index=1,
        visit_date="2024-04-12",
        hours_from_baseline=9528.0,
        visit_summary="12-Month Neurology Follow-Up (Routine Labs only, Proteomics synthesized by PULSE)",
    )
    db.add(v2_1)
    db.flush()

    v2_1_labs = [
        ("routine_labs", "Homocysteine", 15.6, False, "umol/L", 4.0, 15.0, None, None),
        ("routine_labs", "Vitamin_B12", 310.0, False, "pg/mL", 200.0, 900.0, None, None),
        ("routine_labs", "hsCRP", 2.9, False, "mg/L", 0.0, 3.0, None, None),
        ("routine_labs", "Albumin", 3.9, False, "g/dL", 3.5, 5.0, None, None),
        # PULSE Synthesized Proteomics
        ("proteomics", "GFAP", 142.0, True, "pg/mL", 40.0, 120.0, 131.0, 154.0),
        ("proteomics", "NEFL_NfL", 23.8, True, "pg/mL", 6.0, 20.0, 21.5, 26.2),
        ("proteomics", "GDF15", 890.0, True, "pg/mL", 300.0, 800.0, 840.0, 945.0),
    ]
    for mod, feat, val, syn, u, r_low, r_high, c_low, c_high in v2_1_labs:
        db.add(Measurement(
            visit_id=v2_1.id, modality=mod, feature_name=feat, feature_value=val,
            is_synthetic=syn, unit=u, reference_low=r_low, reference_high=r_high,
            confidence_lower=c_low, confidence_upper=c_high
        ))

    db.add(LatentState(
        visit_id=v2_1.id,
        z_state_json="[0.34, -0.38, 0.52, -0.19, 0.61, 0.12, -0.29, 0.45, -0.11, 0.28, -0.36, 0.51, -0.14, 0.39, -0.22, 0.18]",
        past_state_json="[0.22, -0.26, 0.39, -0.13, 0.46, 0.06, -0.20, 0.32, -0.07, 0.16, -0.23, 0.36, -0.09, 0.28, -0.15, 0.10]",
    ))

    db.add(RiskPrediction(
        visit_id=v2_1.id,
        task_type=TaskType.CHRONIC_10Y_RISK,
        disease_name="dementia",
        risk_probability=0.384,
        risk_category=RiskCategory.HIGH,
        top_drivers_json='[{"feature_name": "GFAP", "impact_score": 0.48, "description": "Marked predicted astrocytic activation / GFAP rise (+67.1% vs baseline)"}, {"feature_name": "NEFL_NfL", "impact_score": 0.39, "description": "Neuroaxonal injury signal / elevated NfL (23.8 pg/mL)"}, {"feature_name": "Homocysteine", "impact_score": 0.26, "description": "Elevated neurovascular risk marker (15.6 umol/L)"}]',
    ))

    created_patients.append(p2)

    # =========================================================================
    # Patient 3: David Miller (ICU Septic Trajectory - MIMIC-III Style)
    # =========================================================================
    p3 = Patient(
        mrn="MRN-ICU-88304",
        full_name="David Miller",
        age=54.0,
        sex="M",
        cohort_type=CohortType.INPATIENT_ICU,
        clinical_history_summary="54yo male admitted to ICU with septic shock secondary to severe community-acquired lobar pneumonia. Tracked across 4-hour monitoring intervals over the first 24 hours.",
    )
    db.add(p3)
    db.flush()

    # Step 0: Admission (Hour 0)
    v3_0 = Visit(
        patient_id=p3.id,
        visit_index=0,
        visit_date="2024-11-04 02:00",
        hours_from_baseline=0.0,
        visit_summary="ICU Admission (Septic shock, high lactate, hemodynamic instability)",
    )
    db.add(v3_0)
    db.flush()

    v3_0_labs = [
        ("routine_labs", "Lactate", 3.8, False, "mmol/L", 0.5, 2.0, None, None),
        ("routine_labs", "WBC", 18.4, False, "k/uL", 4.0, 11.0, None, None),
        ("routine_labs", "Platelets", 135.0, False, "k/uL", 150.0, 450.0, None, None),
        ("routine_labs", "Creatinine", 2.1, False, "mg/dL", 0.7, 1.3, None, None),
        ("routine_labs", "MAP", 62.0, False, "mmHg", 70.0, 105.0, None, None),
        ("routine_labs", "PaO2_FiO2", 195.0, False, "mmHg", 300.0, 500.0, None, None),
    ]
    for mod, feat, val, syn, u, r_low, r_high, c_low, c_high in v3_0_labs:
        db.add(Measurement(
            visit_id=v3_0.id, modality=mod, feature_name=feat, feature_value=val,
            is_synthetic=syn, unit=u, reference_low=r_low, reference_high=r_high,
            confidence_lower=c_low, confidence_upper=c_high
        ))

    db.add(ClinicalNote(
        visit_id=v3_0.id,
        step_hour=0.0,
        note_type="ADMISSION",
        note_text="Patient admitted from ED with fever (39.1C), productive cough, altered mental status, and severe hypotension refractory to 2L crystalloids. Arterial line placed. Initiated IV Norepinephrine at 0.15 mcg/kg/min and broad-spectrum Vancomycin/Cefepime.",
    ))

    db.add(LatentState(
        visit_id=v3_0.id,
        z_state_json="[0.72, 0.55, -0.61, 0.84, -0.42, 0.39, -0.51, 0.77, -0.33, 0.48, -0.66, 0.29, -0.19, 0.52, -0.38, 0.44]",
        past_state_json="[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]",
    ))

    db.add(RiskPrediction(
        visit_id=v3_0.id,
        task_type=TaskType.ICU_30D_READMISSION,
        disease_name="icu_readmission",
        risk_probability=0.342,
        risk_category=RiskCategory.HIGH,
        top_drivers_json='[{"feature_name": "Lactate", "impact_score": 0.45, "description": "Tissue hypoperfusion / high serum lactate (3.8 mmol/L)"}, {"feature_name": "PaO2_FiO2", "impact_score": 0.38, "description": "Moderate ARDS hypoxia criteria (<200)"}]',
    ))
    db.add(RiskPrediction(
        visit_id=v3_0.id,
        task_type=TaskType.ICU_30D_MORTALITY,
        disease_name="icu_mortality",
        risk_probability=0.285,
        risk_category=RiskCategory.HIGH,
        top_drivers_json='[{"feature_name": "Lactate", "impact_score": 0.52, "description": "Severe septic lactic acidosis"}, {"feature_name": "Creatinine", "impact_score": 0.35, "description": "Acute kidney injury stage 2"}]',
    ))

    # Step 1: Hour 4
    v3_1 = Visit(
        patient_id=p3.id,
        visit_index=1,
        visit_date="2024-11-04 06:00",
        hours_from_baseline=4.0,
        visit_summary="ICU Step T+4h (Fluid resuscitation response, down-titration of vasopressors)",
    )
    db.add(v3_1)
    db.flush()

    v3_1_labs = [
        ("routine_labs", "Lactate", 3.1, False, "mmol/L", 0.5, 2.0, None, None),
        ("routine_labs", "WBC", 17.5, False, "k/uL", 4.0, 11.0, None, None),
        ("routine_labs", "Creatinine", 1.9, False, "mg/dL", 0.7, 1.3, None, None),
        ("routine_labs", "MAP", 68.0, False, "mmHg", 70.0, 105.0, None, None),
        ("routine_labs", "PaO2_FiO2", 215.0, False, "mmHg", 300.0, 500.0, None, None),
    ]
    for mod, feat, val, syn, u, r_low, r_high, c_low, c_high in v3_1_labs:
        db.add(Measurement(
            visit_id=v3_1.id, modality=mod, feature_name=feat, feature_value=val,
            is_synthetic=syn, unit=u, reference_low=r_low, reference_high=r_high,
            confidence_lower=c_low, confidence_upper=c_high
        ))

    db.add(ClinicalNote(
        visit_id=v3_1.id,
        step_hour=4.0,
        note_type="PROGRESS",
        note_text="Norepinephrine decreased to 0.08 mcg/kg/min. Adequate urine output 45 mL/hr over past 2h. Repeat lactate clearance confirmed at 18%. Patient resting comfortably.",
    ))

    db.add(LatentState(
        visit_id=v3_1.id,
        z_state_json="[0.58, 0.42, -0.48, 0.69, -0.31, 0.28, -0.40, 0.61, -0.25, 0.36, -0.51, 0.21, -0.14, 0.40, -0.28, 0.33]",
        past_state_json="[0.68, 0.51, -0.58, 0.80, -0.39, 0.36, -0.48, 0.72, -0.31, 0.45, -0.62, 0.27, -0.18, 0.49, -0.35, 0.41]",
    ))

    db.add(RiskPrediction(
        visit_id=v3_1.id,
        task_type=TaskType.ICU_30D_READMISSION,
        disease_name="icu_readmission",
        risk_probability=0.258,
        risk_category=RiskCategory.MODERATE,
        top_drivers_json='[{"feature_name": "Lactate", "impact_score": 0.39, "description": "Lactate trending downward (3.1 mmol/L)"}, {"feature_name": "MAP", "impact_score": 0.28, "description": "Hemodynamic stabilization (MAP 68 mmHg)"}]',
    ))

    # Step 2: Hour 24
    v3_2 = Visit(
        patient_id=p3.id,
        visit_index=2,
        visit_date="2024-11-05 02:00",
        hours_from_baseline=24.0,
        visit_summary="ICU Step T+24h (Sepsis resolved, off vasopressors, clinical recovery)",
    )
    db.add(v3_2)
    db.flush()

    v3_2_labs = [
        ("routine_labs", "Lactate", 1.4, False, "mmol/L", 0.5, 2.0, None, None),
        ("routine_labs", "WBC", 11.8, False, "k/uL", 4.0, 11.0, None, None),
        ("routine_labs", "Creatinine", 1.15, False, "mg/dL", 0.7, 1.3, None, None),
        ("routine_labs", "MAP", 78.0, False, "mmHg", 70.0, 105.0, None, None),
        ("routine_labs", "PaO2_FiO2", 285.0, False, "mmHg", 300.0, 500.0, None, None),
    ]
    for mod, feat, val, syn, u, r_low, r_high, c_low, c_high in v3_2_labs:
        db.add(Measurement(
            visit_id=v3_2.id, modality=mod, feature_name=feat, feature_value=val,
            is_synthetic=syn, unit=u, reference_low=r_low, reference_high=r_high,
            confidence_lower=c_low, confidence_upper=c_high
        ))

    db.add(ClinicalNote(
        visit_id=v3_2.id,
        step_hour=24.0,
        note_type="PROGRESS",
        note_text="Off all inotropic/vasopressor support for 12 hours. Normal serum lactate. Tolerating room air high-flow taper. Extubation and transfer to floor/step-down scheduled.",
    ))

    db.add(LatentState(
        visit_id=v3_2.id,
        z_state_json="[0.15, 0.12, -0.18, 0.21, -0.09, 0.08, -0.14, 0.19, -0.07, 0.11, -0.18, 0.06, -0.04, 0.13, -0.09, 0.10]",
        past_state_json="[0.32, 0.24, -0.28, 0.38, -0.16, 0.15, -0.22, 0.33, -0.12, 0.19, -0.29, 0.11, -0.08, 0.22, -0.15, 0.18]",
    ))

    db.add(RiskPrediction(
        visit_id=v3_2.id,
        task_type=TaskType.ICU_30D_READMISSION,
        disease_name="icu_readmission",
        risk_probability=0.112,
        risk_category=RiskCategory.LOW,
        top_drivers_json='[{"feature_name": "Lactate", "impact_score": 0.18, "description": "Normalized serum lactate (1.4 mmol/L)"}, {"feature_name": "Creatinine", "impact_score": 0.15, "description": "AKI resolution to baseline renal function"}]',
    ))
    db.add(RiskPrediction(
        visit_id=v3_2.id,
        task_type=TaskType.ICU_30D_MORTALITY,
        disease_name="icu_mortality",
        risk_probability=0.048,
        risk_category=RiskCategory.LOW,
        top_drivers_json='[{"feature_name": "Lactate", "impact_score": 0.12, "description": "Resolved shock state"}, {"feature_name": "PaO2_FiO2", "impact_score": 0.10, "description": "Oxygenation index normalized"}]',
    ))

    created_patients.append(p3)

    db.commit()
    return created_patients
