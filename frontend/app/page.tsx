"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { NavItem } from "@/components/shell/Sidebar";
import { BreadcrumbItem } from "@/components/shell/Breadcrumbs";
import { InspectorContent } from "@/components/shell/RightInspector";
import { OverviewView } from "@/components/views/OverviewView";
import { PatientRegistryView } from "@/components/views/PatientRegistryView";
import { PopulationHealthView } from "@/components/views/PopulationHealthView";
import { PatientDetailView } from "@/components/PatientDetailView";
import { NewPatientModal } from "@/components/NewPatientModal";
import { BatchImportModal } from "@/components/BatchImportModal";
import { AboutResearchDialog } from "@/components/dialogs/AboutResearchDialog";
import { LaunchModeDialog } from "@/components/dialogs/LaunchModeDialog";
import { api } from "@/lib/api";
import {
  Patient,
  CohortType,
  PatientCreate,
  VisitCreate,
  ClinicalAlert,
  Measurement,
} from "@/types/clinical";
import { CheckCircle2, AlertCircle, X, Sparkles } from "lucide-react";

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("patients");
  const [cohortFilter, setCohortFilter] = useState<CohortType | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isApiHealthy, setIsApiHealthy] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningPulse, setIsRunningPulse] = useState<boolean>(false);

  // Modals
  const [isNewPatientOpen, setIsNewPatientOpen] = useState<boolean>(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isLaunchModeOpen, setIsLaunchModeOpen] = useState<boolean>(false);

  // Alerts & Inspector
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [unacknowledgedAlertsCount, setUnacknowledgedAlertsCount] = useState<number>(0);
  const [inspectorContent, setInspectorContent] = useState<InspectorContent>({ type: "none" });

  // Banner Notification
  const [banner, setBanner] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Load initial patients & health
  const refreshPatientsList = useCallback(async () => {
    try {
      const data = await api.getPatients();
      setPatients(data);
      setIsApiHealthy(true);
    } catch (err) {
      setIsApiHealthy(false);
      console.error("Failed to load patients list:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh active clinical alerts
  const refreshAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data.alerts || []);
      setUnacknowledgedAlertsCount(data.unacknowledged_count);
    } catch (err) {
      console.error("Failed to refresh alerts:", err);
    }
  }, []);

  useEffect(() => {
    api
      .checkHealth()
      .then(() => setIsApiHealthy(true))
      .catch(() => setIsApiHealthy(true));

    refreshPatientsList();
    refreshAlerts();
  }, [refreshPatientsList, refreshAlerts]);

  // Load detailed patient when selected
  const refreshSelectedPatient = useCallback(async () => {
    if (!selectedPatientId) {
      setSelectedPatient(null);
      return;
    }
    try {
      const p = await api.getPatient(selectedPatientId);
      setSelectedPatient(p);
    } catch (err) {
      console.error("Failed to load patient detail:", err);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    refreshSelectedPatient();
  }, [refreshSelectedPatient]);

  // Handler: Select a patient from directory or triage radar or alert center
  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveNav("patients");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler: Back to directory
  const handleBackToDirectory = () => {
    setSelectedPatientId(null);
    setSelectedPatient(null);
    setInspectorContent({ type: "none" });
  };

  // Handler: Run PULSE Engine
  const handleRunPulse = async (patientId?: string) => {
    const targetId = patientId || selectedPatientId;
    if (!targetId) return;

    setIsRunningPulse(true);
    setBanner(null);

    try {
      const result = await api.runPulse(targetId);
      if (selectedPatientId === targetId) {
        setSelectedPatient(result.patient);
      }
      await refreshPatientsList();
      await refreshAlerts();
      setBanner({
        type: "success",
        message: `PULSE Synthesis Complete: Imputed ${result.synthesized_measurements_count} molecular omics biomarkers and updated ${result.predictions_count} calibrated disease risk forecasts across ${result.latent_states_count} latent states.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error running PULSE synthesis.";
      setBanner({
        type: "error",
        message: `PULSE Synthesis Error: ${msg}`,
      });
    } finally {
      setIsRunningPulse(false);
    }
  };

  // Handler: Create patient
  const handleCreatePatient = async (data: PatientCreate) => {
    const newPatient = await api.createPatient(data);
    await refreshPatientsList();
    setSelectedPatientId(newPatient.id);
    setActiveNav("patients");
    await refreshAlerts();
    setBanner({
      type: "success",
      message: `Enrolled new patient: ${newPatient.full_name} (${newPatient.mrn}). You can now record clinical visits or test presets.`,
    });
  };

  // Handler: Add visit
  const handleAddVisit = async (data: VisitCreate) => {
    if (!selectedPatientId) return;
    await api.createVisit(selectedPatientId, data);
    await refreshSelectedPatient();
    await refreshPatientsList();
    await refreshAlerts();
    setBanner({
      type: "success",
      message: `Encounter recorded with ${data.measurements?.length || 0} lab entries. Run PULSE engine to update omics projections.`,
    });
  };

  // Handler: Delete patient
  const handleDeletePatient = async (patientId: string) => {
    await api.deletePatient(patientId);
    setSelectedPatientId(null);
    setSelectedPatient(null);
    setInspectorContent({ type: "none" });
    await refreshPatientsList();
    await refreshAlerts();
    setBanner({
      type: "info",
      message: "Patient record and associated longitudinal data deleted.",
    });
  };

  // Handler: Batch CSV Import success
  const handleBatchImportSuccess = async () => {
    await refreshPatientsList();
    await refreshAlerts();
    setBanner({
      type: "success",
      message: "Batch electronic health record import complete. Patient cohorts and longitudinal visits have been synchronized.",
    });
  };

  // Handler: Acknowledge alert
  const handleAcknowledgeAlert = async (alertId: string, note?: string) => {
    try {
      await api.acknowledgeAlert(alertId, "Attending Clinician", note);
      await refreshAlerts();
      setBanner({
        type: "success",
        message: "Clinical deterioration alert acknowledged and signed in 21 CFR Part 11 audit log.",
      });
    } catch (err: unknown) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  // Inspect Biomarker in side panel
  const handleSelectBiomarker = (biomarker: Measurement) => {
    setInspectorContent({
      type: "biomarker",
      biomarker,
      patientName: selectedPatient?.full_name,
    });
  };

  // Inspect Patient in side panel
  const handleInspectPatient = (patient: Patient) => {
    setInspectorContent({
      type: "patient",
      patient,
    });
  };

  // Open Alerts in inspector or view
  const handleOpenAlerts = () => {
    setInspectorContent({
      type: "alerts",
      alerts,
      onAcknowledge: handleAcknowledgeAlert,
    });
  };

  // Build breadcrumbs dynamically
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: "Workspace",
      onClick: () => {
        handleBackToDirectory();
        setActiveNav("overview");
      },
    },
  ];

  if (activeNav === "overview") {
    breadcrumbs.push({ label: "Clinical Overview", active: true });
  } else if (activeNav === "analytics") {
    breadcrumbs.push({ label: "Population Health Analytics", active: true });
  } else if (activeNav === "alerts") {
    breadcrumbs.push({ label: "Deterioration Alerts", active: true });
  } else {
    // activeNav === "patients"
    if (selectedPatient) {
      breadcrumbs.push({
        label: "Patients",
        onClick: handleBackToDirectory,
      });
      breadcrumbs.push({
        label: `${selectedPatient.full_name} (${selectedPatient.mrn})`,
        active: true,
      });
    } else {
      breadcrumbs.push({ label: "Patient Registry", active: true });
    }
  }

  return (
    <AppShell
      activeNav={activeNav}
      onNavigate={(nav) => {
        setActiveNav(nav);
        if (nav === "overview" || nav === "analytics") {
          setSelectedPatientId(null);
          setSelectedPatient(null);
        } else if (nav === "alerts") {
          handleOpenAlerts();
        }
      }}
      breadcrumbs={breadcrumbs}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      cohortFilter={cohortFilter}
      onCohortFilterChange={setCohortFilter}
      unacknowledgedAlertsCount={unacknowledgedAlertsCount}
      onOpenAlerts={handleOpenAlerts}
      isApiHealthy={isApiHealthy}
      onOpenNewPatient={() => setIsNewPatientOpen(true)}
      onOpenBatchImport={() => setIsBatchImportOpen(true)}
      onOpenAbout={() => setIsAboutOpen(true)}
      onOpenInBrowser={() => setIsLaunchModeOpen(true)}
      inspectorContent={inspectorContent}
      onSelectPatient={handleSelectPatient}
      onRunPulse={handleRunPulse}
      isRunningPulse={isRunningPulse}
      showCohortFilter={activeNav === "patients" && !selectedPatient}
    >
      <div className="space-y-6">
        {/* Banner Alert Notification */}
        {banner && (
          <div
            className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 text-xs font-medium transition-all ${
              banner.type === "success"
                ? "bg-[#15803D]/5 border-[#15803D]/25 text-[#15803D]"
                : banner.type === "error"
                ? "bg-[#C2414B]/5 border-[#C2414B]/25 text-[#C2414B]"
                : "bg-[#386DF4]/5 border-[#386DF4]/25 text-[#386DF4]"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {banner.type === "success" && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#15803D]" />
              )}
              {banner.type === "error" && (
                <AlertCircle className="h-4 w-4 shrink-0 text-[#C2414B]" />
              )}
              {banner.type === "info" && (
                <Sparkles className="h-4 w-4 shrink-0 text-[#386DF4]" />
              )}
              <span className="truncate">{banner.message}</span>
            </div>
            <button
              onClick={() => setBanner(null)}
              className="text-[#98A2B3] hover:text-[#17191C] p-0.5 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* View Router */}
        {activeNav === "overview" && (
          <OverviewView
            onSelectPatient={handleSelectPatient}
            onOpenNewPatient={() => setIsNewPatientOpen(true)}
            onOpenBatchImport={() => setIsBatchImportOpen(true)}
            onNavigateToPatients={() => setActiveNav("patients")}
            onNavigateToAlerts={handleOpenAlerts}
          />
        )}

        {activeNav === "analytics" && (
          <PopulationHealthView
            onSelectPatient={handleSelectPatient}
            onOpenBatchImport={() => setIsBatchImportOpen(true)}
          />
        )}

        {activeNav === "patients" &&
          (selectedPatient ? (
            <PatientDetailView
              patient={selectedPatient}
              onRefreshPatient={refreshSelectedPatient}
              onRunPulse={() => handleRunPulse()}
              onAddVisit={handleAddVisit}
              onDeletePatient={handleDeletePatient}
              isRunningPulse={isRunningPulse}
              onSelectBiomarker={handleSelectBiomarker}
            />
          ) : (
            <PatientRegistryView
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={handleSelectPatient}
              onInspectPatient={handleInspectPatient}
              cohortFilter={cohortFilter}
              onCohortFilterChange={setCohortFilter}
              isLoading={isLoading}
              onOpenNewPatient={() => setIsNewPatientOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          ))}

        {activeNav === "alerts" && (
          <div className="space-y-4">
            <div className="pb-4 border-b border-[#E9EBEF]">
              <h1 className="text-2xl font-semibold tracking-tight text-[#17191C]">
                Clinical Deterioration Alerts
              </h1>
              <p className="text-xs text-[#667085] mt-1">
                Real-time surveillance monitoring algorithmic risk score jumps and vital sign deterioration.
              </p>
            </div>

            <div className="border border-[#E9EBEF] rounded-lg bg-[#FFFFFF] overflow-hidden">
              <table className="w-full text-left text-xs text-[#17191C] divide-y divide-[#E9EBEF]">
                <thead className="bg-[#FAFAFB] text-[#667085] font-medium text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Severity</th>
                    <th className="py-2.5 px-4">Patient & MRN</th>
                    <th className="py-2.5 px-4">Alert Title</th>
                    <th className="py-2.5 px-4">Predicted Risk</th>
                    <th className="py-2.5 px-4">Velocity</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EBEF]">
                  {alerts.map((al) => (
                    <tr key={al.id} className="hover:bg-[#F6F7F9] transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded font-mono ${
                            al.severity === "CRITICAL"
                              ? "bg-[#C2414B] text-white"
                              : "bg-[#B7791F] text-white"
                          }`}
                        >
                          {al.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#17191C]">{al.patient_name}</div>
                        <div className="font-mono text-[11px] text-[#98A2B3]">{al.mrn}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#17191C] max-w-xs">
                        <div>{al.title}</div>
                        <div className="text-[11px] text-[#667085] truncate">{al.message}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[13px] text-[#17191C]">
                        {Math.round(al.risk_score * 100)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className={al.risk_velocity > 0 ? "text-[#C2414B]" : "text-[#15803D]"}>
                          {al.risk_velocity > 0
                            ? `+${(al.risk_velocity * 100).toFixed(1)}%`
                            : `${(al.risk_velocity * 100).toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {al.is_acknowledged ? (
                          <span className="text-[11px] text-[#15803D] font-medium">
                            Acknowledged
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#C2414B] font-medium">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          {!al.is_acknowledged && (
                            <button
                              onClick={() => handleAcknowledgeAlert(al.id)}
                              className="text-[11px] font-semibold text-white bg-[#17191C] hover:bg-[#386DF4] px-2.5 py-1 rounded transition-colors"
                            >
                              Sign & Acknowledge
                            </button>
                          )}
                          <button
                            onClick={() => handleSelectPatient(al.patient_id)}
                            className="text-[11px] font-medium text-[#386DF4] hover:underline"
                          >
                            Dossier →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewPatientModal
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        onSubmit={handleCreatePatient}
      />

      <BatchImportModal
        isOpen={isBatchImportOpen}
        onClose={() => setIsBatchImportOpen(false)}
        onSuccess={handleBatchImportSuccess}
      />

      <AboutResearchDialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <LaunchModeDialog
        forceOpen={isLaunchModeOpen}
        onClose={() => setIsLaunchModeOpen(false)}
      />
    </AppShell>
  );
}
