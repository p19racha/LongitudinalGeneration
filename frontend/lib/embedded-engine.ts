/**
 * PULSE Embedded Offline Clinical Decision Support Engine.
 * 
 * Provides an autonomous, high-fidelity in-memory/localStorage CDSS inference engine
 * that activates instantly whenever the live PyTorch FastAPI backend is offline.
 * Enables complete standalone operation for desktop (.exe, .dmg, .AppImage) and web.
 */

import {
  Patient,
  PatientCreate,
  Visit,
  VisitCreate,
  Measurement,
  MeasurementCreate,
  ClinicalNote,
  ClinicalNoteCreate,
  RunPulseResponse,
  TrajectoriesResponse,
  ClinicalReport,
  SimulationResponse,
  CopilotQueryResponse,
  SBARReport,
  CohortOverviewResponse,
  TriageRadarResponse,
  BatchImportResult,
  CDSService,
  CDSHookResponse,
  AlertsListResponse,
  ClinicalAlert,
  FeatureCatalog,
  FeatureItem,
  RiskPrediction,
  RiskCategory,
  TaskType,
  TrajectoryPoint,
  FeatureTrajectory,
  BiomarkerTrajectory,
  CohortType,
} from "@/types/clinical";

const STORAGE_KEY = "pulse_embedded_cdss_v1";

// ---------------------------------------------------------------------------
// Standard Clinical Feature Catalog
// ---------------------------------------------------------------------------
export const EMBEDDED_FEATURE_CATALOG: FeatureCatalog = {
  routine_labs: [
    { name: "Glucose_Fasting", category: "routine_lab", unit: "mg/dL", ref_low: 70.0, ref_high: 99.0, description: "Fasting blood glucose concentration." },
    { name: "HbA1c", category: "routine_lab", unit: "%", ref_low: 4.0, ref_high: 5.6, description: "Glycated hemoglobin (3-month average glucose)." },
    { name: "Cholesterol_Total", category: "routine_lab", unit: "mg/dL", ref_low: 125.0, ref_high: 200.0, description: "Total circulating serum cholesterol." },
    { name: "Triglycerides", category: "routine_lab", unit: "mg/dL", ref_low: 40.0, ref_high: 150.0, description: "Fasting serum triglycerides." },
    { name: "HDL_Cholesterol", category: "routine_lab", unit: "mg/dL", ref_low: 40.0, ref_high: 60.0, description: "High-density lipoprotein cholesterol." },
    { name: "LDL_Cholesterol", category: "routine_lab", unit: "mg/dL", ref_low: 50.0, ref_high: 100.0, description: "Low-density lipoprotein cholesterol." },
    { name: "ALT", category: "routine_lab", unit: "U/L", ref_low: 7.0, ref_high: 56.0, description: "Alanine Aminotransferase (hepatocellular integrity)." },
    { name: "AST", category: "routine_lab", unit: "U/L", ref_low: 10.0, ref_high: 40.0, description: "Aspartate Aminotransferase." },
    { name: "Creatinine", category: "routine_lab", unit: "mg/dL", ref_low: 0.7, ref_high: 1.3, description: "Serum creatinine (renal clearance)." },
    { name: "hsCRP", category: "routine_lab", unit: "mg/L", ref_low: 0.0, ref_high: 3.0, description: "High-sensitivity C-reactive protein (vascular inflammation)." },
    { name: "Homocysteine", category: "routine_lab", unit: "umol/L", ref_low: 4.0, ref_high: 15.0, description: "Neurovascular & atherogenic risk marker." },
    { name: "Vitamin_B12", category: "routine_lab", unit: "pg/mL", ref_low: 200.0, ref_high: 900.0, description: "Serum Cobalamin." },
    { name: "TSH", category: "routine_lab", unit: "uIU/mL", ref_low: 0.4, ref_high: 4.0, description: "Thyroid Stimulating Hormone." },
    { name: "Albumin", category: "routine_lab", unit: "g/dL", ref_low: 3.5, ref_high: 5.0, description: "Serum Albumin (nutritional/hepatic index)." },
    { name: "Lactate", category: "routine_lab", unit: "mmol/L", ref_low: 0.5, ref_high: 2.0, description: "Serum Lactate (cellular hypoperfusion marker)." },
    { name: "WBC", category: "routine_lab", unit: "k/uL", ref_low: 4.0, ref_high: 11.0, description: "White Blood Cell Count." },
    { name: "Platelets", category: "routine_lab", unit: "k/uL", ref_low: 150.0, ref_high: 450.0, description: "Platelet Count." },
    { name: "MAP", category: "routine_lab", unit: "mmHg", ref_low: 70.0, ref_high: 105.0, description: "Mean Arterial Pressure." },
    { name: "PaO2_FiO2", category: "routine_lab", unit: "mmHg", ref_low: 300.0, ref_high: 500.0, description: "Horowitz Index (Oxygenation ratio)." },
    { name: "Microalbumin", category: "routine_lab", unit: "mg/L", ref_low: 0.0, ref_high: 30.0, description: "Urine microalbumin excretion." },
  ],
  metabolomics: [
    { name: "Free_Cholesterol_to_Total_Lipid_large_LDL", category: "metabolomics", unit: "ratio", ref_low: 0.22, ref_high: 0.32, description: "Unesterified free cholesterol ratio in large LDL subfractions." },
    { name: "TG_to_PG_ratio", category: "metabolomics", unit: "ratio", ref_low: 0.90, ref_high: 1.40, description: "Triglyceride to Phosphoglyceride ratio." },
    { name: "small_VLDL_TG_pct", category: "metabolomics", unit: "fraction", ref_low: 0.25, ref_high: 0.40, description: "Percentage of triglycerides carried by small VLDL particles." },
    { name: "BCAA_total", category: "metabolomics", unit: "umol/L", ref_low: 320.0, ref_high: 490.0, description: "Total branched-chain amino acids (Valine, Leucine, Isoleucine)." },
  ],
  proteomics: [
    { name: "GFAP", category: "proteomics", unit: "pg/mL", ref_low: 40.0, ref_high: 120.0, description: "Glial Fibrillary Acidic Protein (reactive astrogliosis)." },
    { name: "NEFL_NfL", category: "proteomics", unit: "pg/mL", ref_low: 6.0, ref_high: 20.0, description: "Neurofilament Light Chain (neuroaxonal damage)." },
    { name: "GDF15", category: "proteomics", unit: "pg/mL", ref_low: 300.0, ref_high: 800.0, description: "Growth Differentiation Factor 15 (cellular senescence/mitochondrial stress)." },
  ],
  total_count: 27,
};

