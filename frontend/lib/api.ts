/**
 * API client for interacting with the PULSE FastAPI backend.
 */
import {
  FeatureCatalog,
  Patient,
  PatientCreate,
  VisitCreate,
  Visit,
  MeasurementCreate,
  Measurement,
  ClinicalNoteCreate,
  ClinicalNote,
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
} from "@/types/clinical";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === "string"
          ? errJson.detail
          : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Features catalog
  getFeatures: (): Promise<FeatureCatalog> =>
    request<FeatureCatalog>("/api/features"),

  // Patients
  getPatients: async (params?: { search?: string; cohort?: string; limit?: number; offset?: number }): Promise<Patient[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.cohort) query.set("cohort", params.cohort);
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.offset) query.set("offset", params.offset.toString());
    const qs = query.toString();
    const data = await request<{ items?: Patient[] } | Patient[]>(`/api/patients${qs ? `?${qs}` : ""}`);
    if (Array.isArray(data)) return data;
    return data.items || [];
  },

  getPatient: (patientId: string): Promise<Patient> =>
    request<Patient>(`/api/patients/${patientId}`),

  createPatient: (data: PatientCreate): Promise<Patient> =>
    request<Patient>("/api/patients", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePatient: (patientId: string, data: Partial<PatientCreate>): Promise<Patient> =>
    request<Patient>(`/api/patients/${patientId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePatient: (patientId: string): Promise<{ success: boolean; message: string }> =>
    request<{ success: boolean; message: string }>(`/api/patients/${patientId}`, {
      method: "DELETE",
    }),

  // Visits & Labs
  createVisit: (patientId: string, data: VisitCreate): Promise<Visit> =>
    request<Visit>(`/api/patients/${patientId}/visits`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  addMeasurements: (visitId: string, measurements: MeasurementCreate[]): Promise<Measurement[]> =>
    request<Measurement[]>(`/api/visits/${visitId}/measurements`, {
      method: "POST",
      body: JSON.stringify(measurements),
    }),

  addNote: (visitId: string, note: ClinicalNoteCreate): Promise<ClinicalNote> =>
    request<ClinicalNote>(`/api/visits/${visitId}/notes`, {
      method: "POST",
      body: JSON.stringify(note),
    }),

  // PULSE Engine Synthesis & Forecasting
  runPulse: (patientId: string): Promise<RunPulseResponse> =>
    request<RunPulseResponse>(`/api/patients/${patientId}/run-pulse`, {
      method: "POST",
    }),

  // Trajectories
  getTrajectories: (patientId: string): Promise<TrajectoriesResponse> =>
    request<TrajectoriesResponse>(`/api/patients/${patientId}/trajectories`),

  // Clinical Report
  getReport: (patientId: string): Promise<ClinicalReport> =>
    request<ClinicalReport>(`/api/patients/${patientId}/report`),

  // Exports
  exportFhir: (patientId: string): Promise<any> =>
    request<any>(`/api/patients/${patientId}/export/fhir`),

  getExportCsvUrl: (patientId: string): string =>
    `${API_BASE_URL}/api/patients/${patientId}/export/csv`,

  // Digital Twin Simulation
  simulateIntervention: (
    patientId: string,
    interventions: Record<string, number>
  ): Promise<SimulationResponse> =>
    request<SimulationResponse>(`/api/patients/${patientId}/simulate-intervention`, {
      method: "POST",
      body: JSON.stringify({ interventions }),
    }),

  // Clinical AI Co-Pilot & SBAR Handover
  queryCopilot: (
    patientId: string,
    query: string,
    includeSbar: boolean = false
  ): Promise<CopilotQueryResponse> =>
    request<CopilotQueryResponse>(`/api/patients/${patientId}/copilot`, {
      method: "POST",
      body: JSON.stringify({ query, include_sbar: includeSbar }),
    }),

  getSBAR: (patientId: string): Promise<SBARReport> =>
    request<SBARReport>(`/api/patients/${patientId}/sbar`),

  // Population Health Analytics & Triage Radar
  getCohortOverview: (): Promise<CohortOverviewResponse> =>
    request<CohortOverviewResponse>("/api/analytics/overview"),

  getTriageRadar: (): Promise<TriageRadarResponse> =>
    request<TriageRadarResponse>("/api/analytics/triage-radar"),

  importCsv: (
    csvContent: string,
    autoRunPulse: boolean = true
  ): Promise<BatchImportResult> =>
    request<BatchImportResult>("/api/analytics/import-csv", {
      method: "POST",
      body: JSON.stringify({
        csv_content: csvContent,
        auto_run_pulse: autoRunPulse,
      }),
    }),

  // HL7 FHIR CDS Hooks & Clinical Deterioration Alerts
  getAlerts: (unacknowledgedOnly: boolean = false): Promise<AlertsListResponse> =>
    request<AlertsListResponse>(`/api/alerts?unacknowledged_only=${unacknowledgedOnly}`),

  acknowledgeAlert: (
    alertId: string,
    acknowledgedBy: string = "Attending Clinician",
    note?: string
  ): Promise<ClinicalAlert> =>
    request<ClinicalAlert>(`/api/alerts/${alertId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({
        acknowledged_by: acknowledgedBy,
        note,
      }),
    }),

  triggerAlertScan: (): Promise<AlertsListResponse> =>
    request<AlertsListResponse>("/api/alerts/scan", {
      method: "POST",
    }),

  getCDSServices: (): Promise<{ services: CDSService[] }> =>
    request<{ services: CDSService[] }>("/cds-services"),

  evaluatePatientViewHook: (patientId: string): Promise<CDSHookResponse> =>
    request<CDSHookResponse>("/cds-services/pulse-patient-view", {
      method: "POST",
      body: JSON.stringify({
        hook: "patient-view",
        context: { patientId },
      }),
    }),

  // Health & System
  openInBrowser: (): Promise<{ success: boolean; url: string }> =>
    request<{ success: boolean; url: string }>("/api/system/open-browser", {
      method: "POST",
    }),

  checkHealth: (): Promise<{ status: string; service: string }> =>
    request<{ status: string; service: string }>("/health"),
};
