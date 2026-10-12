/**
 * API client for PULSE Clinical Decision Support System.
 * 
 * Supports Dual-Engine Operation:
 * 1. Live PyTorch FastAPI backend (when running on :8000)
 * 2. Embedded CDSS Engine (offline standalone execution on Windows / macOS / Linux / Web)
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
import { embeddedEngine, EMBEDDED_FEATURE_CATALOG } from "./embedded-engine";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type EngineMode = "live" | "embedded";

let currentEngineMode: EngineMode = "embedded";
const modeListeners: Array<(mode: EngineMode) => void> = [];

export function getEngineMode(): EngineMode {
  return currentEngineMode;
}

export function subscribeEngineMode(listener: (mode: EngineMode) => void): () => void {
  modeListeners.push(listener);
  listener(currentEngineMode);
  return () => {
    const idx = modeListeners.indexOf(listener);
    if (idx >= 0) modeListeners.splice(idx, 1);
  };
}

function setEngineMode(mode: EngineMode) {
  if (currentEngineMode !== mode) {
    currentEngineMode = mode;
    for (const listener of modeListeners) {
      try {
        listener(mode);
      } catch (err) {
        console.error("Error in engine mode listener:", err);
      }
    }
  }
}

/**
 * Fast network probe to test if live FastAPI PyTorch server is listening.
 */
async function probeLiveBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600);
    const res = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

// Initial probe on client
if (typeof window !== "undefined") {
  probeLiveBackend().then((isLive) => {
    setEngineMode(isLive ? "live" : "embedded");
  });
}

