"use client";

import React, { useState } from "react";
import {
  Activity,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Patient, VisitCreate } from "@/types/clinical";
import { RiskScorecardView } from "@/components/views/RiskScorecardView";
import { SyntheticOmicsView } from "@/components/views/SyntheticOmicsView";
import { TrajectoriesView } from "@/components/views/TrajectoriesView";
import { TimelineNotesView } from "@/components/views/TimelineNotesView";
import { AddVisitModal } from "@/components/AddVisitModal";
import { ReportModal } from "@/components/ReportModal";

interface PatientDetailViewProps {
  patient: Patient;
  onRefreshPatient: () => Promise<void>;
  onRunPulse: () => Promise<void>;
  onAddVisit: (data: VisitCreate) => Promise<void>;
  onDeletePatient: (patientId: string) => Promise<void>;
  isRunningPulse: boolean;
}

export function PatientDetailView({
  patient,
  onRefreshPatient,
  onRunPulse,
  onAddVisit,
  onDeletePatient,
  isRunningPulse,
}: PatientDetailViewProps) {
  const [activeTab, setActiveTab] = useState<
    "risk" | "synthetic_omics" | "trajectories" | "timeline"
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

  return (
    <div className="space-y-6">
      {/* Patient Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity & Demographics */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {patient.full_name}
              </h2>
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                {patient.mrn}
              </span>
              <Badge
                variant="outline"
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 ${
                  isIcu
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
              >
                {isIcu ? "ICU Acute Monitoring" : "Outpatient Omics Screening"}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {patient.age} years old • {patient.sex === "M" ? "Male" : "Female"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {visits.length} {isIcu ? "Timepoint Steps (4h intervals)" : "Longitudinal Encounters"}
              </span>
              {latestVisit && (
                <>
                  <span>•</span>
                  <span>
                    Last Encounter: <strong>{latestVisit.visit_date}</strong>
                  </span>
                </>
              )}
            </div>

            {patient.clinical_history_summary && (
              <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-w-3xl leading-relaxed">
                &quot;{patient.clinical_history_summary}&quot;
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary PULSE Action */}
            <Button
              onClick={onRunPulse}
              disabled={isRunningPulse || visits.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 gap-2 px-4 py-2"
            >
              <Sparkles className={`h-4 w-4 ${isRunningPulse ? "animate-spin" : ""}`} />
              <span>{isRunningPulse ? "Synthesizing Multimodal Omics..." : "Run PULSE Engine"}</span>
            </Button>

            {/* Add Encounter */}
            <Button
              variant="outline"
              onClick={() => setIsAddVisitOpen(true)}
              className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 gap-1.5"
            >
              <PlusCircle className="h-4 w-4 text-indigo-600" />
              <span>Add Encounter</span>
            </Button>

            {/* Generate Report */}
            <Button
              variant="outline"
              onClick={() => setIsReportOpen(true)}
              className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 gap-1.5"
            >
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>Clinical Dossier</span>
            </Button>

            {/* Delete Patient */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              title="Delete Patient Record"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("risk")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "risk"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Prognostic Risk Scorecard</span>
          </button>

          <button
            onClick={() => setActiveTab("synthetic_omics")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "synthetic_omics"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Dna className="h-4 w-4" />
            <span>Synthetic Omics Panel</span>
          </button>

          <button
            onClick={() => setActiveTab("trajectories")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "trajectories"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Longitudinal Trajectories</span>
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "timeline"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Encounters & Notes ({visits.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
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
        />
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

      {/* Modals */}
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

      <ReportModal
        isOpen={isReportOpen}
        patient={patient}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}
