/**
 * TypeScript definitions for PULSE Clinical Decision Support System.
 * Matches backend Pydantic schemas in server/schemas/.
 */

export type CohortType = "OUTPATIENT_CHRONIC" | "INPATIENT_ACUTE_ICU";

export type TaskType =
  | "10Y_CHRONIC_DISEASE"
  | "30D_ICU_READMISSION"
  | "30D_ICU_MORTALITY";

export type RiskCategory = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface FeatureItem {
  name: string;
  category: "routine_lab" | "metabolomics" | "proteomics";
  unit: string;
  ref_low: number;
  ref_high: number;
  description: string;
}

export interface FeatureCatalog {
  routine_labs: FeatureItem[];
  metabolomics: FeatureItem[];
  proteomics: FeatureItem[];
  total_count: number;
}

export interface TopDriver {
  feature_name: string;
  impact_score: number;
  description: string;
}

export interface RiskPrediction {
  id: string;
  visit_id: string;
  task_type: TaskType;
  disease_name: string;
  risk_probability: number;
  risk_category: RiskCategory;
  top_drivers: TopDriver[];
  created_at: string;
}

export interface Measurement {
  id: string;
  visit_id: string;
  feature_name: string;
  feature_category: string;
  value: number;
  unit: string;
  ref_low?: number | null;
  ref_high?: number | null;
  is_synthetic: boolean;
  confidence_interval_low?: number | null;
  confidence_interval_high?: number | null;
  created_at: string;
}

export interface MeasurementCreate {
  feature_name: string;
  feature_category: string;
  value: number;
  unit: string;
  ref_low?: number | null;
  ref_high?: number | null;
  is_synthetic?: boolean;
  confidence_interval_low?: number | null;
  confidence_interval_high?: number | null;
}

export interface ClinicalNote {
  id: string;
  visit_id: string;
  step_hour: number;
  note_type: string;
  note_text: string;
  created_at: string;
}

export interface ClinicalNoteCreate {
  step_hour?: number;
  note_type?: string;
  note_text: string;
}

export interface LatentState {
  id: string;
  visit_id: string;
  z_vector: number[];
  past_vector?: number[] | null;
  created_at: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  visit_index: number;
  visit_date: string;
  hours_from_baseline: number;
  visit_summary?: string | null;
  created_at: string;
  measurements: Measurement[];
  clinical_notes: ClinicalNote[];
  latent_state?: LatentState | null;
  predictions: RiskPrediction[];
}

export interface VisitCreate {
  visit_index?: number;
  visit_date: string;
  hours_from_baseline?: number;
  visit_summary?: string | null;
  measurements?: MeasurementCreate[];
  clinical_notes?: ClinicalNoteCreate[];
}

export interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  age: number;
  sex: string;
  cohort_type: CohortType;
  clinical_history_summary?: string | null;
  created_at: string;
  updated_at: string;
  visits: Visit[];
}

export interface PatientCreate {
  mrn: string;
  full_name: string;
  age: number;
  sex: string;
  cohort_type: CohortType;
  clinical_history_summary?: string;
}

export interface RunPulseResponse {
  message: string;
  patient: Patient;
  synthesized_measurements_count: number;
  latent_states_count: number;
  predictions_count: number;
}

export interface TrajectoryPoint {
  visit_id: string;
  visit_index: number;
  visit_date: string;
  hours_from_baseline: number;
  value: number;
  is_synthetic: boolean;
  confidence_interval_low?: number | null;
  confidence_interval_high?: number | null;
}

export interface BiomarkerTrajectory {
  feature_name: string;
  feature_category: string;
  unit: string;
  ref_low?: number | null;
  ref_high?: number | null;
  description: string;
  points: TrajectoryPoint[];
}

export interface TrajectoriesResponse {
  patient_id: string;
  mrn: string;
  full_name: string;
  cohort_type: CohortType;
  trajectories: Record<string, BiomarkerTrajectory>;
}

export interface ClinicalReport {
  patient_id: string;
  mrn: string;
  full_name: string;
  age: number;
  sex: string;
  cohort_type: CohortType;
  history: string;
  total_visits: number;
  latest_visit_date: string;
  has_synthetic_omics: boolean;
  risk_scorecard: Array<{
    disease: string;
    risk_percentage: number;
    risk_category: RiskCategory;
    top_drivers: TopDriver[];
  }>;
  synthesized_biomarkers: Array<{
    feature: string;
    value: number;
    unit: string;
    ci_95: [number, number];
    reference_range: [number, number];
    status: string;
  }>;
  longitudinal_summary: Array<{
    visit_index: number;
    visit_date: string;
    hours: number;
    summary?: string;
    notes_count: number;
    labs_count: number;
  }>;
  samd_regulatory_notice: string;
}
