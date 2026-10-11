"use client";

import React, { useState } from "react";
import { Clock, FileText, ChevronDown, ChevronRight, Activity, PlusCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Patient, Visit } from "@/types/clinical";

interface TimelineNotesViewProps {
  patient: Patient;
  onOpenAddVisit: () => void;
}

export function TimelineNotesView({
  patient,
  onOpenAddVisit,
}: TimelineNotesViewProps) {
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(
    patient.visits.length > 0 ? patient.visits[patient.visits.length - 1].id : null
  );

  const visits = patient.visits || [];

  const toggleExpand = (id: string) => {
    setExpandedVisitId((prev) => (prev === id ? null : id));
  };

  if (visits.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 border border-slate-200 text-center space-y-4">
        <FileText className="h-10 w-10 text-slate-300 mx-auto" />
        <div>
          <h3 className="text-base font-bold text-slate-800">No Clinical Encounters Recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Build this patient&apos;s longitudinal trajectory by recording routine visits, laboratory blood draws, or ICU time steps.
          </p>
        </div>
        <Button onClick={onOpenAddVisit} size="sm" className="bg-indigo-600 text-white">
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Add First Encounter
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Chronological Encounters & Clinical Notes ({visits.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential historical trajectory used as temporal prior (Z_P) by the PULSE generative engine.
          </p>
        </div>
        <Button
          onClick={onOpenAddVisit}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Add Encounter / Labs
        </Button>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {visits.map((visit, idx) => {
          const isExpanded = visit.id === expandedVisitId;
          const measurements = visit.measurements || [];
          const notes = visit.clinical_notes || [];
          const hasLatent = !!visit.latent_state;

          return (
            <div key={visit.id} className="relative group">
              {/* Timeline Dot */}
              <div
                className={`absolute -left-6 top-4 h-5 w-5 rounded-full border-2 bg-white flex items-center justify-center transition ${
                  hasLatent ? "border-purple-600 text-purple-600" : "border-slate-400 text-slate-400"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    hasLatent ? "bg-purple-600" : "bg-slate-400"
                  }`}
                />
              </div>

              {/* Encounter Card */}
              <Card
                className={`border-slate-200 bg-white transition hover:border-slate-300 ${
                  isExpanded ? "ring-1 ring-slate-300 shadow-xs" : ""
                }`}
              >
                <CardHeader
                  onClick={() => toggleExpand(visit.id)}
                  className="cursor-pointer select-none pb-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs font-mono">
                        #{visit.visit_index}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>{visit.visit_date}</span>
                          <span className="text-xs font-normal text-slate-500">
                            ({visit.hours_from_baseline > 0 ? `+${visit.hours_from_baseline}h from baseline` : "Baseline Encounter"})
                          </span>
                        </CardTitle>
                        {visit.visit_summary && (
                          <CardDescription className="text-xs text-slate-500 mt-0.5">
                            {visit.visit_summary}
                          </CardDescription>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-500">
                        {measurements.length} Labs • {notes.length} Notes
                      </span>
                      {hasLatent && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-purple-50 text-purple-700 border-purple-200"
                        >
                          Z_16 Encoded
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-2 border-t border-slate-100 space-y-4">
                    {/* Narrative Clinical Notes */}
                    {notes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-600" />
                          Clinical Progress Notes
                        </h4>
                        <div className="space-y-2">
                          {notes.map((note) => (
                            <div
                              key={note.id}
                              className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                <span className="font-semibold text-slate-600 uppercase">
                                  [{note.note_type}]
                                </span>
                                <span>Hour: +{note.step_hour}h</span>
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed font-sans">
                                {note.note_text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Labs and Biomarkers Table */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-indigo-600" />
                        Recorded Measurements ({measurements.length})
                      </h4>
                      {measurements.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No lab values entered for this encounter.</p>
                      ) : (
                        <div className="overflow-x-auto max-h-60 border border-slate-200 rounded-lg">
                          <Table>
                            <TableHeader className="bg-slate-50 sticky top-0">
                              <TableRow>
                                <TableHead className="font-bold text-slate-700">Biomarker</TableHead>
                                <TableHead className="font-bold text-slate-700">Category</TableHead>
                                <TableHead className="font-bold text-slate-700">Value</TableHead>
                                <TableHead className="font-bold text-slate-700">Source</TableHead>
                                <TableHead className="font-bold text-slate-700">Ref Range</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="font-mono text-xs">
                              {measurements.map((m) => {
                                const val = m.value !== undefined ? m.value : (m as any).feature_value;
                                const displayVal = typeof val === "number" ? val.toFixed(2) : (val != null ? String(val) : "—");
                                const category = m.feature_category || (m as any).modality || "routine_labs";
                                const refLow = m.ref_low !== undefined ? m.ref_low : (m as any).reference_low;
                                const refHigh = m.ref_high !== undefined ? m.ref_high : (m as any).reference_high;

                                return (
                                  <TableRow key={m.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium font-sans text-slate-800">
                                      {m.feature_name}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-[11px]">
                                      {category}
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-900">
                                      {displayVal} {m.unit || ""}
                                    </TableCell>
                                    <TableCell>
                                      {m.is_synthetic ? (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] font-bold text-purple-700 bg-purple-50 border-purple-200"
                                        >
                                          Synthesized
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200"
                                        >
                                          Observed
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-[11px]">
                                      {refLow ?? "—"} – {refHigh ?? "—"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
