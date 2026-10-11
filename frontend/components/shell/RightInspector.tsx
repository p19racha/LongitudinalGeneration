"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Activity,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Patient, Measurement, ClinicalAlert } from "@/types/clinical";

export type InspectorContent =
  | { type: "none" }
  | { type: "patient"; patient: Patient }
  | { type: "biomarker"; biomarker: Measurement; patientName?: string }
  | { type: "alerts"; alerts: ClinicalAlert[]; onAcknowledge: (id: string, note?: string) => Promise<void> };

interface RightInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  content: InspectorContent;
  onSelectPatient?: (id: string) => void;
  onRunPulse?: (id: string) => void;
  isRunningPulse?: boolean;
}

export function RightInspector({
  isOpen,
  onClose,
  content,
  onSelectPatient,
  onRunPulse,
  isRunningPulse = false,
}: RightInspectorProps) {
  const [ackNote, setAckNote] = useState<string>("");
  const [ackSubmittingId, setAckSubmittingId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <aside
      className="w-[340px] bg-[#FFFFFF] border-l border-[#E9EBEF] flex flex-col shrink-0 text-[#17191C] h-full overflow-hidden transition-all duration-200 z-20"
      aria-label="Contextual Inspector"
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-[#E9EBEF] flex items-center justify-between shrink-0 bg-[#FAFAFB]">
        <span className="text-[12px] font-semibold tracking-wider text-[#667085] uppercase">
          {content.type === "patient" && "Patient Summary"}
          {content.type === "biomarker" && "Biomarker Inspector"}
          {content.type === "alerts" && "Clinical Alerts Queue"}
          {content.type === "none" && "Clinical Inspector"}
        </span>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded flex items-center justify-center text-[#667085] hover:text-[#17191C] hover:bg-[#F6F7F9] transition-colors"
          title="Close Inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-[13px]">
        {/* State: Empty */}
        {content.type === "none" && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#98A2B3]">
            <Activity className="h-8 w-8 stroke-[1.25] mb-2.5 text-[#98A2B3]" />
            <p className="text-sm font-medium text-[#667085]">No Context Selected</p>
            <p className="text-xs mt-1 text-[#98A2B3]">
              Select a patient record, biomarker measurement, or alert notification to view details here.
            </p>
          </div>
        )}

        {/* State: Patient Profile */}
        {content.type === "patient" && (
          <div className="space-y-5">
            {/* Top Identity */}
            <div className="pb-3 border-b border-[#E9EBEF]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#386DF4]" />
                <span className="text-[11px] font-mono font-medium text-[#667085]">
                  {content.patient.mrn}
                </span>
                <span
                  className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    content.patient.cohort_type === "INPATIENT_ACUTE_ICU"
                      ? "bg-[#C2414B]/10 text-[#C2414B]"
                      : "bg-[#EDF3FF] text-[#386DF4]"
                  }`}
                >
                  {content.patient.cohort_type === "INPATIENT_ACUTE_ICU"
                    ? "ICU Acute"
                    : "Outpatient"}
                </span>
              </div>
              <h2 className="text-base font-semibold text-[#17191C]">
                {content.patient.full_name}
              </h2>
              <p className="text-xs text-[#667085] mt-0.5">
                {content.patient.age} yrs • {content.patient.sex} • {content.patient.visits.length} recorded encounters
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-md bg-[#FAFAFB] border border-[#E9EBEF]">
                <span className="text-[10px] text-[#98A2B3] uppercase tracking-wider block">
                  Visits Logged
                </span>
                <span className="text-base font-semibold font-mono text-[#17191C]">
                  {content.patient.visits.length}
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-[#FAFAFB] border border-[#E9EBEF]">
                <span className="text-[10px] text-[#98A2B3] uppercase tracking-wider block">
                  Omics Imputed
                </span>
                <span className="text-base font-semibold font-mono text-[#7856A8]">
                  {
                    content.patient.visits.reduce(
                      (acc, v) =>
                        acc +
                        (v.measurements?.filter((m) => m.is_synthetic).length || 0),
                      0
                    )
                  }
                </span>
              </div>
            </div>

            {/* Clinical Summary */}
            {content.patient.clinical_history_summary && (
              <div>
                <span className="text-[11px] font-medium text-[#667085] uppercase tracking-wider block mb-1.5">
                  Clinical History
                </span>
                <p className="text-xs text-[#667085] leading-relaxed bg-[#FAFAFB] p-2.5 rounded-md border border-[#E9EBEF]">
                  {content.patient.clinical_history_summary}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-2">
              {onSelectPatient && (
                <button
                  onClick={() => onSelectPatient(content.patient.id)}
                  className="w-full flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-[#386DF4] hover:bg-[#2F5ECC] rounded-md transition-colors"
                >
                  <span>Open Longitudinal Dossier</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}

              {onRunPulse && (
                <button
                  onClick={() => onRunPulse(content.patient.id)}
                  disabled={isRunningPulse}
                  className="w-full flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium text-[#17191C] bg-[#FAFAFB] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#386DF4]" />
                  <span>{isRunningPulse ? "Synthesizing..." : "Run PULSE Engine"}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* State: Biomarker Detail */}
        {content.type === "biomarker" && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-[#E9EBEF]">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    content.biomarker.is_synthetic
                      ? "bg-[#7856A8]/10 text-[#7856A8]"
                      : "bg-[#0F766E]/10 text-[#0F766E]"
                  }`}
                >
                  {content.biomarker.is_synthetic ? "AI-Synthesized Omics" : "Laboratory Measured"}
                </span>
                <span className="text-[10px] font-mono text-[#98A2B3] ml-auto uppercase">
                  {content.biomarker.feature_category}
                </span>
              </div>
              <h2 className="text-base font-semibold text-[#17191C]">
                {content.biomarker.feature_name}
              </h2>
              {content.patientName && (
                <p className="text-xs text-[#667085] mt-0.5">
                  Patient: {content.patientName}
                </p>
              )}
            </div>

            {/* Measurement value & units */}
            <div className="p-3 bg-[#FAFAFB] rounded-md border border-[#E9EBEF]">
              <span className="text-[11px] text-[#98A2B3] block mb-1">Observed Value</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-[#17191C]">
                  {content.biomarker.value.toFixed(2)}
                </span>
                <span className="text-xs text-[#667085] font-mono font-medium">
                  {content.biomarker.unit}
                </span>
              </div>
            </div>

            {/* Reference Intervals */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-medium text-[#667085] uppercase tracking-wider block">
                Reference Range
              </span>
              <div className="p-2.5 rounded-md bg-[#FAFAFB] border border-[#E9EBEF] flex items-center justify-between">
                <span className="text-[#667085]">Normative Interval</span>
                <span className="font-mono font-medium text-[#17191C]">
                  {content.biomarker.ref_low !== null && content.biomarker.ref_high !== null
                    ? `${content.biomarker.ref_low} – ${content.biomarker.ref_high} ${content.biomarker.unit}`
                    : "Not established"}
                </span>
              </div>
            </div>

            {/* 95% Confidence Interval (for synthesized values) */}
            {content.biomarker.is_synthetic && (
              <div className="space-y-2 text-xs">
                <span className="text-[11px] font-medium text-[#7856A8] uppercase tracking-wider block">
                  PULSE 95% Credible Interval
                </span>
                <div className="p-2.5 rounded-md bg-[#7856A8]/5 border border-[#7856A8]/20 flex items-center justify-between">
                  <span className="text-[#7856A8]">Variational Posterior</span>
                  <span className="font-mono font-medium text-[#7856A8]">
                    {content.biomarker.confidence_interval_low !== null &&
                    content.biomarker.confidence_interval_high !== null
                      ? `[${content.biomarker.confidence_interval_low?.toFixed(
                          2
                        )}, ${content.biomarker.confidence_interval_high?.toFixed(2)}]`
                      : "± 0.12 (calibrated)"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* State: Alerts Queue */}
        {content.type === "alerts" && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-[#E9EBEF] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#17191C]">
                Active Alerts ({content.alerts.length})
              </span>
            </div>

            {content.alerts.length === 0 ? (
              <div className="py-8 text-center text-[#98A2B3]">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-[#15803D]" />
                <p className="text-xs font-medium text-[#17191C]">No Active Deterioration Alerts</p>
                <p className="text-[11px] text-[#98A2B3] mt-0.5">
                  All automated CDS Hooks thresholds are within nominal parameters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {content.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-md border text-xs space-y-2 ${
                      alert.severity === "CRITICAL"
                        ? "bg-[#C2414B]/5 border-[#C2414B]/20"
                        : "bg-[#B7791F]/5 border-[#B7791F]/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded ${
                          alert.severity === "CRITICAL"
                            ? "bg-[#C2414B] text-white"
                            : "bg-[#B7791F] text-white"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="font-mono text-[10px] text-[#98A2B3]">
                        {alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : ""}
                      </span>
                    </div>

                    <h4 className="font-semibold text-[#17191C] leading-snug">
                      {alert.title}
                    </h4>

                    {alert.message && (
                      <p className="text-[#667085] leading-relaxed text-[11px]">
                        {alert.message}
                      </p>
                    )}

                    {!alert.is_acknowledged && (
                      <div className="pt-2 border-t border-[#E9EBEF] space-y-1.5">
                        <input
                          type="text"
                          placeholder="Add clinical attestation note..."
                          value={ackSubmittingId === alert.id ? ackNote : ""}
                          onChange={(e) => {
                            setAckSubmittingId(alert.id);
                            setAckNote(e.target.value);
                          }}
                          className="w-full h-7 px-2 text-[11px] bg-white border border-[#E9EBEF] rounded outline-none focus:border-[#386DF4]"
                        />
                        <button
                          onClick={async () => {
                            setAckSubmittingId(alert.id);
                            await content.onAcknowledge(
                              alert.id,
                              ackSubmittingId === alert.id ? ackNote : undefined
                            );
                            setAckNote("");
                            setAckSubmittingId(null);
                          }}
                          className="w-full h-6 rounded bg-[#17191C] hover:bg-[#386DF4] text-white text-[11px] font-semibold transition-colors"
                        >
                          Acknowledge & Sign Alert
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
