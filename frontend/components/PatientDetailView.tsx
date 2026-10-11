"use client";

import React, { useState } from "react";
import {
  Sparkles,
  PlusCircle,
  FileText,
  Trash2,
  Calendar,
  Clock,
  Dna,
  ShieldCheck,
  TrendingUp,
  User,
  Sliders,
  Download,
  Bot,
  ExternalLink,
} from "lucide-react";
import { Patient, VisitCreate, Measurement } from "@/types/clinical";
import { RiskScorecardView } from "@/components/views/RiskScorecardView";
import { SyntheticOmicsView } from "@/components/views/SyntheticOmicsView";
import { TrajectoriesView } from "@/components/views/TrajectoriesView";
import { TimelineNotesView } from "@/components/views/TimelineNotesView";
import { DigitalTwinView } from "@/components/views/DigitalTwinView";
import { ClinicalCopilotView } from "@/components/views/ClinicalCopilotView";
import { CDSCardsView } from "@/components/CDSCardsView";
import { AddVisitModal } from "@/components/AddVisitModal";
import { ReportModal } from "@/components/ReportModal";

interface PatientDetailViewProps {
  patient: Patient;
  onRefreshPatient: () => Promise<void>;
  onRunPulse: () => Promise<void>;
  onAddVisit: (data: VisitCreate) => Promise<void>;
  onDeletePatient: (patientId: string) => Promise<void>;
  isRunningPulse: boolean;
  onSelectBiomarker?: (m: Measurement) => void;
}

