"use client";

import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-[#FFFFFF] border border-[#E9EBEF] text-[#17191C] p-6 rounded-lg">
        <DialogHeader className="pb-3 border-b border-[#E9EBEF]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-[#386DF4] text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[#17191C]">
                Batch EHR Laboratory Ingestion
              </DialogTitle>
              <DialogDescription className="text-xs text-[#667085] mt-0.5">
                Multi-patient longitudinal record ingestion with automated column alignment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Preset Sample Data Actions */}
        <div className="bg-[#FAFAFB] p-3 rounded-md border border-[#E9EBEF] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#17191C] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#386DF4]" />
              Evaluation Cohort Presets:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCsvContent(SAMPLE_OUTPATIENT_CSV);
                  setResult(null);
                  setError(null);
                }}
                className="h-6 px-2 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#386DF4] border border-[#E9EBEF] rounded transition-colors"
              >
                Preset: Outpatient Omics
              </button>
              <button
                type="button"
                onClick={() => {
                  setCsvContent(SAMPLE_ICU_CSV);
                  setResult(null);
                  setError(null);
                }}
                className="h-6 px-2 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#C2414B] border border-[#E9EBEF] rounded transition-colors"
              >
                Preset: ICU Sepsis
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#667085] leading-relaxed">
            Auto-detects columns: <code className="text-[#17191C] bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E9EBEF]">mrn</code>,{" "}
            <code className="text-[#17191C] bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E9EBEF]">name</code>,{" "}
            <code className="text-[#17191C] bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E9EBEF]">age</code>,{" "}
            <code className="text-[#17191C] bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E9EBEF]">sex</code>,{" "}
            <code className="text-[#17191C] bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E9EBEF]">cohort_type</code>,{" "}
            <code className="text-[#17191C] bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#E9EBEF]">visit_date</code>, plus clinical lab analytes.
          </p>
        </div>

        {/* CSV Upload & Editor Area */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-[#17191C]">
              CSV Raw Content
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
                className="cursor-pointer inline-flex items-center gap-1 text-xs text-[#386DF4] hover:underline font-medium"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload File (.csv)
              </label>
              {csvContent && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-[#98A2B3] hover:text-[#C2414B] ml-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={7}
            placeholder={`mrn,name,age,sex,cohort_type,visit_date,cholesterol,ldl,tg,glucose,hba1c\nMRN-001,John Doe,55,M,OUTPATIENT_CHRONIC,2025-01-10,220,140,180,105,6.1`}
            className="w-full font-mono text-xs p-3 rounded-md border border-[#E9EBEF] bg-[#FFFFFF] focus:border-[#386DF4] outline-none transition-all resize-y"
          />

          <div className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              id="auto-run-pulse"
              checked={autoRunPulse}
              onChange={(e) => setAutoRunPulse(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#E9EBEF] text-[#386DF4] accent-[#386DF4]"
            />
            <label htmlFor="auto-run-pulse" className="text-[#667085] font-medium cursor-pointer">
              Automatically trigger PULSE synthesis & multi-disease forecasting for imported patients
            </label>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-[#C2414B]/10 border border-[#C2414B]/20 rounded-md flex items-center gap-2 text-xs text-[#C2414B]">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#C2414B]" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Notification */}
        {result && (
          <div className="p-4 bg-[#15803D]/5 border border-[#15803D]/20 rounded-md space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#15803D] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Batch Ingestion Successful
              </span>
              <span className="font-mono text-[10px] font-semibold text-[#15803D] bg-[#15803D]/10 px-2 py-0.5 rounded">
                Processed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-white rounded border border-[#E9EBEF]">
                <div className="text-[10px] text-[#667085] uppercase">Patients</div>
                <div className="text-base font-bold font-mono text-[#17191C]">{result.patients_created}</div>
              </div>
              <div className="p-2 bg-white rounded border border-[#E9EBEF]">
                <div className="text-[10px] text-[#667085] uppercase">Visits</div>
                <div className="text-base font-bold font-mono text-[#17191C]">{result.visits_created}</div>
              </div>
              <div className="p-2 bg-white rounded border border-[#E9EBEF]">
                <div className="text-[10px] text-[#667085] uppercase">Observations</div>
                <div className="text-base font-bold font-mono text-[#17191C]">{result.measurements_created}</div>
              </div>
              <div className="p-2 bg-white rounded border border-[#E9EBEF]">
                <div className="text-[10px] text-[#667085] uppercase">PULSE Synthesized</div>
                <div className="text-base font-bold font-mono text-[#386DF4]">{result.pulse_runs_triggered}</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-2 text-[11px] text-[#B7791F] bg-[#B7791F]/10 p-2 rounded border border-[#B7791F]/20">
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

        <DialogFooter className="pt-3 border-t border-[#E9EBEF] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 text-xs font-medium text-[#667085] hover:text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors"
          >
            {result ? "Close" : "Cancel"}
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={isSubmitting || !csvContent.trim()}
            className="h-8 px-3.5 bg-[#386DF4] hover:bg-[#2F5ECC] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Ingesting...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Execute Ingestion</span>
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
