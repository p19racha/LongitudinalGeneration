"use client";

import React, { useState, useEffect } from "react";
import { Printer, FileText, Activity, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { Patient, ClinicalReport } from "@/types/clinical";

interface ReportModalProps {
  isOpen: boolean;
  patient: Patient;
  onClose: () => void;
}

export function ReportModal({
  isOpen,
  patient,
  onClose,
}: ReportModalProps) {
  const [report, setReport] = useState<ClinicalReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);

    api
      .getReport(patient.id)
      .then((data) => {
        setReport(data);
      })
      .catch((err) => {
        setError(err.message || "Failed to generate report.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, patient.id]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* Modal Controls Bar */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <span className="font-bold text-slate-800 text-sm">
              Clinical Decision Support Dossier Preview
            </span>
          </div>
          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Save as PDF</span>
          </Button>
        </div>

        {/* Report Content Body */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 bg-white">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <Activity className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Compiling clinical dossier and cross-modal latent synthesis...
              </p>
            </div>
          ) : error || !report ? (
            <div className="py-16 text-center text-rose-600 space-y-2">
              <ShieldAlert className="h-8 w-8 mx-auto" />
              <p className="font-bold text-sm">Failed to generate report</p>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          ) : (
            <div className="space-y-6 text-xs">
              {/* Report Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">
                    PULSE CLINICAL DECISION SUPPORT DOSSIER
                  </h1>
                  <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                    Nature Computational Science (2026) Architecture • Multi-Disease Prognostic Report
                  </p>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-600">
                  <p>Generated: {new Date().toLocaleDateString()}</p>
                  <p className="font-bold text-slate-900">MRN: {report.mrn}</p>
                </div>
              </div>

              {/* Patient Demographics Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Patient Name</span>
                  <span className="font-bold text-sm text-slate-900">{report.full_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Age / Sex</span>
                  <span className="font-bold text-sm text-slate-900">{report.age} yrs / {report.sex}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Clinical Cohort</span>
                  <span className="font-bold text-sm text-slate-900">{report.cohort_type.replace(/_/g, " ")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Longitudinal Depth</span>
                  <span className="font-bold text-sm text-slate-900">{report.total_visits} Encounters</span>
                </div>
              </div>

              {/* Baseline History */}
              {report.history && (
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Clinical Baseline Summary
                  </h3>
                  <p className="text-slate-700 bg-slate-50/50 p-2.5 rounded border border-slate-200 italic leading-relaxed">
                    {report.history}
                  </p>
                </div>
              )}

              {/* Risk Prognostic Scorecard */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Disease Prognostic Assessment (Latest Observation)
                </h3>
                {report.risk_scorecard.length === 0 ? (
                  <p className="text-slate-400 italic">No risk predictions computed.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {report.risk_scorecard.map((r, idx) => (
                      <div
                        key={idx}
                        className="p-3 border rounded-lg bg-slate-50/70 border-slate-200 space-y-1.5"
                      >
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-slate-900">
                            {r.disease.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <span
                            className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                              r.risk_category === "CRITICAL"
                                ? "bg-rose-600 text-white"
                                : r.risk_category === "HIGH"
                                ? "bg-amber-600 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {r.risk_percentage}% ({r.risk_category})
                          </span>
                        </div>
                        {r.top_drivers && r.top_drivers.length > 0 && (
                          <div className="text-[11px] text-slate-600 space-y-0.5 border-t border-slate-200 pt-1">
                            <span className="text-[10px] text-slate-400 font-semibold">Attribution:</span>
                            {r.top_drivers.map((d, dIdx) => (
                              <div key={dIdx} className="flex justify-between text-[10px]">
                                <span>{d.description}</span>
                                <span className="font-mono font-bold">
                                  {d.impact_score > 0 ? `+${d.impact_score.toFixed(2)}` : d.impact_score.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Synthesized Molecular Omics Panel via shadcn Table */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>PULSE Generative Molecular Omics Profile</span>
                  <span className="text-[10px] text-purple-700 font-mono">
                    95% Confidence Intervals Included
                  </span>
                </h3>
                {report.synthesized_biomarkers.length === 0 ? (
                  <p className="text-slate-400 italic">No synthesized molecular omics.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700">Synthesized Biomarker</TableHead>
                          <TableHead className="font-bold text-slate-700">Value</TableHead>
                          <TableHead className="font-bold text-slate-700">95% Confidence Interval</TableHead>
                          <TableHead className="font-bold text-slate-700">Reference Range</TableHead>
                          <TableHead className="font-bold text-slate-700">Evaluation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="font-mono text-[11px]">
                        {report.synthesized_biomarkers.map((b, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-bold font-sans text-slate-900">{b.feature}</TableCell>
                            <TableCell className="font-bold">{b.value.toFixed(2)} {b.unit}</TableCell>
                            <TableCell className="text-purple-800">[{b.ci_95[0].toFixed(2)}, {b.ci_95[1].toFixed(2)}]</TableCell>
                            <TableCell className="text-slate-500">{b.reference_range[0]}–{b.reference_range[1]} {b.unit}</TableCell>
                            <TableCell className="font-sans">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  b.status === "HIGH"
                                    ? "bg-rose-100 text-rose-800"
                                    : b.status === "LOW"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {b.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* SaMD Safety Notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[10px] text-amber-900 space-y-1">
                <span className="font-bold uppercase tracking-wider block">
                  Software as a Medical Device (SaMD) Notice & Safety Guardrails
                </span>
                <p className="leading-relaxed">
                  {report.samd_regulatory_notice}
                </p>
              </div>

              {/* Signature Line */}
              <div className="pt-8 border-t border-slate-300 flex justify-between items-end text-slate-500 text-[11px]">
                <div>
                  <p className="border-t border-slate-400 pt-1 w-64 text-center">
                    Attending Physician Signature
                  </p>
                </div>
                <div>
                  <p className="border-t border-slate-400 pt-1 w-48 text-center">
                    Date & Review Time
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
