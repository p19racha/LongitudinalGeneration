"""
Standard clinical feature definitions, reference ranges, and units for PULSE CDSS.
"""
from typing import Dict, Optional, Tuple
from pydantic import BaseModel


class FeatureMeta(BaseModel):
    name: str
    display_name: str
    modality: str
    unit: str
    ref_low: float
    ref_high: float
    category: str
    description: str


# ---------------------------------------------------------------------------
# Standard Routine Labs (Modality A)
# ---------------------------------------------------------------------------
ROUTINE_LAB_FEATURES: Dict[str, FeatureMeta] = {
    "Glucose_Fasting": FeatureMeta(
        name="Glucose_Fasting",
        display_name="Fasting Glucose",
        modality="routine_labs",
        unit="mg/dL",
        ref_low=70.0,
        ref_high=99.0,
        category="Glycemic",
        description="Fasting blood glucose concentration.",
    ),
    "HbA1c": FeatureMeta(
        name="HbA1c",
        display_name="Hemoglobin A1c",
        modality="routine_labs",
        unit="%",
        ref_low=4.0,
        ref_high=5.6,
        category="Glycemic",
        description="Glycated hemoglobin, representing 3-month average glucose.",
    ),
    "Cholesterol_Total": FeatureMeta(
        name="Cholesterol_Total",
        display_name="Total Cholesterol",
        modality="routine_labs",
        unit="mg/dL",
        ref_low=125.0,
        ref_high=200.0,
        category="Lipids",
        description="Total circulating blood cholesterol.",
    ),
    "Triglycerides": FeatureMeta(
        name="Triglycerides",
        display_name="Triglycerides",
        modality="routine_labs",
        unit="mg/dL",
        ref_low=40.0,
        ref_high=150.0,
        category="Lipids",
        description="Fasting serum triglycerides.",
    ),
    "HDL_Cholesterol": FeatureMeta(
        name="HDL_Cholesterol",
        display_name="HDL Cholesterol",
        modality="routine_labs",
        unit="mg/dL",
        ref_low=40.0,
        ref_high=60.0,
        category="Lipids",
        description="High-density lipoprotein cholesterol.",
    ),
    "LDL_Cholesterol": FeatureMeta(
        name="LDL_Cholesterol",
        display_name="LDL Cholesterol",
        modality="routine_labs",
        unit="mg/dL",
        ref_low=50.0,
        ref_high=100.0,
        category="Lipids",
        description="Low-density lipoprotein cholesterol.",
    ),
    "ALT": FeatureMeta(
        name="ALT",
        display_name="Alanine Aminotransferase (ALT)",
        modality="routine_labs",
        unit="U/L",
        ref_low=7.0,
        ref_high=56.0,
        category="Hepatic",
        description="Liver enzyme indicating hepatocellular integrity.",
    ),
    "AST": FeatureMeta(
        name="AST",
        display_name="Aspartate Aminotransferase (AST)",
        modality="routine_labs",
        unit="U/L",
        ref_low=10.0,
        ref_high=40.0,
        category="Hepatic",
        description="Enzyme released upon liver or cardiac muscle injury.",
    ),
    "Creatinine": FeatureMeta(
        name="Creatinine",
        display_name="Serum Creatinine",
        modality="routine_labs",
        unit="mg/dL",
        ref_low=0.7,
        ref_high=1.3,
        category="Renal",
        description="Renal excretion metabolite tracking glomerular filtration.",
    ),
    "hsCRP": FeatureMeta(
        name="hsCRP",
        display_name="High-Sensitivity CRP",
        modality="routine_labs",
        unit="mg/L",
        ref_low=0.0,
        ref_high=3.0,
        category="Inflammatory",
        description="Marker of low-grade systemic vascular inflammation.",
    ),
    "Homocysteine": FeatureMeta(
        name="Homocysteine",
        display_name="Total Homocysteine",
        modality="routine_labs",
        unit="umol/L",
        ref_low=4.0,
        ref_high=15.0,
        category="Vascular/Neuro",
        description="Amino acid linked to vascular damage and cognitive decline.",
    ),
    "Vitamin_B12": FeatureMeta(
        name="Vitamin_B12",
        display_name="Cobalamin (Vitamin B12)",
        modality="routine_labs",
        unit="pg/mL",
        ref_low=200.0,
        ref_high=900.0,
        category="Vitamins",
        description="Crucial vitamin for neurological function and hematopoiesis.",
    ),
    "TSH": FeatureMeta(
        name="TSH",
        display_name="Thyroid Stimulating Hormone",
        modality="routine_labs",
        unit="uIU/mL",
        ref_low=0.4,
        ref_high=4.0,
        category="Endocrine",
        description="Pituitary hormone regulating thyroid metabolic control.",
    ),
    "Albumin": FeatureMeta(
        name="Albumin",
        display_name="Serum Albumin",
        modality="routine_labs",
        unit="g/dL",
        ref_low=3.5,
        ref_high=5.0,
        category="Hepatic/Renal",
        description="Abundant plasma protein reflecting nutritional and liver status.",
    ),
    "Lactate": FeatureMeta(
        name="Lactate",
        display_name="Serum Lactate",
        modality="routine_labs",
        unit="mmol/L",
        ref_low=0.5,
        ref_high=2.0,
        category="ICU/Perfusion",
        description="Key marker of cellular anaerobic metabolism and tissue hypoperfusion.",
    ),
    "WBC": FeatureMeta(
        name="WBC",
        display_name="White Blood Cell Count",
        modality="routine_labs",
        unit="k/uL",
        ref_low=4.0,
        ref_high=11.0,
        category="Hematology",
        description="Total leukocyte count reflecting systemic immune/infectious response.",
    ),
    "Platelets": FeatureMeta(
        name="Platelets",
        display_name="Platelet Count",
        modality="routine_labs",
        unit="k/uL",
        ref_low=150.0,
        ref_high=450.0,
        category="Hematology",
        description="Thrombocyte count reflecting coagulation and sepsis severity.",
    ),
    "MAP": FeatureMeta(
        name="MAP",
        display_name="Mean Arterial Pressure",
        modality="routine_labs",
        unit="mmHg",
        ref_low=70.0,
        ref_high=105.0,
        category="Hemodynamics",
        description="Average arterial pressure sustaining organ perfusion.",
    ),
    "PaO2_FiO2": FeatureMeta(
        name="PaO2_FiO2",
        display_name="PaO2 / FiO2 Ratio (Horowitz)",
        modality="routine_labs",
        unit="mmHg",
        ref_low=300.0,
        ref_high=500.0,
        category="Respiratory",
        description="Oxygenation ratio assessing acute lung injury / ARDS.",
    ),
}