async function requestLive<T>(path: string, options?: RequestInit): Promise<T> {
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
        errorDetail =
          typeof errJson.detail === "string"
            ? errJson.detail
            : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  getEngineMode,
  subscribeEngineMode,

  // Features catalog
  getFeatures: async (): Promise<FeatureCatalog> => {
    if (currentEngineMode === "embedded") {
      return EMBEDDED_FEATURE_CATALOG;
    }
    try {
      return await requestLive<FeatureCatalog>("/api/features");
    } catch {
      setEngineMode("embedded");
      return EMBEDDED_FEATURE_CATALOG;
    }
  },

  // Patients
  getPatients: async (params?: {
    search?: string;
    cohort?: string;
    limit?: number;
    offset?: number;
  }): Promise<Patient[]> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.getPatients(params);
    }
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.cohort) query.set("cohort", params.cohort);
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.offset) query.set("offset", params.offset.toString());
      const qs = query.toString();
      const data = await requestLive<{ items?: Patient[] } | Patient[]>(
        `/api/patients${qs ? `?${qs}` : ""}`
      );
      if (Array.isArray(data)) return data;
      return data.items || [];
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.getPatients(params);
    }
  },

  getPatient: async (patientId: string): Promise<Patient> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.getPatient(patientId);
    }
    try {
      return await requestLive<Patient>(`/api/patients/${patientId}`);
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.getPatient(patientId);
    }
  },

  createPatient: async (data: PatientCreate): Promise<Patient> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.createPatient(data);
    }
    try {
      return await requestLive<Patient>("/api/patients", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.createPatient(data);
    }
  },

  updatePatient: async (
    patientId: string,
    data: Partial<PatientCreate>
  ): Promise<Patient> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.updatePatient(patientId, data);
    }
    try {
      return await requestLive<Patient>(`/api/patients/${patientId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.updatePatient(patientId, data);
    }
  },

  deletePatient: async (
    patientId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.deletePatient(patientId);
    }
    try {
      return await requestLive<{ success: boolean; message: string }>(
        `/api/patients/${patientId}`,
        { method: "DELETE" }
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.deletePatient(patientId);
    }
  },

  // Visits & Labs
  createVisit: async (patientId: string, data: VisitCreate): Promise<Visit> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.createVisit(patientId, data);
    }
    try {
      return await requestLive<Visit>(`/api/patients/${patientId}/visits`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.createVisit(patientId, data);
    }
  },

  addMeasurements: async (
    visitId: string,
    measurements: MeasurementCreate[]
  ): Promise<Measurement[]> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.addMeasurements(visitId, measurements);
    }
    try {
      return await requestLive<Measurement[]>(
        `/api/visits/${visitId}/measurements`,
        {
          method: "POST",
          body: JSON.stringify(measurements),
        }
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.addMeasurements(visitId, measurements);
    }
  },

  addNote: async (
    visitId: string,
    note: ClinicalNoteCreate
  ): Promise<ClinicalNote> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.addNote(visitId, note);
    }
    try {
      return await requestLive<ClinicalNote>(`/api/visits/${visitId}/notes`, {
        method: "POST",
        body: JSON.stringify(note),
      });
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.addNote(visitId, note);
    }
  },

  // PULSE Engine Synthesis & Forecasting
  runPulse: async (patientId: string): Promise<RunPulseResponse> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.runPulse(patientId);
    }
    try {
      return await requestLive<RunPulseResponse>(
        `/api/patients/${patientId}/run-pulse`,
        { method: "POST" }
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.runPulse(patientId);
    }
  },

  // Trajectories
  getTrajectories: async (patientId: string): Promise<TrajectoriesResponse> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.getTrajectories(patientId);
    }
    try {
      return await requestLive<TrajectoriesResponse>(
        `/api/patients/${patientId}/trajectories`
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.getTrajectories(patientId);
    }
  },

  // Clinical Report
  getReport: async (patientId: string): Promise<ClinicalReport> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.getReport(patientId);
    }
    try {
      return await requestLive<ClinicalReport>(
        `/api/patients/${patientId}/report`
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.getReport(patientId);
    }
  },

  // Exports
  exportFhir: async (patientId: string): Promise<any> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.exportFhir(patientId);
    }
    try {
      return await requestLive<any>(`/api/patients/${patientId}/export/fhir`);
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.exportFhir(patientId);
    }
  },

  getExportCsvUrl: (patientId: string): string => {
    if (currentEngineMode === "embedded") {
      try {
        const p = embeddedEngine.getPatient(patientId);
        const rows: string[] = [
          "visit_date,visit_index,feature_name,feature_category,value,unit,is_synthetic",
        ];
        for (const v of p.visits) {
          for (const m of v.measurements) {
            rows.push(
              `"${v.visit_date}",${v.visit_index},"${m.feature_name}","${m.feature_category}",${m.value},"${m.unit}",${m.is_synthetic}`
            );
          }
        }
        return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.join("\n"))}`;
      } catch {
        return "#";
      }
    }
    return `${API_BASE_URL}/api/patients/${patientId}/export/csv`;
  },

  // Digital Twin Simulation
  simulateIntervention: async (
    patientId: string,
    interventions: Record<string, number>
  ): Promise<SimulationResponse> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.simulateIntervention(patientId, interventions);
    }
    try {
      return await requestLive<SimulationResponse>(
        `/api/patients/${patientId}/simulate-intervention`,
        {
          method: "POST",
          body: JSON.stringify({ interventions }),
        }
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.simulateIntervention(patientId, interventions);
    }
  },

  // Clinical AI Co-Pilot & SBAR Handover
  queryCopilot: async (
    patientId: string,
    query: string,
    includeSbar: boolean = false
  ): Promise<CopilotQueryResponse> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.queryCopilot(patientId, query, includeSbar);
    }
    try {
      return await requestLive<CopilotQueryResponse>(
        `/api/patients/${patientId}/copilot`,
        {
          method: "POST",
          body: JSON.stringify({ query, include_sbar: includeSbar }),
        }
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.queryCopilot(patientId, query, includeSbar);
    }
  },

  getSBAR: async (patientId: string): Promise<SBARReport> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.getSBAR(patientId);
    }
    try {
      return await requestLive<SBARReport>(`/api/patients/${patientId}/sbar`);
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.getSBAR(patientId);
    }
  },

  // Population Health Analytics & Triage Radar
  getCohortOverview: async (): Promise<CohortOverviewResponse> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.getCohortOverview();
    }
    try {
      return await requestLive<CohortOverviewResponse>(
        "/api/analytics/overview"
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.getCohortOverview();
    }
  },

  getTriageRadar: async (): Promise<TriageRadarResponse> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.getTriageRadar();
    }
    try {
      return await requestLive<TriageRadarResponse>(
        "/api/analytics/triage-radar"
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.getTriageRadar();
    }
  },

  importCsv: async (
    csvContent: string,
    autoRunPulse: boolean = true
  ): Promise<BatchImportResult> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.importCsv(csvContent, autoRunPulse);
    }
    try {
      return await requestLive<BatchImportResult>("/api/analytics/import-csv", {
        method: "POST",
        body: JSON.stringify({
          csv_content: csvContent,
          auto_run_pulse: autoRunPulse,
        }),
      });
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.importCsv(csvContent, autoRunPulse);
    }
  },

  // HL7 FHIR CDS Hooks & Clinical Deterioration Alerts
  getAlerts: async (
    unacknowledgedOnly: boolean = false
  ): Promise<AlertsListResponse> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.getAlerts(unacknowledgedOnly);
    }
    try {
      return await requestLive<AlertsListResponse>(
        `/api/alerts?unacknowledged_only=${unacknowledgedOnly}`
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.getAlerts(unacknowledgedOnly);
    }
  },

  acknowledgeAlert: async (
    alertId: string,
    acknowledgedBy: string = "Attending Clinician",
    note?: string
  ): Promise<ClinicalAlert> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.acknowledgeAlert(alertId, acknowledgedBy, note);
    }
    try {
      return await requestLive<ClinicalAlert>(
        `/api/alerts/${alertId}/acknowledge`,
        {
          method: "POST",
          body: JSON.stringify({
            acknowledged_by: acknowledgedBy,
            note,
          }),
        }
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.acknowledgeAlert(alertId, acknowledgedBy, note);
    }
  },

  triggerAlertScan: async (): Promise<AlertsListResponse> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.triggerAlertScan();
    }
    try {
      return await requestLive<AlertsListResponse>("/api/alerts/scan", {
        method: "POST",
      });
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.triggerAlertScan();
    }
  },

  getCDSServices: async (): Promise<{ services: CDSService[] }> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.getCDSServices();
    }
    try {
      return await requestLive<{ services: CDSService[] }>("/cds-services");
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.getCDSServices();
    }
  },

  evaluatePatientViewHook: async (
    patientId: string
  ): Promise<CDSHookResponse> => {
    if (currentEngineMode === "embedded") {
      return embeddedEngine.evaluatePatientViewHook(patientId);
    }
    try {
      return await requestLive<CDSHookResponse>(
        "/cds-services/pulse-patient-view",
        {
          method: "POST",
          body: JSON.stringify({
            hook: "patient-view",
            context: { patientId },
          }),
        }
      );
    } catch {
      setEngineMode("embedded");
      return embeddedEngine.evaluatePatientViewHook(patientId);
    }
  },

  // Health & System
  openInBrowser: async (): Promise<{ success: boolean; url: string }> => {
    if (currentEngineMode === "embedded") {
      if (typeof window !== "undefined") {
        window.open("http://localhost:8000", "_blank");
      }
      return { success: true, url: "http://localhost:8000" };
    }
    try {
      return await requestLive<{ success: boolean; url: string }>(
        "/api/system/open-browser",
        { method: "POST" }
      );
    } catch {
      if (typeof window !== "undefined") {
        window.open("http://localhost:8000", "_blank");
      }
      return { success: true, url: "http://localhost:8000" };
    }
  },

  checkHealth: async (): Promise<{
    status: string;
    service: string;
    mode: EngineMode;
  }> => {
    const isLive = await probeLiveBackend();
    const mode: EngineMode = isLive ? "live" : "embedded";
    setEngineMode(mode);
    return {
      status: "ok",
      service: isLive ? "pulse-fastapi-backend" : "pulse-embedded-cdss",
      mode,
    };
  },
};
