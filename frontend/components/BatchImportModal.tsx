"use client";

import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { BatchImportResult } from "@/types/clinical";

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SAMPLE_OUTPATIENT_CSV = `mrn,name,age,sex,cohort_type,visit_date,cholesterol,ldl,tg,glucose,hba1c
MRN-OP-901,Eleanor Vance,61,F,OUTPATIENT_CHRONIC,2025-01-10,245,165,210,118,6.9
MRN-OP-901,Eleanor Vance,61,F,OUTPATIENT_CHRONIC,2025-07-15,260,178,225,124,7.1
MRN-OP-901,Eleanor Vance,61,F,OUTPATIENT_CHRONIC,2026-01-20,272,189,240,132,7.4
MRN-OP-902,Arthur Pendelton,67,M,OUTPATIENT_CHRONIC,2025-03-01,210,135,180,105,6.2
MRN-OP-902,Arthur Pendelton,67,M,OUTPATIENT_CHRONIC,2026-02-15,225,148,195,112,6.5`;

const SAMPLE_ICU_CSV = `mrn,name,age,sex,cohort_type,visit_date,lactate,sofa_score,creatinine,map,heart_rate
MRN-ICU-801,Dmitri Volkov,54,M,INPATIENT_ACUTE_ICU,2026-03-01 08:00,2.1,4,1.4,75,102
MRN-ICU-801,Dmitri Volkov,54,M,INPATIENT_ACUTE_ICU,2026-03-01 16:00,3.8,7,2.1,62,118
MRN-ICU-801,Dmitri Volkov,54,M,INPATIENT_ACUTE_ICU,2026-03-02 00:00,5.2,11,2.8,55,130
MRN-ICU-802,Sarah Jenkins,62,F,INPATIENT_ACUTE_ICU,2026-03-02 02:00,1.8,3,1.1,80,95
MRN-ICU-802,Sarah Jenkins,62,F,INPATIENT_ACUTE_ICU,2026-03-02 10:00,2.0,3,1.2,78,92`;

export function BatchImportModal({
  isOpen,
  onClose,
  onSuccess,
}: BatchImportModalProps) {
  const [csvContent, setCsvContent] = useState("");
  const [autoRunPulse, setAutoRunPulse] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvContent(content);
        setResult(null);
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setError("Please paste or upload CSV laboratory data.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.importCsv(csvContent, autoRunPulse);
      setResult(res);
      if (res.patients_created > 0 || res.visits_created > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to import CSV data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCsvContent("");
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Batch CSV Electronic Health Record Ingestion
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                PULSE multi-patient longitudinal lab ingestion pipeline with column auto-mapping.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Preset Sample Data Actions */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Pre-built Evaluation Cohort Presets:
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCsvContent(SAMPLE_OUTPATIENT_CSV);
                  setResult(null);
                  setError(null);
                }}
                className="h-7 text-xs bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                Outpatient Omics
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCsvContent(SAMPLE_ICU_CSV);
                  setResult(null);
                  setError(null);
                }}
                className="h-7 text-xs bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                ICU Sepsis
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Auto-detects columns: <code className="text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded">mrn</code>,{" "}
            <code className="text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded">name</code>,{" "}
            <code className="text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded">age</code>,{" "}
            <code className="text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded">sex</code>,{" "}
            <code className="text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded">cohort_type</code>,{" "}
            <code className="text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded">visit_date</code>, plus any lab analytes.
          </p>
        </div>

        {/* CSV Upload & Editor Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-700">
              CSV Content / Raw Text
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                className="hidden"
                id="batch-csv-upload"
              />
              <label
                htmlFor="batch-csv-upload"
                className="cursor-pointer inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload CSV File
              </label>
              {csvContent && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-slate-600 ml-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={8}
            placeholder={`mrn,name,age,sex,cohort_type,visit_date,cholesterol,ldl,tg,glucose,hba1c\nMRN-001,John Doe,55,M,OUTPATIENT_CHRONIC,2025-01-10,220,140,180,105,6.1`}
            className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-y"
          />

          <div className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              id="auto-run-pulse"
              checked={autoRunPulse}
              onChange={(e) => setAutoRunPulse(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="auto-run-pulse" className="text-slate-700 font-medium cursor-pointer">
              Automatically execute PULSE synthesis & calibrated risk forecasting for imported patients
            </label>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Notification */}
        {result && (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Batch Ingestion Successful
              </span>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                Processed
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-white rounded-lg border border-emerald-100 shadow-xs">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Patients</div>
                <div className="text-base font-bold text-slate-900">{result.patients_created}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100 shadow-xs">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Visits</div>
                <div className="text-base font-bold text-slate-900">{result.visits_created}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100 shadow-xs">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Measurements</div>
                <div className="text-base font-bold text-slate-900">{result.measurements_created}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100 shadow-xs">
                <div className="text-[10px] text-slate-500 uppercase font-medium">PULSE Projections</div>
                <div className="text-base font-bold text-indigo-700">{result.pulse_runs_triggered}</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <div className="font-semibold mb-1">Warnings / Skipped Records:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-slate-600"
          >
            {result ? "Close" : "Cancel"}
          </Button>

          <Button
            type="button"
            onClick={handleImport}
            disabled={isSubmitting || !csvContent.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Ingesting Records...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Execute Batch Import</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
