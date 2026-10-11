"use client";

import React from "react";
import { PlusCircle, Calendar, FileText, Activity, Dna, Clock } from "lucide-react";
import { Patient } from "@/types/clinical";

interface TimelineNotesViewProps {
  patient: Patient;
  onOpenAddVisit: () => void;
}

export function TimelineNotesView({
  patient,
  onOpenAddVisit,
}: TimelineNotesViewProps) {
  const visits = patient.visits || [];
  const sortedVisits = [...visits].sort((a, b) => b.visit_index - a.visit_index);

  if (sortedVisits.length === 0) {
    return (
      <div className="bg-[#FFFFFF] rounded-lg p-12 border border-[#E9EBEF] text-center space-y-3">
        <Calendar className="h-8 w-8 text-[#98A2B3] mx-auto stroke-[1.5]" />
        <div>
          <h3 className="text-sm font-semibold text-[#17191C]">No Recorded Encounters</h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto mt-1">
            Log an outpatient clinical visit or ICU observation timepoint with routine blood panels.
          </p>
        </div>
        <button
          onClick={onOpenAddVisit}
          className="h-8 px-3.5 bg-[#386DF4] hover:bg-[#2F5ECC] text-white rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Add First Encounter</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E9EBEF]">
        <div>
          <h3 className="text-sm font-semibold text-[#17191C]">
            Chronological Encounters & Clinical Notes
          </h3>
          <p className="text-xs text-[#667085]">
            {visits.length} recorded timepoints with multimodal observations
          </p>
        </div>
        <button
          onClick={onOpenAddVisit}
          className="h-8 px-3 text-xs font-semibold text-white bg-[#386DF4] hover:bg-[#2F5ECC] rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Add Encounter</span>
        </button>
      </div>

      {/* Encounters Timeline List */}
      <div className="space-y-4">
        {sortedVisits.map((v) => {
          const notes = v.clinical_notes || [];
          const measurements = v.measurements || [];
          const syntheticCount = measurements.filter((m) => m.is_synthetic).length;
          const routineCount = measurements.filter((m) => !m.is_synthetic).length;

          return (
            <div
              key={v.id || v.visit_index}
              className="border border-[#E9EBEF] rounded-lg bg-[#FFFFFF] overflow-hidden"
            >
              {/* Encounter Header Bar */}
              <div className="p-4 bg-[#FAFAFB] border-b border-[#E9EBEF] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded bg-[#386DF4] text-white flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    #{v.visit_index}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#17191C]">
                        Encounter #{v.visit_index}
                      </span>
                      <span className="text-xs font-mono text-[#667085]">
                        {v.visit_date}
                      </span>
                    </div>
                    {v.hours_from_baseline > 0 && (
                      <span className="text-[11px] font-mono text-[#98A2B3]">
                        +{v.hours_from_baseline}h elapsed from baseline
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-[#0F766E]/10 text-[#0F766E] font-medium text-[11px]">
                    {routineCount} Labs
                  </span>
                  {syntheticCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-[#7856A8]/10 text-[#7856A8] font-medium text-[11px]">
                      {syntheticCount} Omics
                    </span>
                  )}
                </div>
              </div>

              {/* Encounter Body */}
              <div className="p-5 space-y-4">
                {/* Summary */}
                {v.visit_summary && (
                  <p className="text-xs text-[#667085] leading-relaxed bg-[#FAFAFB] p-3 rounded border border-[#E9EBEF]">
                    {v.visit_summary}
                  </p>
                )}

                {/* Clinical Notes */}
                {notes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3] flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Physician Progress Notes ({notes.length})</span>
                    </span>
                    <div className="space-y-2">
                      {notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 rounded bg-[#FAFAFB] border border-[#E9EBEF] text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] text-[#98A2B3] font-mono">
                            <span className="uppercase font-semibold text-[#667085]">
                              {n.note_type}
                            </span>
                            <span>{new Date(n.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-[#17191C] leading-relaxed">{n.note_text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Measurements Table */}
                {measurements.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3] flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      <span>Recorded Laboratory Measurements ({measurements.length})</span>
                    </span>
                    <div className="border border-[#E9EBEF] rounded overflow-hidden">
                      <table className="w-full text-left text-xs divide-y divide-[#E9EBEF]">
                        <thead className="bg-[#FAFAFB] text-[#667085] text-[11px] uppercase tracking-wider font-medium">
                          <tr>
                            <th className="py-2 px-3">Biomarker</th>
                            <th className="py-2 px-3">Modality</th>
                            <th className="py-2 px-3 text-right">Value</th>
                            <th className="py-2 px-3">Reference Range</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9EBEF]">
                          {measurements.map((m) => {
                            const val = m.value !== undefined ? m.value : (m as any).feature_value;
                            return (
                              <tr key={m.id || m.feature_name} className="hover:bg-[#FAFAFB]">
                                <td className="py-2 px-3 font-semibold text-[#17191C]">
                                  {m.feature_name}
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                      m.is_synthetic
                                        ? "bg-[#7856A8]/10 text-[#7856A8]"
                                        : "bg-[#0F766E]/10 text-[#0F766E]"
                                    }`}
                                  >
                                    {m.is_synthetic ? "Synthetic Omics" : "Lab Measured"}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-[#17191C]">
                                  {val != null ? Number(val).toFixed(2) : "—"} {m.unit}
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px] text-[#667085]">
                                  {m.ref_low != null && m.ref_high != null
                                    ? `${m.ref_low} – ${m.ref_high} ${m.unit}`
                                    : "Nominal"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