export function PatientDetailView({
  patient,
  onRefreshPatient,
  onRunPulse,
  onAddVisit,
  onDeletePatient,
  isRunningPulse,
  onSelectBiomarker,
}: PatientDetailViewProps) {
  const [activeTab, setActiveTab] = useState<
    "risk" | "synthetic_omics" | "digital_twin" | "trajectories" | "timeline" | "copilot"
  >("risk");
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const visits = patient.visits || [];
  const latestVisit = visits.length > 0 ? visits[visits.length - 1] : null;
  const isIcu = patient.cohort_type === "INPATIENT_ACUTE_ICU";

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete patient "${patient.full_name}" (${patient.mrn})? This will permanently remove all historical encounters and latent states.`
      )
    ) {
      setIsDeleting(true);
      try {
        await onDeletePatient(patient.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const tabs: Array<{
    id: typeof activeTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: "risk", label: "Risk Scorecard", icon: ShieldCheck },
    { id: "synthetic_omics", label: "Synthetic Omics Panel", icon: Dna },
    { id: "digital_twin", label: "Digital Twin Sandbox", icon: Sliders },
    { id: "trajectories", label: "Trajectories", icon: TrendingUp },
    { id: "timeline", label: "Encounters & Notes", icon: Calendar, count: visits.length },
    { id: "copilot", label: "AI Co-Pilot", icon: Bot },
  ];

  return (
    <div className="space-y-6">
      {/* Patient Profile Header Strip */}
      <div className="border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Identity & Demographics */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#17191C]">
                {patient.full_name}
              </h1>
              <span className="font-mono text-xs font-medium text-[#667085] bg-[#FAFAFB] px-2 py-0.5 rounded border border-[#E9EBEF]">
                {patient.mrn}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  isIcu
                    ? "bg-[#C2414B]/10 text-[#C2414B]"
                    : "bg-[#EDF3FF] text-[#386DF4]"
                }`}
              >
                {isIcu ? "ICU Acute Cohort" : "Outpatient Chronic Cohort"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085]">
              <span>
                {patient.age} yrs • {patient.sex === "M" ? "Male" : "Female"}
              </span>
              <span>•</span>
              <span>
                {visits.length} {isIcu ? "Timepoints (4h steps)" : "Recorded Encounters"}
              </span>
              {latestVisit && (
                <>
                  <span>•</span>
                  <span>
                    Latest Visit: <strong>{latestVisit.visit_date}</strong>
                  </span>
                </>
              )}
            </div>

            {patient.clinical_history_summary && (
              <p className="text-xs text-[#667085] bg-[#FAFAFB] p-2.5 rounded border border-[#E9EBEF] max-w-3xl leading-relaxed mt-2">
                &ldquo;{patient.clinical_history_summary}&rdquo;
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Primary Action: Run PULSE Engine */}
            <button
              onClick={onRunPulse}
              disabled={isRunningPulse || visits.length === 0}
              className="h-8 px-3.5 bg-[#386DF4] hover:bg-[#2F5ECC] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isRunningPulse ? "animate-spin" : ""}`} />
              <span>{isRunningPulse ? "Synthesizing..." : "Run PULSE Engine"}</span>
            </button>

            {/* Add Encounter */}
            <button
              onClick={() => setIsAddVisitOpen(true)}
              className="h-8 px-3 text-xs font-medium text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5 text-[#667085]" />
              <span>Add Encounter</span>
            </button>

            {/* Generate Report Dossier */}
            <button
              onClick={() => setIsReportOpen(true)}
              className="h-8 px-3 text-xs font-medium text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-[#667085]" />
              <span>Clinical Dossier</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={() => {
                window.open(`http://localhost:8000/api/patients/${patient.id}/export/csv`, "_blank");
              }}
              title="Download Longitudinal CSV"
              className="h-8 px-2.5 text-xs font-medium text-[#667085] hover:text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>

            {/* Export FHIR */}
            <button
              onClick={async () => {
                try {
                  const fhir = await (await fetch(`http://localhost:8000/api/patients/${patient.id}/export/fhir`)).json();
                  const blob = new Blob([JSON.stringify(fhir, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${patient.mrn}_fhir_bundle.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  alert("Export failed.");
                }
              }}
              title="Export as HL7 FHIR R4 Bundle"
              className="h-8 px-2.5 text-xs font-medium text-[#667085] hover:text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              <span>FHIR</span>
            </button>

            {/* Delete Patient */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete Patient Record"
              className="h-8 w-8 text-[#98A2B3] hover:text-[#C2414B] hover:bg-[#C2414B]/10 rounded-md transition-colors flex items-center justify-center"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* SaMD Safety Regulatory Notice */}
        <div className="pt-3 border-t border-[#E9EBEF] flex items-center justify-between text-[11px] text-[#667085]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#386DF4] shrink-0" />
            <span>
              <strong>SaMD Regulatory Notice:</strong> PULSE reconstructions and risk scorecards are generative statistical aids and must be verified against direct confirmatory laboratory testing.
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#98A2B3] uppercase shrink-0 hidden sm:inline">
            21 CFR Part 11 Audit Active
          </span>
        </div>
      </div>

      {/* HL7 FHIR CDS Hooks Decision Cards */}
      <CDSCardsView patientId={patient.id} />

      {/* Linear-Style Horizontal Tab Navigation Strip */}
      <div className="border-b border-[#E9EBEF] flex items-center gap-1 overflow-x-auto text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-9 px-3 flex items-center gap-2 font-medium transition-all border-b-2 shrink-0 ${
                isActive
                  ? "border-[#386DF4] text-[#386DF4] font-semibold"
                  : "border-transparent text-[#667085] hover:text-[#17191C] hover:border-[#E9EBEF]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#F6F7F9] text-[#667085] border border-[#E9EBEF]">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === "risk" && (
          <RiskScorecardView
            patient={patient}
            onRunPulse={onRunPulse}
            isRunningPulse={isRunningPulse}
          />
        )}

        {activeTab === "synthetic_omics" && (
          <SyntheticOmicsView
            patient={patient}
            onRunPulse={onRunPulse}
            isRunningPulse={isRunningPulse}
            onSelectBiomarker={onSelectBiomarker}
          />
        )}

        {activeTab === "digital_twin" && (
          <DigitalTwinView patient={patient} />
        )}

        {activeTab === "trajectories" && (
          <TrajectoriesView patient={patient} />
        )}

        {activeTab === "timeline" && (
          <TimelineNotesView
            patient={patient}
            onOpenAddVisit={() => setIsAddVisitOpen(true)}
          />
        )}

        {activeTab === "copilot" && (
          <ClinicalCopilotView patient={patient} />
        )}
      </div>

      {/* Add Encounter Modal */}
      <AddVisitModal
        isOpen={isAddVisitOpen}
        patient={patient}
        onClose={() => setIsAddVisitOpen(false)}
        onSubmit={async (data) => {
          await onAddVisit(data);
          setIsAddVisitOpen(false);
          await onRefreshPatient();
        }}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        patient={patient}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}