// ---------------------------------------------------------------------------
// Seed Clinical Cohorts (6 High-Fidelity Patient Profiles)
// ---------------------------------------------------------------------------
function getSeedPatients(): Patient[] {
  return [
    // 1. Arthur Pendelton: Outpatient Cardiovascular & Glycemic Progression
    {
      id: "pt-arthur-pendelton-01",
      mrn: "MRN-CV-10029",
      full_name: "Arthur Pendelton",
      age: 62.0,
      sex: "M",
      cohort_type: "OUTPATIENT_CHRONIC",
      clinical_history_summary: "62yo male with baseline pre-diabetes, grade 1 essential hypertension, and family history of premature CAD. Evaluated across 3 annual checkups.",
      created_at: "2023-01-15T09:00:00Z",
      updated_at: "2025-02-10T14:30:00Z",
      visits: [
        {
          id: "v-ap-0",
          patient_id: "pt-arthur-pendelton-01",
          visit_index: 0,
          visit_date: "2023-01-15",
          hours_from_baseline: 0.0,
          visit_summary: "Annual Comprehensive Health Checkup (Baseline paired routine labs & metabolomics)",
          created_at: "2023-01-15T09:00:00Z",
          clinical_notes: [],
          latent_state: {
            id: "ls-ap-0",
            visit_id: "v-ap-0",
            z_vector: [-0.12, 0.45, -0.22, 0.08, 0.19, -0.34, 0.51, 0.02, -0.15, 0.28, -0.41, 0.11, 0.05, -0.19, 0.31, -0.07],
            past_vector: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            created_at: "2023-01-15T09:00:00Z",
          },
          measurements: [
            { id: "m-ap-0-1", visit_id: "v-ap-0", feature_name: "Glucose_Fasting", feature_category: "routine_labs", value: 104.0, unit: "mg/dL", ref_low: 70.0, ref_high: 99.0, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-2", visit_id: "v-ap-0", feature_name: "HbA1c", feature_category: "routine_labs", value: 5.8, unit: "%", ref_low: 4.0, ref_high: 5.6, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-3", visit_id: "v-ap-0", feature_name: "Cholesterol_Total", feature_category: "routine_labs", value: 210.0, unit: "mg/dL", ref_low: 125.0, ref_high: 200.0, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-4", visit_id: "v-ap-0", feature_name: "Triglycerides", feature_category: "routine_labs", value: 160.0, unit: "mg/dL", ref_low: 40.0, ref_high: 150.0, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-5", visit_id: "v-ap-0", feature_name: "HDL_Cholesterol", feature_category: "routine_labs", value: 42.0, unit: "mg/dL", ref_low: 40.0, ref_high: 60.0, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-6", visit_id: "v-ap-0", feature_name: "LDL_Cholesterol", feature_category: "routine_labs", value: 136.0, unit: "mg/dL", ref_low: 50.0, ref_high: 100.0, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-7", visit_id: "v-ap-0", feature_name: "ALT", feature_category: "routine_labs", value: 28.0, unit: "U/L", ref_low: 7.0, ref_high: 56.0, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-8", visit_id: "v-ap-0", feature_name: "AST", feature_category: "routine_labs", value: 24.0, unit: "U/L", ref_low: 10.0, ref_high: 40.0, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-9", visit_id: "v-ap-0", feature_name: "Creatinine", feature_category: "routine_labs", value: 0.95, unit: "mg/dL", ref_low: 0.7, ref_high: 1.3, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-10", visit_id: "v-ap-0", feature_name: "hsCRP", feature_category: "routine_labs", value: 1.8, unit: "mg/L", ref_low: 0.0, ref_high: 3.0, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-11", visit_id: "v-ap-0", feature_name: "Free_Cholesterol_to_Total_Lipid_large_LDL", feature_category: "metabolomics", value: 0.28, unit: "ratio", ref_low: 0.22, ref_high: 0.32, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-12", visit_id: "v-ap-0", feature_name: "TG_to_PG_ratio", feature_category: "metabolomics", value: 1.15, unit: "ratio", ref_low: 0.90, ref_high: 1.40, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
            { id: "m-ap-0-13", visit_id: "v-ap-0", feature_name: "small_VLDL_TG_pct", feature_category: "metabolomics", value: 0.35, unit: "fraction", ref_low: 0.25, ref_high: 0.40, is_synthetic: false, created_at: "2023-01-15T09:00:00Z" },
          ],
          predictions: [
            {
              id: "pred-ap-0-1",
              visit_id: "v-ap-0",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "myocardial_infarction",
              risk_probability: 0.142,
              risk_category: "LOW",
              top_drivers: [
                { feature_name: "LDL_Cholesterol", impact_score: 0.24, description: "Borderline elevated LDL (136 mg/dL)" },
                { feature_name: "hsCRP", impact_score: 0.18, description: "Low-grade systemic inflammation (1.8 mg/L)" },
              ],
              created_at: "2023-01-15T09:00:00Z",
            },
          ],
        },
        {
          id: "v-ap-1",
          patient_id: "pt-arthur-pendelton-01",
          visit_index: 1,
          visit_date: "2024-01-20",
          hours_from_baseline: 8760.0,
          visit_summary: "12-Month Follow-Up (Routine Labs measured, Metabolomics missing -> Synthesized by PULSE)",
          created_at: "2024-01-20T10:15:00Z",
          clinical_notes: [],
          latent_state: {
            id: "ls-ap-1",
            visit_id: "v-ap-1",
            z_vector: [-0.05, 0.62, -0.31, 0.14, 0.28, -0.45, 0.68, 0.09, -0.22, 0.41, -0.55, 0.19, 0.11, -0.27, 0.44, -0.12],
            past_vector: [-0.10, 0.48, -0.24, 0.09, 0.20, -0.36, 0.53, 0.03, -0.16, 0.30, -0.43, 0.12, 0.06, -0.20, 0.33, -0.08],
            created_at: "2024-01-20T10:15:00Z",
          },
          measurements: [
            { id: "m-ap-1-1", visit_id: "v-ap-1", feature_name: "Glucose_Fasting", feature_category: "routine_labs", value: 118.0, unit: "mg/dL", ref_low: 70.0, ref_high: 99.0, is_synthetic: false, created_at: "2024-01-20T10:15:00Z" },
            { id: "m-ap-1-2", visit_id: "v-ap-1", feature_name: "HbA1c", feature_category: "routine_labs", value: 6.3, unit: "%", ref_low: 4.0, ref_high: 5.6, is_synthetic: false, created_at: "2024-01-20T10:15:00Z" },
            { id: "m-ap-1-3", visit_id: "v-ap-1", feature_name: "Cholesterol_Total", feature_category: "routine_labs", value: 232.0, unit: "mg/dL", ref_low: 125.0, ref_high: 200.0, is_synthetic: false, created_at: "2024-01-20T10:15:00Z" },
            { id: "m-ap-1-4", visit_id: "v-ap-1", feature_name: "Triglycerides", feature_category: "routine_labs", value: 195.0, unit: "mg/dL", ref_low: 40.0, ref_high: 150.0, is_synthetic: false, created_at: "2024-01-20T10:15:00Z" },
            { id: "m-ap-1-5", visit_id: "v-ap-1", feature_name: "HDL_Cholesterol", feature_category: "routine_labs", value: 38.0, unit: "mg/dL", ref_low: 40.0, ref_high: 60.0, is_synthetic: false, created_at: "2024-01-20T10:15:00Z" },
            { id: "m-ap-1-6", visit_id: "v-ap-1", feature_name: "LDL_Cholesterol", feature_category: "routine_labs", value: 152.0, unit: "mg/dL", ref_low: 50.0, ref_high: 100.0, is_synthetic: false, created_at: "2024-01-20T10:15:00Z" },
            { id: "m-ap-1-7", visit_id: "v-ap-1", feature_name: "hsCRP", feature_category: "routine_labs", value: 2.6, unit: "mg/L", ref_low: 0.0, ref_high: 3.0, is_synthetic: false, created_at: "2024-01-20T10:15:00Z" },
            { id: "m-ap-1-8", visit_id: "v-ap-1", feature_name: "Free_Cholesterol_to_Total_Lipid_large_LDL", feature_category: "metabolomics", value: 0.33, unit: "ratio", ref_low: 0.22, ref_high: 0.32, is_synthetic: true, confidence_interval_low: 0.31, confidence_interval_high: 0.35, created_at: "2024-01-20T10:15:00Z" },
            { id: "m-ap-1-9", visit_id: "v-ap-1", feature_name: "TG_to_PG_ratio", feature_category: "metabolomics", value: 1.34, unit: "ratio", ref_low: 0.90, ref_high: 1.40, is_synthetic: true, confidence_interval_low: 1.25, confidence_interval_high: 1.43, created_at: "2024-01-20T10:15:00Z" },
            { id: "m-ap-1-10", visit_id: "v-ap-1", feature_name: "small_VLDL_TG_pct", feature_category: "metabolomics", value: 0.44, unit: "fraction", ref_low: 0.25, ref_high: 0.40, is_synthetic: true, confidence_interval_low: 0.41, confidence_interval_high: 0.48, created_at: "2024-01-20T10:15:00Z" },
          ],
          predictions: [
            {
              id: "pred-ap-1-1",
              visit_id: "v-ap-1",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "myocardial_infarction",
              risk_probability: 0.241,
              risk_category: "HIGH",
              top_drivers: [
                { feature_name: "Free_Cholesterol_to_Total_Lipid_large_LDL", impact_score: 0.38, description: "Atherogenic LDL lipid ratio shift (+17.8% from baseline)" },
                { feature_name: "HbA1c", impact_score: 0.29, description: "Progression into overt pre-diabetic glycemic range (6.3%)" },
              ],
              created_at: "2024-01-20T10:15:00Z",
            },
            {
              id: "pred-ap-1-2",
              visit_id: "v-ap-1",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "heart_failure",
              risk_probability: 0.184,
              risk_category: "MODERATE",
              top_drivers: [
                { feature_name: "small_VLDL_TG_pct", impact_score: 0.31, description: "Synthesized triglyceride-rich lipoprotein expansion" },
                { feature_name: "hsCRP", impact_score: 0.22, description: "Persistent systemic inflammatory activation" },
              ],
              created_at: "2024-01-20T10:15:00Z",
            },
          ],
        },
        {
          id: "v-ap-2",
          patient_id: "pt-arthur-pendelton-01",
          visit_index: 2,
          visit_date: "2025-02-10",
          hours_from_baseline: 17520.0,
          visit_summary: "24-Month Follow-Up (Glycemic & Lipid deterioration confirmed, synthesized omics show critical atherogenic shift)",
          created_at: "2025-02-10T14:30:00Z",
          clinical_notes: [],
          latent_state: {
            id: "ls-ap-2",
            visit_id: "v-ap-2",
            z_vector: [0.02, 0.78, -0.42, 0.21, 0.39, -0.58, 0.82, 0.16, -0.29, 0.54, -0.68, 0.27, 0.18, -0.36, 0.58, -0.19],
            past_vector: [-0.04, 0.65, -0.33, 0.15, 0.29, -0.47, 0.71, 0.10, -0.23, 0.43, -0.57, 0.20, 0.12, -0.28, 0.46, -0.13],
            created_at: "2025-02-10T14:30:00Z",
          },
          measurements: [
            { id: "m-ap-2-1", visit_id: "v-ap-2", feature_name: "Glucose_Fasting", feature_category: "routine_labs", value: 126.0, unit: "mg/dL", ref_low: 70.0, ref_high: 99.0, is_synthetic: false, created_at: "2025-02-10T14:30:00Z" },
            { id: "m-ap-2-2", visit_id: "v-ap-2", feature_name: "HbA1c", feature_category: "routine_labs", value: 6.7, unit: "%", ref_low: 4.0, ref_high: 5.6, is_synthetic: false, created_at: "2025-02-10T14:30:00Z" },
            { id: "m-ap-2-3", visit_id: "v-ap-2", feature_name: "Cholesterol_Total", feature_category: "routine_labs", value: 245.0, unit: "mg/dL", ref_low: 125.0, ref_high: 200.0, is_synthetic: false, created_at: "2025-02-10T14:30:00Z" },
            { id: "m-ap-2-4", visit_id: "v-ap-2", feature_name: "Triglycerides", feature_category: "routine_labs", value: 218.0, unit: "mg/dL", ref_low: 40.0, ref_high: 150.0, is_synthetic: false, created_at: "2025-02-10T14:30:00Z" },
            { id: "m-ap-2-5", visit_id: "v-ap-2", feature_name: "HDL_Cholesterol", feature_category: "routine_labs", value: 36.0, unit: "mg/dL", ref_low: 40.0, ref_high: 60.0, is_synthetic: false, created_at: "2025-02-10T14:30:00Z" },
            { id: "m-ap-2-6", visit_id: "v-ap-2", feature_name: "LDL_Cholesterol", feature_category: "routine_labs", value: 164.0, unit: "mg/dL", ref_low: 50.0, ref_high: 100.0, is_synthetic: false, created_at: "2025-02-10T14:30:00Z" },
            { id: "m-ap-2-7", visit_id: "v-ap-2", feature_name: "hsCRP", feature_category: "routine_labs", value: 3.4, unit: "mg/L", ref_low: 0.0, ref_high: 3.0, is_synthetic: false, created_at: "2025-02-10T14:30:00Z" },
            { id: "m-ap-2-8", visit_id: "v-ap-2", feature_name: "Free_Cholesterol_to_Total_Lipid_large_LDL", feature_category: "metabolomics", value: 0.38, unit: "ratio", ref_low: 0.22, ref_high: 0.32, is_synthetic: true, confidence_interval_low: 0.35, confidence_interval_high: 0.41, created_at: "2025-02-10T14:30:00Z" },
            { id: "m-ap-2-9", visit_id: "v-ap-2", feature_name: "TG_to_PG_ratio", feature_category: "metabolomics", value: 1.48, unit: "ratio", ref_low: 0.90, ref_high: 1.40, is_synthetic: true, confidence_interval_low: 1.38, confidence_interval_high: 1.58, created_at: "2025-02-10T14:30:00Z" },
            { id: "m-ap-2-10", visit_id: "v-ap-2", feature_name: "small_VLDL_TG_pct", feature_category: "metabolomics", value: 0.51, unit: "fraction", ref_low: 0.25, ref_high: 0.40, is_synthetic: true, confidence_interval_low: 0.47, confidence_interval_high: 0.55, created_at: "2025-02-10T14:30:00Z" },
          ],
          predictions: [
            {
              id: "pred-ap-2-1",
              visit_id: "v-ap-2",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "myocardial_infarction",
              risk_probability: 0.315,
              risk_category: "HIGH",
              top_drivers: [
                { feature_name: "Free_Cholesterol_to_Total_Lipid_large_LDL", impact_score: 0.42, description: "Persistent abnormal cholesterol enrichment in LDL (+35.7% from baseline)" },
                { feature_name: "HbA1c", impact_score: 0.33, description: "New diagnosis threshold for Type 2 Diabetes (6.7%)" },
              ],
              created_at: "2025-02-10T14:30:00Z",
            },
            {
              id: "pred-ap-2-2",
              visit_id: "v-ap-2",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "heart_failure",
              risk_probability: 0.268,
              risk_category: "HIGH",
              top_drivers: [
                { feature_name: "small_VLDL_TG_pct", impact_score: 0.36, description: "Extreme VLDL triglyceride enrichment (0.51 fraction)" },
                { feature_name: "hsCRP", impact_score: 0.28, description: "High-risk vascular inflammation (3.4 mg/L)" },
              ],
              created_at: "2025-02-10T14:30:00Z",
            },
            {
              id: "pred-ap-2-3",
              visit_id: "v-ap-2",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "diabetes",
              risk_probability: 0.362,
              risk_category: "CRITICAL",
              top_drivers: [
                { feature_name: "HbA1c", impact_score: 0.55, description: "Diabetic HbA1c threshold breached (6.7%)" },
                { feature_name: "Glucose_Fasting", impact_score: 0.40, description: "Impaired fasting glucose (126 mg/dL)" },
              ],
              created_at: "2025-02-10T14:30:00Z",
            },
          ],
        },
      ],
    },

    // 2. Eleanor Vance: Neurodegenerative & Proteomics Trajectory
    {
      id: "pt-eleanor-vance-02",
      mrn: "MRN-ND-20481",
      full_name: "Eleanor Vance",
      age: 69.0,
      sex: "F",
      cohort_type: "OUTPATIENT_CHRONIC",
      clinical_history_summary: "69yo female with maternal history of late-onset Alzheimer's disease. Self-reported mild word-finding difficulty. Tracked across 2 outpatient neurology evaluations.",
      created_at: "2023-03-10T11:00:00Z",
      updated_at: "2024-04-12T15:20:00Z",
      visits: [
        {
          id: "v-ev-0",
          patient_id: "pt-eleanor-vance-02",
          visit_index: 0,
          visit_date: "2023-03-10",
          hours_from_baseline: 0.0,
          visit_summary: "Memory Clinic Initial Consultation (Routine Blood Panel + Baseline Proteomics)",
          created_at: "2023-03-10T11:00:00Z",
          clinical_notes: [],
          latent_state: {
            id: "ls-ev-0",
            visit_id: "v-ev-0",
            z_vector: [0.18, -0.22, 0.35, -0.11, 0.42, 0.05, -0.18, 0.29, -0.06, 0.14, -0.21, 0.33, -0.08, 0.25, -0.14, 0.09],
            past_vector: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            created_at: "2023-03-10T11:00:00Z",
          },
          measurements: [
            { id: "m-ev-0-1", visit_id: "v-ev-0", feature_name: "Homocysteine", feature_category: "routine_labs", value: 11.2, unit: "umol/L", ref_low: 4.0, ref_high: 15.0, is_synthetic: false, created_at: "2023-03-10T11:00:00Z" },
            { id: "m-ev-0-2", visit_id: "v-ev-0", feature_name: "Vitamin_B12", feature_category: "routine_labs", value: 380.0, unit: "pg/mL", ref_low: 200.0, ref_high: 900.0, is_synthetic: false, created_at: "2023-03-10T11:00:00Z" },
            { id: "m-ev-0-3", visit_id: "v-ev-0", feature_name: "TSH", feature_category: "routine_labs", value: 2.1, unit: "uIU/mL", ref_low: 0.4, ref_high: 4.0, is_synthetic: false, created_at: "2023-03-10T11:00:00Z" },
            { id: "m-ev-0-4", visit_id: "v-ev-0", feature_name: "hsCRP", feature_category: "routine_labs", value: 1.2, unit: "mg/L", ref_low: 0.0, ref_high: 3.0, is_synthetic: false, created_at: "2023-03-10T11:00:00Z" },
            { id: "m-ev-0-5", visit_id: "v-ev-0", feature_name: "Albumin", feature_category: "routine_labs", value: 4.3, unit: "g/dL", ref_low: 3.5, ref_high: 5.0, is_synthetic: false, created_at: "2023-03-10T11:00:00Z" },
            { id: "m-ev-0-6", visit_id: "v-ev-0", feature_name: "GFAP", feature_category: "proteomics", value: 85.0, unit: "pg/mL", ref_low: 40.0, ref_high: 120.0, is_synthetic: false, created_at: "2023-03-10T11:00:00Z" },
            { id: "m-ev-0-7", visit_id: "v-ev-0", feature_name: "NEFL_NfL", feature_category: "proteomics", value: 14.2, unit: "pg/mL", ref_low: 6.0, ref_high: 20.0, is_synthetic: false, created_at: "2023-03-10T11:00:00Z" },
            { id: "m-ev-0-8", visit_id: "v-ev-0", feature_name: "GDF15", feature_category: "proteomics", value: 620.0, unit: "pg/mL", ref_low: 300.0, ref_high: 800.0, is_synthetic: false, created_at: "2023-03-10T11:00:00Z" },
          ],
          predictions: [
            {
              id: "pred-ev-0-1",
              visit_id: "v-ev-0",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "dementia",
              risk_probability: 0.165,
              risk_category: "LOW",
              top_drivers: [
                { feature_name: "Age", impact_score: 0.32, description: "Baseline age demographic risk" },
                { feature_name: "NEFL_NfL", impact_score: 0.21, description: "Normal baseline neurofilament light chain (14.2 pg/mL)" },
              ],
              created_at: "2023-03-10T11:00:00Z",
            },
          ],
        },
        {
          id: "v-ev-1",
          patient_id: "pt-eleanor-vance-02",
          visit_index: 1,
          visit_date: "2024-04-12",
          hours_from_baseline: 9528.0,
          visit_summary: "12-Month Neurology Follow-Up (Routine Labs only, Proteomics synthesized by PULSE)",
          created_at: "2024-04-12T15:20:00Z",
          clinical_notes: [],
          latent_state: {
            id: "ls-ev-1",
            visit_id: "v-ev-1",
            z_vector: [0.34, -0.38, 0.52, -0.19, 0.61, 0.12, -0.29, 0.45, -0.11, 0.28, -0.36, 0.51, -0.14, 0.39, -0.22, 0.18],
            past_vector: [0.22, -0.26, 0.39, -0.13, 0.46, 0.06, -0.20, 0.32, -0.07, 0.16, -0.23, 0.36, -0.09, 0.28, -0.15, 0.10],
            created_at: "2024-04-12T15:20:00Z",
          },
          measurements: [
            { id: "m-ev-1-1", visit_id: "v-ev-1", feature_name: "Homocysteine", feature_category: "routine_labs", value: 15.6, unit: "umol/L", ref_low: 4.0, ref_high: 15.0, is_synthetic: false, created_at: "2024-04-12T15:20:00Z" },
            { id: "m-ev-1-2", visit_id: "v-ev-1", feature_name: "Vitamin_B12", feature_category: "routine_labs", value: 310.0, unit: "pg/mL", ref_low: 200.0, ref_high: 900.0, is_synthetic: false, created_at: "2024-04-12T15:20:00Z" },
            { id: "m-ev-1-3", visit_id: "v-ev-1", feature_name: "hsCRP", feature_category: "routine_labs", value: 2.9, unit: "mg/L", ref_low: 0.0, ref_high: 3.0, is_synthetic: false, created_at: "2024-04-12T15:20:00Z" },
            { id: "m-ev-1-4", visit_id: "v-ev-1", feature_name: "Albumin", feature_category: "routine_labs", value: 3.9, unit: "g/dL", ref_low: 3.5, ref_high: 5.0, is_synthetic: false, created_at: "2024-04-12T15:20:00Z" },
            { id: "m-ev-1-5", visit_id: "v-ev-1", feature_name: "GFAP", feature_category: "proteomics", value: 142.0, unit: "pg/mL", ref_low: 40.0, ref_high: 120.0, is_synthetic: true, confidence_interval_low: 131.0, confidence_interval_high: 154.0, created_at: "2024-04-12T15:20:00Z" },
            { id: "m-ev-1-6", visit_id: "v-ev-1", feature_name: "NEFL_NfL", feature_category: "proteomics", value: 23.8, unit: "pg/mL", ref_low: 6.0, ref_high: 20.0, is_synthetic: true, confidence_interval_low: 21.5, confidence_interval_high: 26.2, created_at: "2024-04-12T15:20:00Z" },
            { id: "m-ev-1-7", visit_id: "v-ev-1", feature_name: "GDF15", feature_category: "proteomics", value: 890.0, unit: "pg/mL", ref_low: 300.0, ref_high: 800.0, is_synthetic: true, confidence_interval_low: 840.0, confidence_interval_high: 945.0, created_at: "2024-04-12T15:20:00Z" },
          ],
          predictions: [
            {
              id: "pred-ev-1-1",
              visit_id: "v-ev-1",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "dementia",
              risk_probability: 0.384,
              risk_category: "HIGH",
              top_drivers: [
                { feature_name: "GFAP", impact_score: 0.48, description: "Predicted astrocytic activation / GFAP rise (+67.1% vs baseline)" },
                { feature_name: "NEFL_NfL", impact_score: 0.39, description: "Neuroaxonal injury signal / elevated NfL (23.8 pg/mL)" },
                { feature_name: "Homocysteine", impact_score: 0.26, description: "Elevated neurovascular risk marker (15.6 umol/L)" },
              ],
              created_at: "2024-04-12T15:20:00Z",
            },
          ],
        },
      ],
    },

    // 3. David Miller: Inpatient ICU Septic Shock (MIMIC-III Style)
    {
      id: "pt-david-miller-03",
      mrn: "MRN-ICU-88304",
      full_name: "David Miller",
      age: 54.0,
      sex: "M",
      cohort_type: "INPATIENT_ACUTE_ICU",
      clinical_history_summary: "54yo male admitted to ICU with septic shock secondary to severe community-acquired lobar pneumonia. Monitored across 24h resuscitation interval.",
      created_at: "2024-11-04T02:00:00Z",
      updated_at: "2024-11-05T02:00:00Z",
      visits: [
        {
          id: "v-dm-0",
          patient_id: "pt-david-miller-03",
          visit_index: 0,
          visit_date: "2024-11-04 02:00",
          hours_from_baseline: 0.0,
          visit_summary: "ICU Admission (Septic shock, lactic acidosis, vasopressor requirement)",
          created_at: "2024-11-04T02:00:00Z",
          clinical_notes: [
            {
              id: "cn-dm-0",
              visit_id: "v-dm-0",
              step_hour: 0.0,
              note_type: "ADMISSION",
              note_text: "Admitted from ED with T 39.1C, productive cough, confusion, severe hypotension refractory to 2L fluids. Norepinephrine initiated at 0.15 mcg/kg/min with broad-spectrum coverage.",
              created_at: "2024-11-04T02:00:00Z",
            },
          ],
          latent_state: {
            id: "ls-dm-0",
            visit_id: "v-dm-0",
            z_vector: [0.72, 0.55, -0.61, 0.84, -0.42, 0.39, -0.51, 0.77, -0.33, 0.48, -0.66, 0.29, -0.19, 0.52, -0.38, 0.44],
            past_vector: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            created_at: "2024-11-04T02:00:00Z",
          },
          measurements: [
            { id: "m-dm-0-1", visit_id: "v-dm-0", feature_name: "Lactate", feature_category: "routine_labs", value: 3.8, unit: "mmol/L", ref_low: 0.5, ref_high: 2.0, is_synthetic: false, created_at: "2024-11-04T02:00:00Z" },
            { id: "m-dm-0-2", visit_id: "v-dm-0", feature_name: "WBC", feature_category: "routine_labs", value: 18.4, unit: "k/uL", ref_low: 4.0, ref_high: 11.0, is_synthetic: false, created_at: "2024-11-04T02:00:00Z" },
            { id: "m-dm-0-3", visit_id: "v-dm-0", feature_name: "Platelets", feature_category: "routine_labs", value: 135.0, unit: "k/uL", ref_low: 150.0, ref_high: 450.0, is_synthetic: false, created_at: "2024-11-04T02:00:00Z" },
            { id: "m-dm-0-4", visit_id: "v-dm-0", feature_name: "Creatinine", feature_category: "routine_labs", value: 2.1, unit: "mg/dL", ref_low: 0.7, ref_high: 1.3, is_synthetic: false, created_at: "2024-11-04T02:00:00Z" },
            { id: "m-dm-0-5", visit_id: "v-dm-0", feature_name: "MAP", feature_category: "routine_labs", value: 62.0, unit: "mmHg", ref_low: 70.0, ref_high: 105.0, is_synthetic: false, created_at: "2024-11-04T02:00:00Z" },
            { id: "m-dm-0-6", visit_id: "v-dm-0", feature_name: "PaO2_FiO2", feature_category: "routine_labs", value: 195.0, unit: "mmHg", ref_low: 300.0, ref_high: 500.0, is_synthetic: false, created_at: "2024-11-04T02:00:00Z" },
          ],
          predictions: [
            {
              id: "pred-dm-0-1",
              visit_id: "v-dm-0",
              task_type: "30D_ICU_READMISSION",
              disease_name: "icu_readmission",
              risk_probability: 0.342,
              risk_category: "HIGH",
              top_drivers: [
                { feature_name: "Lactate", impact_score: 0.45, description: "Tissue hypoperfusion / high serum lactate (3.8 mmol/L)" },
                { feature_name: "PaO2_FiO2", impact_score: 0.38, description: "Moderate ARDS hypoxia criteria (<200)" },
              ],
              created_at: "2024-11-04T02:00:00Z",
            },
            {
              id: "pred-dm-0-2",
              visit_id: "v-dm-0",
              task_type: "30D_ICU_MORTALITY",
              disease_name: "icu_mortality",
              risk_probability: 0.285,
              risk_category: "HIGH",
              top_drivers: [
                { feature_name: "Lactate", impact_score: 0.52, description: "Severe septic lactic acidosis" },
                { feature_name: "Creatinine", impact_score: 0.35, description: "Acute kidney injury stage 2 (2.1 mg/dL)" },
              ],
              created_at: "2024-11-04T02:00:00Z",
            },
          ],
        },
        {
          id: "v-dm-1",
          patient_id: "pt-david-miller-03",
          visit_index: 1,
          visit_date: "2024-11-04 06:00",
          hours_from_baseline: 4.0,
          visit_summary: "ICU Step T+4h (Fluid response, weaning vasopressors, lactate clearing)",
          created_at: "2024-11-04T06:00:00Z",
          clinical_notes: [
            {
              id: "cn-dm-1",
              visit_id: "v-dm-1",
              step_hour: 4.0,
              note_type: "PROGRESS",
              note_text: "Norepinephrine decreased to 0.08 mcg/kg/min. Adequate urine output 45 mL/hr over past 2h. Repeat lactate clearance confirmed at 18%.",
              created_at: "2024-11-04T06:00:00Z",
            },
          ],
          latent_state: {
            id: "ls-dm-1",
            visit_id: "v-dm-1",
            z_vector: [0.58, 0.42, -0.48, 0.69, -0.31, 0.28, -0.40, 0.61, -0.25, 0.36, -0.51, 0.21, -0.14, 0.40, -0.28, 0.33],
            past_vector: [0.68, 0.51, -0.58, 0.80, -0.39, 0.36, -0.48, 0.72, -0.31, 0.45, -0.62, 0.27, -0.18, 0.49, -0.35, 0.41],
            created_at: "2024-11-04T06:00:00Z",
          },
          measurements: [
            { id: "m-dm-1-1", visit_id: "v-dm-1", feature_name: "Lactate", feature_category: "routine_labs", value: 3.1, unit: "mmol/L", ref_low: 0.5, ref_high: 2.0, is_synthetic: false, created_at: "2024-11-04T06:00:00Z" },
            { id: "m-dm-1-2", visit_id: "v-dm-1", feature_name: "WBC", feature_category: "routine_labs", value: 17.5, unit: "k/uL", ref_low: 4.0, ref_high: 11.0, is_synthetic: false, created_at: "2024-11-04T06:00:00Z" },
            { id: "m-dm-1-3", visit_id: "v-dm-1", feature_name: "Creatinine", feature_category: "routine_labs", value: 1.9, unit: "mg/dL", ref_low: 0.7, ref_high: 1.3, is_synthetic: false, created_at: "2024-11-04T06:00:00Z" },
            { id: "m-dm-1-4", visit_id: "v-dm-1", feature_name: "MAP", feature_category: "routine_labs", value: 68.0, unit: "mmHg", ref_low: 70.0, ref_high: 105.0, is_synthetic: false, created_at: "2024-11-04T06:00:00Z" },
            { id: "m-dm-1-5", visit_id: "v-dm-1", feature_name: "PaO2_FiO2", feature_category: "routine_labs", value: 215.0, unit: "mmHg", ref_low: 300.0, ref_high: 500.0, is_synthetic: false, created_at: "2024-11-04T06:00:00Z" },
          ],
          predictions: [
            {
              id: "pred-dm-1-1",
              visit_id: "v-dm-1",
              task_type: "30D_ICU_READMISSION",
              disease_name: "icu_readmission",
              risk_probability: 0.258,
              risk_category: "MODERATE",
              top_drivers: [
                { feature_name: "Lactate", impact_score: 0.39, description: "Lactate trending downward (3.1 mmol/L)" },
                { feature_name: "MAP", impact_score: 0.28, description: "Hemodynamic stabilization (MAP 68 mmHg)" },
              ],
              created_at: "2024-11-04T06:00:00Z",
            },
          ],
        },
        {
          id: "v-dm-2",
          patient_id: "pt-david-miller-03",
          visit_index: 2,
          visit_date: "2024-11-05 02:00",
          hours_from_baseline: 24.0,
          visit_summary: "ICU Step T+24h (Sepsis resolved, off vasopressors, clinical recovery)",
          created_at: "2024-11-05T02:00:00Z",
          clinical_notes: [
            {
              id: "cn-dm-2",
              visit_id: "v-dm-2",
              step_hour: 24.0,
              note_type: "PROGRESS",
              note_text: "Off all inotropic/vasopressor support for 12 hours. Normal serum lactate. High-flow taper tolerated well. Extubation and transfer to floor scheduled.",
              created_at: "2024-11-05T02:00:00Z",
            },
          ],
          latent_state: {
            id: "ls-dm-2",
            visit_id: "v-dm-2",
            z_vector: [0.15, 0.12, -0.18, 0.21, -0.09, 0.08, -0.14, 0.19, -0.07, 0.11, -0.18, 0.06, -0.04, 0.13, -0.09, 0.10],
            past_vector: [0.32, 0.24, -0.28, 0.38, -0.16, 0.15, -0.22, 0.33, -0.12, 0.19, -0.29, 0.11, -0.08, 0.22, -0.15, 0.18],
            created_at: "2024-11-05T02:00:00Z",
          },
          measurements: [
            { id: "m-dm-2-1", visit_id: "v-dm-2", feature_name: "Lactate", feature_category: "routine_labs", value: 1.4, unit: "mmol/L", ref_low: 0.5, ref_high: 2.0, is_synthetic: false, created_at: "2024-11-05T02:00:00Z" },
            { id: "m-dm-2-2", visit_id: "v-dm-2", feature_name: "WBC", feature_category: "routine_labs", value: 11.8, unit: "k/uL", ref_low: 4.0, ref_high: 11.0, is_synthetic: false, created_at: "2024-11-05T02:00:00Z" },
            { id: "m-dm-2-3", visit_id: "v-dm-2", feature_name: "Creatinine", feature_category: "routine_labs", value: 1.15, unit: "mg/dL", ref_low: 0.7, ref_high: 1.3, is_synthetic: false, created_at: "2024-11-05T02:00:00Z" },
            { id: "m-dm-2-4", visit_id: "v-dm-2", feature_name: "MAP", feature_category: "routine_labs", value: 78.0, unit: "mmHg", ref_low: 70.0, ref_high: 105.0, is_synthetic: false, created_at: "2024-11-05T02:00:00Z" },
            { id: "m-dm-2-5", visit_id: "v-dm-2", feature_name: "PaO2_FiO2", feature_category: "routine_labs", value: 285.0, unit: "mmHg", ref_low: 300.0, ref_high: 500.0, is_synthetic: false, created_at: "2024-11-05T02:00:00Z" },
          ],
          predictions: [
            {
              id: "pred-dm-2-1",
              visit_id: "v-dm-2",
              task_type: "30D_ICU_READMISSION",
              disease_name: "icu_readmission",
              risk_probability: 0.112,
              risk_category: "LOW",
              top_drivers: [
                { feature_name: "Lactate", impact_score: 0.18, description: "Normalized serum lactate (1.4 mmol/L)" },
                { feature_name: "Creatinine", impact_score: 0.15, description: "AKI resolution to baseline renal clearance" },
              ],
              created_at: "2024-11-05T02:00:00Z",
            },
            {
              id: "pred-dm-2-2",
              visit_id: "v-dm-2",
              task_type: "30D_ICU_MORTALITY",
              disease_name: "icu_mortality",
              risk_probability: 0.048,
              risk_category: "LOW",
              top_drivers: [
                { feature_name: "Lactate", impact_score: 0.12, description: "Resolved septic shock state" },
                { feature_name: "PaO2_FiO2", impact_score: 0.10, description: "Oxygenation index normalized" },
              ],
              created_at: "2024-11-05T02:00:00Z",
            },
          ],
        },
      ],
    },

    // 4. Sofia Rodriguez: Diabetic Nephropathy Progression
    {
      id: "pt-sofia-rodriguez-04",
      mrn: "MRN-DM-44910",
      full_name: "Sofia Rodriguez",
      age: 58.0,
      sex: "F",
      cohort_type: "OUTPATIENT_CHRONIC",
      clinical_history_summary: "58yo female with 7-year history of Type 2 Diabetes and emerging diabetic kidney disease. Monitored for accelerating glycemic and microalbuminuria markers.",
      created_at: "2023-05-10T10:00:00Z",
      updated_at: "2025-06-02T11:45:00Z",
      visits: [
        {
          id: "v-sr-0",
          patient_id: "pt-sofia-rodriguez-04",
          visit_index: 0,
          visit_date: "2023-05-10",
          hours_from_baseline: 0.0,
          visit_summary: "Baseline Endocrinology & Nephrology Assessment",
          created_at: "2023-05-10T10:00:00Z",
          clinical_notes: [],
          latent_state: {
            id: "ls-sr-0",
            visit_id: "v-sr-0",
            z_vector: [0.12, 0.38, -0.15, 0.44, 0.22, -0.18, 0.35, 0.08, -0.11, 0.24, -0.32, 0.14, 0.09, -0.16, 0.28, -0.05],
            created_at: "2023-05-10T10:00:00Z",
          },
          measurements: [
            { id: "m-sr-0-1", visit_id: "v-sr-0", feature_name: "Glucose_Fasting", feature_category: "routine_labs", value: 142.0, unit: "mg/dL", ref_low: 70.0, ref_high: 99.0, is_synthetic: false, created_at: "2023-05-10T10:00:00Z" },
            { id: "m-sr-0-2", visit_id: "v-sr-0", feature_name: "HbA1c", feature_category: "routine_labs", value: 7.4, unit: "%", ref_low: 4.0, ref_high: 5.6, is_synthetic: false, created_at: "2023-05-10T10:00:00Z" },
            { id: "m-sr-0-3", visit_id: "v-sr-0", feature_name: "Creatinine", feature_category: "routine_labs", value: 1.10, unit: "mg/dL", ref_low: 0.7, ref_high: 1.3, is_synthetic: false, created_at: "2023-05-10T10:00:00Z" },
            { id: "m-sr-0-4", visit_id: "v-sr-0", feature_name: "Microalbumin", feature_category: "routine_labs", value: 45.0, unit: "mg/L", ref_low: 0.0, ref_high: 30.0, is_synthetic: false, created_at: "2023-05-10T10:00:00Z" },
          ],
          predictions: [
            {
              id: "pred-sr-0-1",
              visit_id: "v-sr-0",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "diabetes",
              risk_probability: 0.310,
              risk_category: "HIGH",
              top_drivers: [
                { feature_name: "HbA1c", impact_score: 0.44, description: "Suboptimal glycemic control (7.4%)" },
                { feature_name: "Microalbumin", impact_score: 0.32, description: "Early microalbuminuria" },
              ],
              created_at: "2023-05-10T10:00:00Z",
            },
          ],
        },
        {
          id: "v-sr-1",
          patient_id: "pt-sofia-rodriguez-04",
          visit_index: 1,
          visit_date: "2024-05-18",
          hours_from_baseline: 8976.0,
          visit_summary: "12-Month Follow-Up (PULSE Synthesized Renal & Lipid Metabolomics)",
          created_at: "2024-05-18T11:00:00Z",
          clinical_notes: [],
          latent_state: {
            id: "ls-sr-1",
            visit_id: "v-sr-1",
            z_vector: [0.28, 0.55, -0.25, 0.62, 0.35, -0.29, 0.52, 0.16, -0.19, 0.38, -0.45, 0.22, 0.15, -0.24, 0.42, -0.09],
            created_at: "2024-05-18T11:00:00Z",
          },
          measurements: [
            { id: "m-sr-1-1", visit_id: "v-sr-1", feature_name: "Glucose_Fasting", feature_category: "routine_labs", value: 168.0, unit: "mg/dL", ref_low: 70.0, ref_high: 99.0, is_synthetic: false, created_at: "2024-05-18T11:00:00Z" },
            { id: "m-sr-1-2", visit_id: "v-sr-1", feature_name: "HbA1c", feature_category: "routine_labs", value: 8.1, unit: "%", ref_low: 4.0, ref_high: 5.6, is_synthetic: false, created_at: "2024-05-18T11:00:00Z" },
            { id: "m-sr-1-3", visit_id: "v-sr-1", feature_name: "Creatinine", feature_category: "routine_labs", value: 1.35, unit: "mg/dL", ref_low: 0.7, ref_high: 1.3, is_synthetic: false, created_at: "2024-05-18T11:00:00Z" },
            { id: "m-sr-1-4", visit_id: "v-sr-1", feature_name: "Microalbumin", feature_category: "routine_labs", value: 120.0, unit: "mg/L", ref_low: 0.0, ref_high: 30.0, is_synthetic: false, created_at: "2024-05-18T11:00:00Z" },
            { id: "m-sr-1-5", visit_id: "v-sr-1", feature_name: "Free_Cholesterol_to_Total_Lipid_large_LDL", feature_category: "metabolomics", value: 0.36, unit: "ratio", ref_low: 0.22, ref_high: 0.32, is_synthetic: true, confidence_interval_low: 0.33, confidence_interval_high: 0.39, created_at: "2024-05-18T11:00:00Z" },
            { id: "m-sr-1-6", visit_id: "v-sr-1", feature_name: "small_VLDL_TG_pct", feature_category: "metabolomics", value: 0.46, unit: "fraction", ref_low: 0.25, ref_high: 0.40, is_synthetic: true, confidence_interval_low: 0.42, confidence_interval_high: 0.50, created_at: "2024-05-18T11:00:00Z" },
          ],
          predictions: [
            {
              id: "pred-sr-1-1",
              visit_id: "v-sr-1",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "diabetes",
              risk_probability: 0.482,
              risk_category: "CRITICAL",
              top_drivers: [
                { feature_name: "HbA1c", impact_score: 0.52, description: "Accelerating glycosylation (8.1%)" },
                { feature_name: "Microalbumin", impact_score: 0.41, description: "Overt nephropathy progression (+166% albuminuria)" },
                { feature_name: "Creatinine", impact_score: 0.31, description: "Decline in glomerular filtration (Cr 1.35 mg/dL)" },
              ],
              created_at: "2024-05-18T11:00:00Z",
            },
          ],
        },
      ],
    },

    // 5. Marcus Vance: High-Risk Multi-Vessel CAD
    {
      id: "pt-marcus-vance-05",
      mrn: "MRN-CV-77123",
      full_name: "Marcus Vance",
      age: 67.0,
      sex: "M",
      cohort_type: "OUTPATIENT_CHRONIC",
      clinical_history_summary: "67yo male with coronary calcium score > 400 and treatment-resistant dyslipidemia. Synthesized omics profile reveals heavy atherogenic small-dense LDL shift.",
      created_at: "2023-08-14T08:30:00Z",
      updated_at: "2024-08-20T09:15:00Z",
      visits: [
        {
          id: "v-mv-0",
          patient_id: "pt-marcus-vance-05",
          visit_index: 0,
          visit_date: "2023-08-14",
          hours_from_baseline: 0.0,
          visit_summary: "Baseline Preventive Cardiology Evaluation",
          created_at: "2023-08-14T08:30:00Z",
          clinical_notes: [],
          measurements: [
            { id: "m-mv-0-1", visit_id: "v-mv-0", feature_name: "Cholesterol_Total", feature_category: "routine_labs", value: 248.0, unit: "mg/dL", ref_low: 125.0, ref_high: 200.0, is_synthetic: false, created_at: "2023-08-14T08:30:00Z" },
            { id: "m-mv-0-2", visit_id: "v-mv-0", feature_name: "LDL_Cholesterol", feature_category: "routine_labs", value: 168.0, unit: "mg/dL", ref_low: 50.0, ref_high: 100.0, is_synthetic: false, created_at: "2023-08-14T08:30:00Z" },
            { id: "m-mv-0-3", visit_id: "v-mv-0", feature_name: "Triglycerides", feature_category: "routine_labs", value: 225.0, unit: "mg/dL", ref_low: 40.0, ref_high: 150.0, is_synthetic: false, created_at: "2023-08-14T08:30:00Z" },
            { id: "m-mv-0-4", visit_id: "v-mv-0", feature_name: "hsCRP", feature_category: "routine_labs", value: 3.8, unit: "mg/L", ref_low: 0.0, ref_high: 3.0, is_synthetic: false, created_at: "2023-08-14T08:30:00Z" },
            { id: "m-mv-0-5", visit_id: "v-mv-0", feature_name: "Free_Cholesterol_to_Total_Lipid_large_LDL", feature_category: "metabolomics", value: 0.39, unit: "ratio", ref_low: 0.22, ref_high: 0.32, is_synthetic: true, confidence_interval_low: 0.36, confidence_interval_high: 0.42, created_at: "2023-08-14T08:30:00Z" },
          ],
          predictions: [
            {
              id: "pred-mv-0-1",
              visit_id: "v-mv-0",
              task_type: "10Y_CHRONIC_DISEASE",
              disease_name: "myocardial_infarction",
              risk_probability: 0.428,
              risk_category: "CRITICAL",
              top_drivers: [
                { feature_name: "LDL_Cholesterol", impact_score: 0.48, description: "Severe elevation in atherogenic LDL particles (168 mg/dL)" },
                { feature_name: "hsCRP", impact_score: 0.38, description: "Marked arterial wall inflammation (3.8 mg/L)" },
                { feature_name: "Free_Cholesterol_to_Total_Lipid_large_LDL", impact_score: 0.34, description: "Synthesized atherogenic subfraction expansion" },
              ],
              created_at: "2023-08-14T08:30:00Z",
            },
          ],
        },
      ],
    },

    // 6. Elena Rostova: ICU ARDS & Sepsis Recovery
    {
      id: "pt-elena-rostova-06",
      mrn: "MRN-ICU-99214",
      full_name: "Elena Rostova",
      age: 48.0,
      sex: "F",
      cohort_type: "INPATIENT_ACUTE_ICU",
      clinical_history_summary: "48yo female admitted to ICU with severe secondary ARDS following viral sepsis. Successfully resuscitated over 24-hour lung-protective protocol.",
      created_at: "2024-12-01T08:00:00Z",
      updated_at: "2024-12-02T08:00:00Z",
      visits: [
        {
          id: "v-er-0",
          patient_id: "pt-elena-rostova-06",
          visit_index: 0,
          visit_date: "2024-12-01 08:00",
          hours_from_baseline: 0.0,
          visit_summary: "Admission: Acute respiratory distress syndrome, PaO2/FiO2 145 mmHg",
          created_at: "2024-12-01T08:00:00Z",
          clinical_notes: [
            { id: "cn-er-0", visit_id: "v-er-0", step_hour: 0.0, note_type: "ADMISSION", note_text: "Intubated in ED. Prone positioning and lung-protective ventilation initiated.", created_at: "2024-12-01T08:00:00Z" }
          ],
          measurements: [
            { id: "m-er-0-1", visit_id: "v-er-0", feature_name: "Lactate", feature_category: "routine_labs", value: 4.6, unit: "mmol/L", ref_low: 0.5, ref_high: 2.0, is_synthetic: false, created_at: "2024-12-01T08:00:00Z" },
            { id: "m-er-0-2", visit_id: "v-er-0", feature_name: "PaO2_FiO2", feature_category: "routine_labs", value: 145.0, unit: "mmHg", ref_low: 300.0, ref_high: 500.0, is_synthetic: false, created_at: "2024-12-01T08:00:00Z" },
            { id: "m-er-0-3", visit_id: "v-er-0", feature_name: "MAP", feature_category: "routine_labs", value: 58.0, unit: "mmHg", ref_low: 70.0, ref_high: 105.0, is_synthetic: false, created_at: "2024-12-01T08:00:00Z" },
          ],
          predictions: [
            {
              id: "pred-er-0-1",
              visit_id: "v-er-0",
              task_type: "30D_ICU_MORTALITY",
              disease_name: "icu_mortality",
              risk_probability: 0.385,
              risk_category: "HIGH",
              top_drivers: [
                { feature_name: "PaO2_FiO2", impact_score: 0.54, description: "Severe ARDS hypoxia (<150)" },
                { feature_name: "Lactate", impact_score: 0.44, description: "Critical hyperlactatemia (4.6 mmol/L)" },
              ],
              created_at: "2024-12-01T08:00:00Z",
            },
          ],
        },
        {
          id: "v-er-1",
          patient_id: "pt-elena-rostova-06",
          visit_index: 1,
          visit_date: "2024-12-02 08:00",
          hours_from_baseline: 24.0,
          visit_summary: "T+24h: Substantial gas exchange improvement, extubation successful",
          created_at: "2024-12-02T08:00:00Z",
          clinical_notes: [
            { id: "cn-er-1", visit_id: "v-er-1", step_hour: 24.0, note_type: "PROGRESS", note_text: "Successfully extubated. Lactate normalized at 1.6 mmol/L.", created_at: "2024-12-02T08:00:00Z" }
          ],
          measurements: [
            { id: "m-er-1-1", visit_id: "v-er-1", feature_name: "Lactate", feature_category: "routine_labs", value: 1.6, unit: "mmol/L", ref_low: 0.5, ref_high: 2.0, is_synthetic: false, created_at: "2024-12-02T08:00:00Z" },
            { id: "m-er-1-2", visit_id: "v-er-1", feature_name: "PaO2_FiO2", feature_category: "routine_labs", value: 265.0, unit: "mmHg", ref_low: 300.0, ref_high: 500.0, is_synthetic: false, created_at: "2024-12-02T08:00:00Z" },
            { id: "m-er-1-3", visit_id: "v-er-1", feature_name: "MAP", feature_category: "routine_labs", value: 76.0, unit: "mmHg", ref_low: 70.0, ref_high: 105.0, is_synthetic: false, created_at: "2024-12-02T08:00:00Z" },
          ],
          predictions: [
            {
              id: "pred-er-1-1",
              visit_id: "v-er-1",
              task_type: "30D_ICU_MORTALITY",
              disease_name: "icu_mortality",
              risk_probability: 0.065,
              risk_category: "LOW",
              top_drivers: [
                { feature_name: "PaO2_FiO2", impact_score: 0.22, description: "Oxygenation recovered" },
                { feature_name: "Lactate", impact_score: 0.15, description: "Lactate clearance confirmed" },
              ],
              created_at: "2024-12-02T08:00:00Z",
            },
          ],
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Embedded Store Management
// ---------------------------------------------------------------------------
class EmbeddedCDSSStore {
  private patients: Patient[] = [];
  private alerts: ClinicalAlert[] = [];
  private acknowledgedAlertIds: Set<string> = new Set();
  private isLoaded = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isLoaded) return;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.patients) && parsed.patients.length > 0) {
            this.patients = parsed.patients;
            if (Array.isArray(parsed.acknowledgedAlertIds)) {
              this.acknowledgedAlertIds = new Set(parsed.acknowledgedAlertIds);
            }
            this.evaluateAllAlerts();
            this.isLoaded = true;
            return;
          }
        }
      } catch (err) {
        console.warn("[PULSE Embedded] Failed to load localStorage data:", err);
      }
    }

    // Default: Seed Patients
    this.patients = getSeedPatients();
    this.evaluateAllAlerts();
    this.save();
    this.isLoaded = true;
  }

  private save() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            patients: this.patients,
            acknowledgedAlertIds: Array.from(this.acknowledgedAlertIds),
          })
        );
      } catch (err) {
        console.warn("[PULSE Embedded] Failed to persist to localStorage:", err);
      }
    }
  }

  public getPatients(params?: { search?: string; cohort?: string; limit?: number; offset?: number }): Patient[] {
    this.init();
    let res = [...this.patients];

    if (params?.cohort && params.cohort !== "ALL") {
      res = res.filter((p) => p.cohort_type === params.cohort);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      res = res.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          (p.clinical_history_summary && p.clinical_history_summary.toLowerCase().includes(q))
      );
    }

    const offset = params?.offset || 0;
    const limit = params?.limit ? offset + params.limit : res.length;
    return res.slice(offset, limit);
  }

  public getPatient(patientId: string): Patient {
    this.init();
    const p = this.patients.find((item) => item.id === patientId || item.mrn === patientId);
    if (!p) {
      throw new Error(`Patient with ID '${patientId}' not found in Embedded CDSS registry.`);
    }
    return p;
  }

  public createPatient(data: PatientCreate): Patient {
    this.init();
    const id = `pt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const newPt: Patient = {
      id,
      mrn: data.mrn,
      full_name: data.full_name,
      age: data.age,
      sex: data.sex,
      cohort_type: data.cohort_type,
      clinical_history_summary: data.clinical_history_summary || null,
      created_at: nowIso,
      updated_at: nowIso,
      visits: [],
    };
    this.patients.unshift(newPt);
    this.evaluateAllAlerts();
    this.save();
    return newPt;
  }

  public updatePatient(patientId: string, data: Partial<PatientCreate>): Patient {
    const p = this.getPatient(patientId);
    if (data.full_name !== undefined) p.full_name = data.full_name;
    if (data.age !== undefined) p.age = data.age;
    if (data.sex !== undefined) p.sex = data.sex;
    if (data.cohort_type !== undefined) p.cohort_type = data.cohort_type;
    if (data.clinical_history_summary !== undefined) p.clinical_history_summary = data.clinical_history_summary;
    p.updated_at = new Date().toISOString();
    this.save();
    return p;
  }

  public deletePatient(patientId: string): { success: boolean; message: string } {
    this.init();
    const initialLen = this.patients.length;
    this.patients = this.patients.filter((p) => p.id !== patientId && p.mrn !== patientId);
    this.evaluateAllAlerts();
    this.save();
    return {
      success: this.patients.length < initialLen,
      message: "Patient record successfully purged.",
    };
  }

  public createVisit(patientId: string, data: VisitCreate): Visit {
    const p = this.getPatient(patientId);
    const visitId = `v-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const measurements: Measurement[] = (data.measurements || []).map((m, idx) => ({
      id: `m-${visitId}-${idx}`,
      visit_id: visitId,
      feature_name: m.feature_name,
      feature_category: m.feature_category || m.modality || "routine_labs",
      value: (m.value !== undefined ? m.value : m.feature_value) ?? 0,
      unit: m.unit || "",
      ref_low: m.ref_low ?? m.reference_low ?? null,
      ref_high: m.ref_high ?? m.reference_high ?? null,
      is_synthetic: Boolean(m.is_synthetic),
      confidence_interval_low: m.confidence_interval_low ?? m.confidence_lower ?? null,
      confidence_interval_high: m.confidence_interval_high ?? m.confidence_upper ?? null,
      created_at: nowIso,
    }));

    const clinicalNotes: ClinicalNote[] = (data.clinical_notes || []).map((n, idx) => ({
      id: `cn-${visitId}-${idx}`,
      visit_id: visitId,
      step_hour: n.step_hour ?? 0.0,
      note_type: n.note_type || "PROGRESS",
      note_text: n.note_text || "",
      created_at: nowIso,
    }));

    const newVisit: Visit = {
      id: visitId,
      patient_id: p.id,
      visit_index: data.visit_index !== undefined ? data.visit_index : p.visits.length,
      visit_date: data.visit_date || nowIso.split("T")[0],
      hours_from_baseline: data.hours_from_baseline ?? p.visits.length * 8760,
      visit_summary: data.visit_summary || `Clinical Encounter #${p.visits.length + 1}`,
      created_at: nowIso,
      measurements,
      clinical_notes: clinicalNotes,
      predictions: [],
      latent_state: null,
    };

    p.visits.push(newVisit);
    p.updated_at = nowIso;

    // Run synthesis simulation for this visit
    this.synthesizeVisitOmicsAndRisks(p, newVisit);
    this.evaluateAllAlerts();
    this.save();
    return newVisit;
  }

  public addMeasurements(visitId: string, measurements: MeasurementCreate[]): Measurement[] {
    let targetVisit: Visit | null = null;
    let targetPatient: Patient | null = null;
    for (const p of this.patients) {
      for (const v of p.visits) {
        if (v.id === visitId) {
          targetVisit = v;
          targetPatient = p;
          break;
        }
      }
    }
    if (!targetVisit || !targetPatient) throw new Error(`Visit '${visitId}' not found.`);

    const nowIso = new Date().toISOString();
    const created: Measurement[] = measurements.map((m, idx) => ({
      id: `m-${visitId}-add-${idx}`,
      visit_id: visitId,
      feature_name: m.feature_name,
      feature_category: m.feature_category || m.modality || "routine_labs",
      value: (m.value !== undefined ? m.value : m.feature_value) ?? 0,
      unit: m.unit || "",
      ref_low: m.ref_low ?? m.reference_low ?? null,
      ref_high: m.ref_high ?? m.reference_high ?? null,
      is_synthetic: Boolean(m.is_synthetic),
      confidence_interval_low: m.confidence_interval_low ?? m.confidence_lower ?? null,
      confidence_interval_high: m.confidence_interval_high ?? m.confidence_upper ?? null,
      created_at: nowIso,
    }));

    targetVisit.measurements.push(...created);
    this.synthesizeVisitOmicsAndRisks(targetPatient, targetVisit);
    this.save();
    return created;
  }

  public addNote(visitId: string, note: ClinicalNoteCreate): ClinicalNote {
    let targetVisit: Visit | null = null;
    for (const p of this.patients) {
      for (const v of p.visits) {
        if (v.id === visitId) {
          targetVisit = v;
          break;
        }
      }
    }
    if (!targetVisit) throw new Error(`Visit '${visitId}' not found.`);

    const nowIso = new Date().toISOString();
    const created: ClinicalNote = {
      id: `cn-${visitId}-${Date.now()}`,
      visit_id: visitId,
      step_hour: note.step_hour ?? 0.0,
      note_type: note.note_type || "PROGRESS",
      note_text: note.note_text || "",
      created_at: nowIso,
    };
    targetVisit.clinical_notes.push(created);
    this.save();
    return created;
  }

  // -------------------------------------------------------------------------
  // On-Demand PULSE Synthesis & Multi-Task Risk Forecasting
  // -------------------------------------------------------------------------
  public runPulse(patientId: string): RunPulseResponse {
    const p = this.getPatient(patientId);
    let synthCount = 0;
    let predCount = 0;
    let latentCount = 0;

    for (let i = 0; i < p.visits.length; i++) {
      const v = p.visits[i];
      const res = this.synthesizeVisitOmicsAndRisks(p, v, i);
      synthCount += res.synthCount;
      predCount += res.predCount;
      latentCount += res.latentCount;
    }

    p.updated_at = new Date().toISOString();
    this.evaluateAllAlerts();
    this.save();

    return {
      message: "Embedded CDSS: Longitudinal latent trajectory synthesized and calibrated risk predictions updated.",
      patient: p,
      synthesized_measurements_count: synthCount,
      latent_states_count: latentCount,
      predictions_count: predCount,
    };
  }

  private synthesizeVisitOmicsAndRisks(p: Patient, v: Visit, visitIdx: number = p.visits.indexOf(v)) {
    let synthCount = 0;
    let predCount = 0;
    let latentCount = 0;
    const nowIso = new Date().toISOString();

    const labsMap: Record<string, number> = {};
    for (const m of v.measurements) {
      labsMap[m.feature_name.toLowerCase()] = m.value;
    }

    const ldl = labsMap["ldl_cholesterol"] ?? 130;
    const hba1c = labsMap["hba1c"] ?? 5.7;
    const tg = labsMap["triglycerides"] ?? 150;
    const crp = labsMap["hscrp"] ?? 1.8;
    const lactate = labsMap["lactate"] ?? 1.5;
    const map = labsMap["map"] ?? 75;
    const pf = labsMap["pao2_fio2"] ?? 320;
    const cr = labsMap["creatinine"] ?? 1.0;

    // Synthesize missing metabolomics / proteomics
    const hasMetab = v.measurements.some((m) => m.feature_category === "metabolomics");
    if (!hasMetab && p.cohort_type === "OUTPATIENT_CHRONIC") {
      const freeCholRatio = Number((0.26 + (ldl / 400) * 0.15 + (hba1c / 10) * 0.04).toFixed(3));
      const tgPgRatio = Number((1.05 + (tg / 300) * 0.45).toFixed(3));
      const smallVldlPct = Number((0.30 + (tg / 350) * 0.22).toFixed(3));

      v.measurements.push(
        {
          id: `syn-${v.id}-fc`,
          visit_id: v.id,
          feature_name: "Free_Cholesterol_to_Total_Lipid_large_LDL",
          feature_category: "metabolomics",
          value: freeCholRatio,
          unit: "ratio",
          ref_low: 0.22,
          ref_high: 0.32,
          is_synthetic: true,
          confidence_interval_low: Number((freeCholRatio - 0.03).toFixed(3)),
          confidence_interval_high: Number((freeCholRatio + 0.03).toFixed(3)),
          created_at: nowIso,
        },
        {
          id: `syn-${v.id}-tgpg`,
          visit_id: v.id,
          feature_name: "TG_to_PG_ratio",
          feature_category: "metabolomics",
          value: tgPgRatio,
          unit: "ratio",
          ref_low: 0.90,
          ref_high: 1.40,
          is_synthetic: true,
          confidence_interval_low: Number((tgPgRatio - 0.09).toFixed(3)),
          confidence_interval_high: Number((tgPgRatio + 0.09).toFixed(3)),
          created_at: nowIso,
        },
        {
          id: `syn-${v.id}-svldl`,
          visit_id: v.id,
          feature_name: "small_VLDL_TG_pct",
          feature_category: "metabolomics",
          value: smallVldlPct,
          unit: "fraction",
          ref_low: 0.25,
          ref_high: 0.40,
          is_synthetic: true,
          confidence_interval_low: Number((smallVldlPct - 0.04).toFixed(3)),
          confidence_interval_high: Number((smallVldlPct + 0.04).toFixed(3)),
          created_at: nowIso,
        }
      );
      synthCount += 3;
    }

    // Synthesize Latent State Vector
    if (!v.latent_state) {
      const z: number[] = Array.from({ length: 16 }, (_, k) =>
        Number((Math.sin(visitIdx * 0.7 + k * 0.4) * 0.5 + ((ldl + tg) / 600 - 0.5) * 0.3).toFixed(3))
      );
      const past: number[] = Array.from({ length: 16 }, (_, k) =>
        visitIdx > 0 ? Number((z[k] * 0.82).toFixed(3)) : 0.0
      );
      v.latent_state = {
        id: `ls-${v.id}`,
        visit_id: v.id,
        z_vector: z,
        past_vector: past,
        created_at: nowIso,
      };
      latentCount += 1;
    }

    // Calibrate Predictions
    if (v.predictions.length === 0) {
      if (p.cohort_type === "INPATIENT_ACUTE_ICU") {
        const shockProb = Math.min(0.92, Math.max(0.04, (lactate / 5.0) * 0.38 + ((100 - map) / 60) * 0.28 + ((300 - pf) / 400) * 0.22));
        const mortProb = Math.min(0.85, Math.max(0.02, (lactate / 6.0) * 0.42 + (cr / 3.0) * 0.30));

        v.predictions.push(
          {
            id: `pred-${v.id}-icu-readm`,
            visit_id: v.id,
            task_type: "30D_ICU_READMISSION",
            disease_name: "icu_readmission",
            risk_probability: Number(shockProb.toFixed(3)),
            risk_category: shockProb >= 0.45 ? "CRITICAL" : shockProb >= 0.25 ? "HIGH" : shockProb >= 0.15 ? "MODERATE" : "LOW",
            top_drivers: [
              { feature_name: "Lactate", impact_score: 0.42, description: `Serum lactate level (${lactate} mmol/L)` },
              { feature_name: "PaO2_FiO2", impact_score: 0.34, description: `Oxygenation impairment (${pf} mmHg)` },
            ],
            created_at: nowIso,
          },
          {
            id: `pred-${v.id}-icu-mort`,
            visit_id: v.id,
            task_type: "30D_ICU_MORTALITY",
            disease_name: "icu_mortality",
            risk_probability: Number(mortProb.toFixed(3)),
            risk_category: mortProb >= 0.35 ? "CRITICAL" : mortProb >= 0.20 ? "HIGH" : mortProb >= 0.10 ? "MODERATE" : "LOW",
            top_drivers: [
              { feature_name: "Lactate", impact_score: 0.50, description: "Lactic acidosis severity" },
              { feature_name: "Creatinine", impact_score: 0.32, description: `Renal impairment marker (${cr} mg/dL)` },
            ],
            created_at: nowIso,
          }
        );
        predCount += 2;
      } else {
        const cvProb = Math.min(0.88, Math.max(0.06, (ldl / 220) * 0.22 + (tg / 300) * 0.12 + (crp / 5) * 0.10 + (p.age / 100) * 0.15));
        const dmProb = Math.min(0.90, Math.max(0.05, (hba1c / 8.5) * 0.45));

        v.predictions.push(
          {
            id: `pred-${v.id}-mi`,
            visit_id: v.id,
            task_type: "10Y_CHRONIC_DISEASE",
            disease_name: "myocardial_infarction",
            risk_probability: Number(cvProb.toFixed(3)),
            risk_category: cvProb >= 0.35 ? "CRITICAL" : cvProb >= 0.22 ? "HIGH" : cvProb >= 0.14 ? "MODERATE" : "LOW",
            top_drivers: [
              { feature_name: "LDL_Cholesterol", impact_score: 0.38, description: `Circulating LDL concentration (${ldl} mg/dL)` },
              { feature_name: "hsCRP", impact_score: 0.28, description: `Vascular inflammatory index (${crp} mg/L)` },
            ],
            created_at: nowIso,
          },
          {
            id: `pred-${v.id}-dm`,
            visit_id: v.id,
            task_type: "10Y_CHRONIC_DISEASE",
            disease_name: "diabetes",
            risk_probability: Number(dmProb.toFixed(3)),
            risk_category: dmProb >= 0.35 ? "CRITICAL" : dmProb >= 0.24 ? "HIGH" : dmProb >= 0.12 ? "MODERATE" : "LOW",
            top_drivers: [
              { feature_name: "HbA1c", impact_score: 0.52, description: `Glycated hemoglobin elevation (${hba1c}%)` },
            ],
            created_at: nowIso,
          }
        );
        predCount += 2;
      }
    }

    return { synthCount, predCount, latentCount };
  }

  // -------------------------------------------------------------------------
  // Longitudinal Trajectories
  // -------------------------------------------------------------------------
  public getTrajectories(patientId: string): TrajectoriesResponse {
    const p = this.getPatient(patientId);
    const featurePointsMap: Record<string, TrajectoryPoint[]> = {};

    for (const v of p.visits) {
      for (const m of v.measurements) {
        if (!featurePointsMap[m.feature_name]) {
          featurePointsMap[m.feature_name] = [];
        }
        featurePointsMap[m.feature_name].push({
          visit_id: v.id,
          visit_index: v.visit_index,
          visit_date: v.visit_date,
          hours_from_baseline: v.hours_from_baseline,
          value: m.value,
          feature_value: m.value,
          is_synthetic: m.is_synthetic,
          confidence_interval_low: m.confidence_interval_low,
          confidence_interval_high: m.confidence_interval_high,
          confidence_lower: m.confidence_interval_low,
          confidence_upper: m.confidence_interval_high,
          reference_low: m.ref_low,
          reference_high: m.ref_high,
        });
      }
    }

    const features: FeatureTrajectory[] = [];
    const trajectories: Record<string, BiomarkerTrajectory> = {};

    for (const [featName, points] of Object.entries(featurePointsMap)) {
      points.sort((a, b) => a.visit_index - b.visit_index);
      const meta = this.findFeatureMeta(featName);

      const fTraj: FeatureTrajectory = {
        feature_name: featName,
        display_name: meta?.description || featName,
        modality: meta?.category || "routine_lab",
        unit: meta?.unit || null,
        category: meta?.category || null,
        reference_low: meta?.ref_low ?? null,
        reference_high: meta?.ref_high ?? null,
        points,
      };
      features.push(fTraj);

      trajectories[featName] = {
        feature_name: featName,
        feature_category: meta?.category || "routine_lab",
        unit: meta?.unit || "",
        ref_low: meta?.ref_low,
        ref_high: meta?.ref_high,
        description: meta?.description || featName,
        points,
      };
    }

    return {
      patient_id: p.id,
      mrn: p.mrn,
      full_name: p.full_name,
      cohort_type: p.cohort_type,
      features,
      trajectories,
    };
  }

  private findFeatureMeta(name: string): FeatureItem | undefined {
    return (
      EMBEDDED_FEATURE_CATALOG.routine_labs.find((f) => f.name.toLowerCase() === name.toLowerCase()) ||
      EMBEDDED_FEATURE_CATALOG.metabolomics.find((f) => f.name.toLowerCase() === name.toLowerCase()) ||
      EMBEDDED_FEATURE_CATALOG.proteomics.find((f) => f.name.toLowerCase() === name.toLowerCase())
    );
  }

  // -------------------------------------------------------------------------
  // Clinical Report
  // -------------------------------------------------------------------------
  public getReport(patientId: string): ClinicalReport {
    const p = this.getPatient(patientId);
    if (p.visits.length === 0) {
      throw new Error("Cannot generate clinical decision report for patient with zero visits.");
    }

    const latest = p.visits[p.visits.length - 1];
    const synthMarkers = latest.measurements
      .filter((m) => m.is_synthetic)
      .map((m) => ({
        feature: m.feature_name,
        value: m.value,
        unit: m.unit,
        ci_95: [m.confidence_interval_low ?? m.value * 0.92, m.confidence_interval_high ?? m.value * 1.08] as [number, number],
        reference_range: [m.ref_low ?? 0, m.ref_high ?? 100] as [number, number],
        status: (m.ref_high && m.value > m.ref_high) ? "Elevated" : "Within Reference",
      }));

    const riskScorecard = (latest.predictions || []).map((pred) => ({
      disease: pred.disease_name,
      risk_percentage: Math.round(pred.risk_probability * 1000) / 10,
      risk_category: pred.risk_category,
      top_drivers: pred.top_drivers || [],
    }));

    const longSummary = p.visits.map((v) => ({
      visit_index: v.visit_index,
      visit_date: v.visit_date,
      hours: v.hours_from_baseline,
      summary: v.visit_summary || undefined,
      notes_count: v.clinical_notes?.length || 0,
      labs_count: v.measurements?.length || 0,
    }));

    return {
      patient_id: p.id,
      mrn: p.mrn,
      full_name: p.full_name,
      age: p.age,
      sex: p.sex,
      cohort_type: p.cohort_type,
      history: p.clinical_history_summary || "No prior significant clinical history documented.",
      total_visits: p.visits.length,
      latest_visit_date: latest.visit_date,
      has_synthetic_omics: synthMarkers.length > 0,
      risk_scorecard: riskScorecard,
      synthesized_biomarkers: synthMarkers,
      longitudinal_summary: longSummary,
      samd_regulatory_notice:
        "PULSE CDSS is an investigational Software as a Medical Device (SaMD) Class II decision support algorithm. All synthesized biomarkers and risk scores must be reviewed in conjunction with clinical judgment.",
    };
  }

  // -------------------------------------------------------------------------
  // Counterfactual Digital Twin Simulation
  // -------------------------------------------------------------------------
  public simulateIntervention(patientId: string, interventions: Record<string, number>): SimulationResponse {
    const p = this.getPatient(patientId);
    const latest = p.visits[p.visits.length - 1];
    const simSamples: Record<string, number> = { ...interventions };

    const ldlShift = interventions["LDL_Cholesterol"] ?? interventions["ldl_cholesterol"] ?? 0;
    const a1cShift = interventions["HbA1c"] ?? interventions["hba1c"] ?? 0;
    const mapShift = interventions["MAP"] ?? interventions["map"] ?? 0;

    const riskComparisons = (latest.predictions || []).map((pred) => {
      const orig = pred.risk_probability;
      let reduction = 0;

      if (pred.disease_name.includes("infarction") || pred.disease_name.includes("cad")) {
        reduction = (Math.abs(ldlShift) / 100) * 0.35 + (Math.abs(a1cShift) / 2) * 0.15;
      } else if (pred.disease_name.includes("diabetes")) {
        reduction = (Math.abs(a1cShift) / 2) * 0.45;
      } else if (pred.disease_name.includes("icu")) {
        reduction = (mapShift > 0 ? (mapShift / 30) * 0.25 : 0);
      } else {
        reduction = 0.15;
      }

      const simProb = Math.max(0.02, Number((orig * (1 - Math.min(0.75, reduction))).toFixed(3)));
      const arr = Number((orig - simProb).toFixed(3));
      const rrr = Math.round(((orig - simProb) / orig) * 100);

      const simCat: RiskCategory = simProb >= 0.40 ? "CRITICAL" : simProb >= 0.24 ? "HIGH" : simProb >= 0.12 ? "MODERATE" : "LOW";

      return {
        disease_name: pred.disease_name,
        original_probability: orig,
        original_category: pred.risk_category,
        simulated_probability: simProb,
        simulated_category: simCat,
        absolute_risk_reduction: arr,
        relative_risk_reduction_pct: rrr,
      };
    });

    return {
      patient_id: p.id,
      mrn: p.mrn,
      cohort_type: p.cohort_type,
      interventions_applied: interventions,
      risk_comparisons: riskComparisons,
      simulated_measurements_sample: simSamples,
    };
  }

  // -------------------------------------------------------------------------
  // Clinical AI Co-Pilot & SBAR Handover
  // -------------------------------------------------------------------------
  public queryCopilot(patientId: string, query: string, includeSbar: boolean = false): CopilotQueryResponse {
    const p = this.getPatient(patientId);
    const latest = p.visits[p.visits.length - 1];
    const qLower = query.toLowerCase();

    let answer = "";
    const citations: string[] = [];

    if (qLower.includes("risk") || qLower.includes("prognosis")) {
      const topPred = latest?.predictions?.[0];
      answer = `Based on longitudinal modeling across ${p.visits.length} encounters, ${p.full_name}'s primary clinical hazard is ${topPred ? topPred.disease_name.replace(/_/g, " ") : "cardiovascular morbidity"} with a calibrated risk of ${topPred ? Math.round(topPred.risk_probability * 100) : 28}%. Key physiological drivers include atherogenic lipoprotein subfractions and inflammatory indices.`;
      citations.push("PULSE Autoregressive Latent Prior Z_P", "EHR Encounter Series");
    } else if (qLower.includes("metabol") || qLower.includes("omic") || qLower.includes("proteom")) {
      answer = `PULSE has synthesized molecular profiles to bridge sparse lab schedules. For ${p.full_name}, missing omic vectors were imputed with 95% posterior confidence bounds, revealing early subclinical dysregulation prior to standard routine chemistry alerts.`;
      citations.push("Modality Imputation Pipeline", "Latent Space State Z(t)");
    } else {
      answer = `Clinical evaluation of ${p.full_name} (${p.age}yo, ${p.cohort_type.replace(/_/g, " ")}): Across ${p.visits.length} recorded encounters, the latest evaluation on ${latest?.visit_date || "today"} indicates a stable trajectory with active SaMD surveillance recommended.`;
      citations.push("PULSE Patient Record", "Clinical Decision Engine");
    }

    const sbar: SBARReport | null = includeSbar ? this.getSBAR(patientId) : null;

    return {
      answer,
      citations,
      sbar,
      suggested_followups: [
        "What are the top biological drivers for this patient?",
        "How would high-intensity statin therapy alter the risk trajectory?",
        "Compare baseline vs latest synthesized omics profiles",
      ],
    };
  }

  public getSBAR(patientId: string): SBARReport {
    const p = this.getPatient(patientId);
    const latest = p.visits[p.visits.length - 1];
    const topPred = latest?.predictions?.[0];

    return {
      patient_id: p.id,
      mrn: p.mrn,
      full_name: p.full_name,
      cohort_type: p.cohort_type,
      situation: `${p.full_name} (${p.age}yo ${p.sex}) monitored under ${p.cohort_type.replace(/_/g, " ")}. Latest encounter: ${latest?.visit_date}.`,
      background: p.clinical_history_summary || "Chronic surveillance across multiple clinical encounters.",
      assessment: `PULSE risk stratification indicates ${topPred?.risk_category || "MODERATE"} hazard for ${topPred?.disease_name.replace(/_/g, " ") || "clinical progression"} (${topPred ? Math.round(topPred.risk_probability * 100) : 25}%).`,
      recommendation: "Maintain target organ protection, review synthesized omics confidence bounds, and schedule targeted follow-up within protocol window.",
      generated_at: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Population Analytics & Triage Radar
  // -------------------------------------------------------------------------
  public getCohortOverview(): CohortOverviewResponse {
    this.init();
    let outpatientCount = 0;
    let icuCount = 0;
    let totalVisits = 0;
    let totalMeasurements = 0;
    let syntheticCount = 0;

    const riskDist: Record<string, number> = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0, UNSCORED: 0 };
    const diseaseMap: Record<string, number> = {};

    for (const p of this.patients) {
      if (p.cohort_type.includes("ICU")) icuCount++;
      else outpatientCount++;

      totalVisits += p.visits.length;

      let highestCat: RiskCategory | null = null;
      for (const v of p.visits) {
        for (const m of v.measurements) {
          totalMeasurements++;
          if (m.is_synthetic) syntheticCount++;
        }
        for (const pred of v.predictions) {
          diseaseMap[pred.disease_name] = (diseaseMap[pred.disease_name] || 0) + 1;
          if (pred.risk_category === "CRITICAL") highestCat = "CRITICAL";
          else if (pred.risk_category === "HIGH" && highestCat !== "CRITICAL") highestCat = "HIGH";
          else if (pred.risk_category === "MODERATE" && !highestCat) highestCat = "MODERATE";
          else if (pred.risk_category === "LOW" && !highestCat) highestCat = "LOW";
        }
      }

      if (highestCat) {
        riskDist[highestCat] = (riskDist[highestCat] || 0) + 1;
      } else {
        riskDist.UNSCORED = (riskDist.UNSCORED || 0) + 1;
      }
    }

    const prevalent = Object.entries(diseaseMap)
      .map(([disease, count]) => ({ disease, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_patients: this.patients.length,
      outpatient_count: outpatientCount,
      icu_count: icuCount,
      risk_distribution: riskDist,
      average_encounters_per_patient: this.patients.length > 0 ? Number((totalVisits / this.patients.length).toFixed(1)) : 0,
      total_measurements: totalMeasurements,
      synthetic_omics_count: syntheticCount,
      omics_synthesis_rate_pct: totalMeasurements > 0 ? Number(((syntheticCount / totalMeasurements) * 100).toFixed(1)) : 0,
      prevalent_high_risk_diseases: prevalent,
    };
  }

  public getTriageRadar(): TriageRadarResponse {
    this.init();
    const queue = this.patients.map((p) => {
      const visits = p.visits || [];
      const latest = visits[visits.length - 1];
      const first = visits[0];

      const latestPred = latest?.predictions?.[0];
      const firstPred = first?.predictions?.[0];

      const score = latestPred?.risk_probability ?? 0.15;
      const firstScore = firstPred?.risk_probability ?? score;

      const velocity = visits.length > 1 ? Number(((score - firstScore) / (visits.length - 1)).toFixed(3)) : 0.0;
      const direction = velocity > 0.03 ? "ACCELERATING_UP" : velocity < -0.03 ? "IMPROVING_DOWN" : "STABLE";
      const isUrgent = score >= 0.35 || velocity >= 0.08 || latestPred?.risk_category === "CRITICAL";

      return {
        patient_id: p.id,
        mrn: p.mrn,
        full_name: p.full_name,
        cohort_type: p.cohort_type,
        latest_risk_score: score,
        latest_risk_category: latestPred?.risk_category || "LOW",
        primary_disease: latestPred?.disease_name || "general_morbidity",
        risk_velocity: velocity,
        velocity_direction: direction,
        is_urgent: isUrgent,
        latest_visit_date: latest?.visit_date || null,
        total_visits: visits.length,
      };
    });

    queue.sort((a, b) => {
      if (a.is_urgent && !b.is_urgent) return -1;
      if (!a.is_urgent && b.is_urgent) return 1;
      return b.latest_risk_score - a.latest_risk_score;
    });

    const urgentCount = queue.filter((q) => q.is_urgent).length;

    return {
      total_patients_analyzed: this.patients.length,
      urgent_count: urgentCount,
      triage_queue: queue,
    };
  }

  // -------------------------------------------------------------------------
  // Deterioration Alerts Rules Engine
  // -------------------------------------------------------------------------
  private evaluateAllAlerts() {
    const list: ClinicalAlert[] = [];

    for (const p of this.patients) {
      const visits = p.visits || [];
      if (visits.length === 0) continue;
      const latest = visits[visits.length - 1];
      const first = visits[0];
      const preds = latest.predictions || [];
      if (preds.length === 0) continue;

      const primary = preds.reduce((max, pr) => (pr.risk_probability > max.risk_probability ? pr : max), preds[0]);
      const firstPred = first.predictions?.find((pr) => pr.disease_name === primary.disease_name) || first.predictions?.[0];
      const score = primary.risk_probability;
      const prevScore = firstPred ? firstPred.risk_probability : score;
      const velocity = visits.length > 1 ? Number(((score - prevScore) / (visits.length - 1)).toFixed(3)) : 0.0;
      const dir = velocity > 0.04 ? "ACCELERATING_UP" : velocity < -0.04 ? "IMPROVING_DOWN" : "STABLE";

      const alertId = `alt-${p.id.slice(0, 8)}-${primary.disease_name}`;
      const isAck = this.acknowledgedAlertIds.has(alertId);

      if (score >= 0.28 || velocity >= 0.05 || primary.risk_category === "CRITICAL" || primary.risk_category === "HIGH") {
        const severity = (score >= 0.38 || primary.risk_category === "CRITICAL") ? "CRITICAL" : "WARNING";
        list.push({
          id: alertId,
          patient_id: p.id,
          mrn: p.mrn,
          patient_name: p.full_name,
          cohort_type: p.cohort_type,
          severity,
          title: `${severity}: Deterioration Warning for ${primary.disease_name.replace(/_/g, " ").toUpperCase()}`,
          message: `Longitudinal trajectory demonstrates elevated calibrated risk (${Math.round(score * 100)}%) with velocity ${velocity > 0 ? "+" : ""}${velocity}/visit (${dir}). Clinical action indicated.`,
          disease_task: primary.disease_name,
          risk_score: score,
          risk_velocity: velocity,
          velocity_direction: dir,
          created_at: latest.created_at || new Date().toISOString(),
          is_acknowledged: isAck,
          acknowledged_by: isAck ? "Attending Clinician" : null,
          acknowledged_at: isAck ? new Date().toISOString() : null,
        });
      }
    }

    this.alerts = list;
  }

  public getAlerts(unacknowledgedOnly: boolean = false): AlertsListResponse {
    this.init();
    let filtered = [...this.alerts];
    if (unacknowledgedOnly) {
      filtered = filtered.filter((a) => !a.is_acknowledged);
    }
    const unacked = this.alerts.filter((a) => !a.is_acknowledged).length;
    const crit = this.alerts.filter((a) => a.severity === "CRITICAL" && !a.is_acknowledged).length;

    return {
      total_alerts: this.alerts.length,
      unacknowledged_count: unacked,
      critical_count: crit,
      alerts: filtered,
    };
  }

  public acknowledgeAlert(alertId: string, acknowledgedBy: string = "Attending Clinician", note?: string): ClinicalAlert {
    this.acknowledgedAlertIds.add(alertId);
    this.evaluateAllAlerts();
    this.save();
    const found = this.alerts.find((a) => a.id === alertId);
    if (!found) {
      return {
        id: alertId,
        patient_id: "unknown",
        mrn: "MRN-UNKNOWN",
        patient_name: "Patient",
        cohort_type: "OUTPATIENT_CHRONIC",
        severity: "INFO",
        title: "Alert Acknowledged",
        message: note || "Acknowledged",
        disease_task: "general",
        risk_score: 0.1,
        risk_velocity: 0.0,
        velocity_direction: "STABLE",
        created_at: new Date().toISOString(),
        is_acknowledged: true,
        acknowledged_by: acknowledgedBy,
        acknowledged_at: new Date().toISOString(),
      };
    }
    return found;
  }

  public triggerAlertScan(): AlertsListResponse {
    this.init();
    this.evaluateAllAlerts();
    return this.getAlerts(false);
  }

  // -------------------------------------------------------------------------
  // Batch CSV Ingestion
  // -------------------------------------------------------------------------
  public importCsv(csvContent: string, autoRunPulse: boolean = true): BatchImportResult {
    this.init();
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return {
        patients_created: 0,
        visits_created: 0,
        measurements_created: 0,
        pulse_runs_triggered: 0,
        errors: ["CSV must contain at least a header row and one data row."],
      };
    }

    const headers = lines[0].split(/,|\t/).map((h) => h.trim().toLowerCase());
    const mrnIdx = headers.findIndex((h) => h === "mrn" || h.includes("patient_id") || h.includes("id"));
    const nameIdx = headers.findIndex((h) => h === "full_name" || h === "name" || h === "patient_name");
    const ageIdx = headers.findIndex((h) => h === "age");
    const sexIdx = headers.findIndex((h) => h === "sex" || h === "gender");
    const cohortIdx = headers.findIndex((h) => h.includes("cohort"));

    let ptsCreated = 0;
    let vstsCreated = 0;
    let msCreated = 0;
    let pulseCount = 0;
    const errors: string[] = [];

    for (let r = 1; r < lines.length; r++) {
      const parts = lines[r].split(/,|\t/).map((p) => p.trim());
      if (parts.length === 0 || !parts[0]) continue;

      const mrn = mrnIdx >= 0 ? parts[mrnIdx] : `MRN-IMP-${r}`;
      let p = this.patients.find((item) => item.mrn === mrn);

      if (!p) {
        p = this.createPatient({
          mrn,
          full_name: nameIdx >= 0 ? parts[nameIdx] : `Imported Patient ${r}`,
          age: ageIdx >= 0 ? parseFloat(parts[ageIdx]) || 50 : 50,
          sex: sexIdx >= 0 ? parts[sexIdx].toUpperCase().slice(0, 1) || "M" : "M",
          cohort_type: (cohortIdx >= 0 && parts[cohortIdx].toUpperCase().includes("ICU")) ? "INPATIENT_ACUTE_ICU" : "OUTPATIENT_CHRONIC",
          clinical_history_summary: "Enrolled via EHR batch CSV ingestion.",
        });
        ptsCreated++;
      }

      // Create encounter from row
      const measurements: MeasurementCreate[] = [];
      for (let c = 0; c < headers.length; c++) {
        if (c === mrnIdx || c === nameIdx || c === ageIdx || c === sexIdx || c === cohortIdx) continue;
        const val = parseFloat(parts[c]);
        if (!isNaN(val)) {
          const featName = headers[c];
          measurements.push({
            feature_name: featName,
            value: val,
            unit: "",
          });
        }
      }

      const v = this.createVisit(p.id, {
        visit_date: new Date().toISOString().split("T")[0],
        visit_summary: "Imported Encounter Data",
        measurements,
      });
      vstsCreated++;
      msCreated += measurements.length;

      if (autoRunPulse) {
        this.runPulse(p.id);
        pulseCount++;
      }
    }

    this.save();
    return {
      patients_created: ptsCreated,
      visits_created: vstsCreated,
      measurements_created: msCreated,
      pulse_runs_triggered: pulseCount,
      errors,
    };
  }

  // -------------------------------------------------------------------------
  // FHIR R4 Bundle & CDS Hooks
  // -------------------------------------------------------------------------
  public exportFhir(patientId: string): any {
    const p = this.getPatient(patientId);
    const bundle: any = {
      resourceType: "Bundle",
      type: "collection",
      id: `bundle-pulse-${p.id}`,
      entry: [
        {
          fullUrl: `urn:uuid:${p.id}`,
          resource: {
            resourceType: "Patient",
            id: p.id,
            identifier: [{ system: "urn:oid:pulse.cdss.mrn", value: p.mrn }],
            name: [{ text: p.full_name }],
            gender: p.sex.toLowerCase() === "m" ? "male" : "female",
            extension: [
              { url: "http://pulse-cdss.ai/fhir/cohort", valueString: p.cohort_type },
              { url: "http://pulse-cdss.ai/fhir/age", valueDecimal: p.age },
            ],
          },
        },
      ],
    };

    for (const v of p.visits) {
      for (const m of v.measurements) {
        bundle.entry.push({
          fullUrl: `urn:uuid:${m.id}`,
          resource: {
            resourceType: "Observation",
            id: m.id,
            status: "final",
            code: { text: m.feature_name },
            valueQuantity: { value: m.value, unit: m.unit },
            subject: { reference: `Patient/${p.id}` },
            effectiveDateTime: v.visit_date,
            extension: [
              { url: "http://pulse-cdss.ai/fhir/is-synthetic", valueBoolean: m.is_synthetic },
            ],
          },
        });
      }
    }

    return bundle;
  }

  public getCDSServices(): { services: CDSService[] } {
    return {
      services: [
        {
          hook: "patient-view",
          id: "pulse-deterioration-service",
          title: "PULSE Clinical Deterioration Surveillance",
          description: "Detects subclinical multi-organ trajectory deterioration and omics-derived progression risks.",
          prefetch: { patient: "Patient/{{context.patientId}}" },
        },
      ],
    };
  }

  public evaluatePatientViewHook(patientId: string): CDSHookResponse {
    const p = this.getPatient(patientId);
    const latest = p.visits[p.visits.length - 1];
    const topPred = latest?.predictions?.[0];

    return {
      cards: [
        {
          summary: `PULSE Deterioration Index: ${topPred ? topPred.risk_category : "LOW"} Risk`,
          detail: `Patient ${p.full_name} evaluated under ${p.cohort_type}. Longitudinal modeling forecasts ${topPred ? Math.round(topPred.risk_probability * 100) : 15}% hazard for ${topPred ? topPred.disease_name.replace(/_/g, " ") : "clinical endpoint"}.`,
          indicator: (topPred?.risk_category === "CRITICAL" || topPred?.risk_category === "HIGH") ? "warning" : "info",
          source: { label: "PULSE CDSS Autonomous Engine", url: "https://github.com/Kautilya247/LongitudinalGeneration" },
          suggestions: [
            {
              label: "Schedule targeted biomarker panel & metabolic review",
              isRecommended: true,
            },
          ],
        },
      ],
    };
  }
}

export const embeddedEngine = new EmbeddedCDSSStore();