# ---------------------------------------------------------------------------
# High-Value Metabolomics Biomarkers (Modality B)
# ---------------------------------------------------------------------------
METABOLOMICS_FEATURES: Dict[str, FeatureMeta] = {
    "Free_Cholesterol_to_Total_Lipid_large_LDL": FeatureMeta(
        name="Free_Cholesterol_to_Total_Lipid_large_LDL",
        display_name="Free Cholesterol to Total Lipids in Large LDL",
        modality="metabolomics",
        unit="ratio",
        ref_low=0.22,
        ref_high=0.32,
        category="Atherogenic Lipids",
        description="Top-ranked PULSE lipid ratio marker indicating high coronary risk when elevated.",
    ),
    "TG_to_PG_ratio": FeatureMeta(
        name="TG_to_PG_ratio",
        display_name="Triglyceride to Phosphoglyceride Ratio",
        modality="metabolomics",
        unit="ratio",
        ref_low=0.90,
        ref_high=1.40,
        category="Metabolic Homeostasis",
        description="Ratio of neutral lipids to membrane phospholipids.",
    ),
    "small_VLDL_TG_pct": FeatureMeta(
        name="small_VLDL_TG_pct",
        display_name="Triglyceride % in Small VLDL Particles",
        modality="metabolomics",
        unit="fraction",
        ref_low=0.25,
        ref_high=0.40,
        category="Atherogenic Lipids",
        description="Fraction of triglycerides packaged into remnant lipoprotein particles.",
    ),
    "medium_VLDL_Cholesterol_pct": FeatureMeta(
        name="medium_VLDL_Cholesterol_pct",
        display_name="Cholesterol % in Medium VLDL",
        modality="metabolomics",
        unit="fraction",
        ref_low=0.18,
        ref_high=0.28,
        category="Atherogenic Lipids",
        description="Cholesterol content in medium very-low-density lipoproteins.",
    ),
    "ApoB_to_ApoA1_ratio": FeatureMeta(
        name="ApoB_to_ApoA1_ratio",
        display_name="Apolipoprotein B / A1 Ratio",
        modality="metabolomics",
        unit="ratio",
        ref_low=0.40,
        ref_high=0.80,
        category="Cardiovascular Risk",
        description="Balance between atherogenic particles (ApoB) and protective particles (ApoA1).",
    ),
    "large_HDL_Phospholipids": FeatureMeta(
        name="large_HDL_Phospholipids",
        display_name="Phospholipids in Large HDL",
        modality="metabolomics",
        unit="fraction",
        ref_low=0.45,
        ref_high=0.65,
        category="Cardioprotective",
        description="Healthy reverse-cholesterol transport phospholipid subfraction.",
    ),
    "Total_BCAA": FeatureMeta(
        name="Total_BCAA",
        display_name="Branched-Chain Amino Acids (BCAA)",
        modality="metabolomics",
        unit="umol/L",
        ref_low=350.0,
        ref_high=550.0,
        category="Insulin Resistance",
        description="Circulating leucine, isoleucine, and valine, linked to early insulin resistance.",
    ),
    "Glycoprotein_Acetyls_GlycA": FeatureMeta(
        name="Glycoprotein_Acetyls_GlycA",
        display_name="Glycoprotein Acetyls (GlycA)",
        modality="metabolomics",
        unit="mmol/L",
        ref_low=1.0,
        ref_high=1.6,
        category="Systemic Inflammation",
        description="Cumulative NMR marker of chronic systemic inflammatory burden.",
    ),
}

