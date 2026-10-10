"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { PatientDirectory } from "@/components/PatientDirectory";
import { PatientDetailView } from "@/components/PatientDetailView";
import { NewPatientModal } from "@/components/NewPatientModal";
import { api } from "@/lib/api";
import { Patient, CohortType, PatientCreate, VisitCreate } from "@/types/clinical";
import { Sparkles, CheckCircle2, AlertCircle, X, ExternalLink } from "lucide-react";

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [cohortFilter, setCohortFilter] = useState<CohortType | "ALL">("ALL");
  const [isApiHealthy, setIsApiHealthy] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningPulse, setIsRunningPulse] = useState<boolean>(false);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState<boolean>(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Load initial patients & check health
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

  useEffect(() => {
    // Health check
    api
      .checkHealth()
      .then(() => setIsApiHealthy(true))
      .catch(() => setIsApiHealthy(false));

    refreshPatientsList();
  }, [refreshPatientsList]);

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

  // Handler: Select a patient from directory
  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handler: Back to directory
  const handleBackToDirectory = () => {
    setSelectedPatientId(null);
    setSelectedPatient(null);
  };

  // Handler: Run PULSE Engine
  const handleRunPulse = async () => {
    if (!selectedPatientId) return;
    setIsRunningPulse(true);
    setBanner(null);

    try {
      const result = await api.runPulse(selectedPatientId);
      setSelectedPatient(result.patient);
      await refreshPatientsList();
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
    setBanner({
      type: "success",
      message: `Encounter #${data.visit_index} recorded with ${data.measurements?.length || 0} lab entries. Run PULSE engine to update omics projections.`,
    });
  };

  // Handler: Delete patient
  const handleDeletePatient = async (patientId: string) => {
    await api.deletePatient(patientId);
    setSelectedPatientId(null);
    setSelectedPatient(null);
    await refreshPatientsList();
    setBanner({
      type: "info",
      message: "Patient record and associated longitudinal data deleted.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 text-slate-900">
      {/* Top Navigation Bar */}
      <Header
        cohortFilter={cohortFilter}
        onCohortFilterChange={setCohortFilter}
        onOpenNewPatient={() => setIsNewPatientOpen(true)}
        isApiHealthy={isApiHealthy}
        selectedPatientName={selectedPatient?.full_name}
        onBackToDirectory={handleBackToDirectory}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Banner Alert Notification */}
        {banner && (
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs font-medium animate-in fade-in duration-200 ${
              banner.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : banner.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-indigo-50 border-indigo-200 text-indigo-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {banner.type === "success" && (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              )}
              {banner.type === "error" && (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              {banner.type === "info" && (
                <Sparkles className="h-5 w-5 text-indigo-600 shrink-0" />
              )}
              <span>{banner.message}</span>
            </div>
            <button
              onClick={() => setBanner(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Dynamic View: Directory vs Detailed Patient Profile */}
        {selectedPatient ? (
          <PatientDetailView
            patient={selectedPatient}
            onRefreshPatient={refreshSelectedPatient}
            onRunPulse={handleRunPulse}
            onAddVisit={handleAddVisit}
            onDeletePatient={handleDeletePatient}
            isRunningPulse={isRunningPulse}
          />
        ) : (
          <PatientDirectory
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={handleSelectPatient}
            cohortFilter={cohortFilter}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Clinical Footer with Attribution */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="font-bold text-slate-700">PULSE CDSS</span>
            <span className="hidden sm:inline">•</span>
            <span>
              Powered by the PULSE generative framework (
              <a
                href="https://www.nature.com/articles/s43588-026-00957-5"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline font-medium inline-flex items-center gap-0.5"
              >
                Nature Computational Science 2026
                <ExternalLink className="h-3 w-3" />
              </a>
              )
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Original Author:{" "}
              <a
                href="https://github.com/ww20hust"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline font-semibold"
              >
                Wei Wu (@ww20hust)
              </a>
            </span>
            <span>•</span>
            <span>Peking University / HUST</span>
          </div>
        </div>
      </footer>

      {/* Enroll Patient Modal */}
      <NewPatientModal
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        onSubmit={handleCreatePatient}
      />
    </div>
  );
}