# ---------------------------------------------------------------------------
# High-Value Plasma Proteomics Biomarkers (Modality C)
# ---------------------------------------------------------------------------
PROTEOMICS_FEATURES: Dict[str, FeatureMeta] = {
    "GFAP": FeatureMeta(
        name="GFAP",
        display_name="Glial Fibrillary Acidic Protein (GFAP)",
        modality="proteomics",
        unit="pg/mL",
        ref_low=40.0,
        ref_high=120.0,
        category="Neurodegeneration",
        description="Reactive astrogliosis biomarker strongly elevated in preclinical Alzheimer's disease.",
    ),
    "NEFL_NfL": FeatureMeta(
        name="NEFL_NfL",
        display_name="Neurofilament Light Chain (NfL)",
        modality="proteomics",
        unit="pg/mL",
        ref_low=6.0,
        ref_high=20.0,
        category="Neuroaxonal Injury",
        description="Gold-standard circulating biomarker of ongoing neuroaxonal breakdown.",
    ),
    "GDF15": FeatureMeta(
        name="GDF15",
        display_name="Growth Differentiation Factor 15",
        modality="proteomics",
        unit="pg/mL",
        ref_low=300.0,
        ref_high=800.0,
        category="Biological Aging",
        description="Mitochondrial and cellular stress marker associated with mortality and aging.",
    ),
    "NT_proBNP": FeatureMeta(
        name="NT_proBNP",
        display_name="N-Terminal Pro-BNP",
        modality="proteomics",
        unit="pg/mL",
        ref_low=0.0,
        ref_high=125.0,
        category="Cardiac Stress",
        description="Ventricular wall stretch hormone diagnosing early heart failure.",
    ),
    "Troponin_T_hs": FeatureMeta(
        name="Troponin_T_hs",
        display_name="High-Sensitivity Troponin T",
        modality="proteomics",
        unit="ng/L",
        ref_low=0.0,
        ref_high=14.0,
        category="Myocardial Injury",
        description="Direct biomarker of subclinical or acute myocardial damage.",
    ),
    "Cystatin_C": FeatureMeta(
        name="Cystatin_C",
        display_name="Cystatin C",
        modality="proteomics",
        unit="mg/L",
        ref_low=0.6,
        ref_high=1.0,
        category="Renal & Vascular",
        description="Low molecular weight protein reflecting true glomerular filtration rate.",
    ),
}

ALL_FEATURES: Dict[str, FeatureMeta] = {
    **ROUTINE_LAB_FEATURES,
    **METABOLOMICS_FEATURES,
    **PROTEOMICS_FEATURES,
}


def get_feature_meta(feature_name: str) -> Optional[FeatureMeta]:
    """Retrieve metadata for a known feature."""
    return ALL_FEATURES.get(feature_name)
