"use client";

import React, { useState } from "react";
import { UserPlus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PatientCreate, CohortType } from "@/types/clinical";

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PatientCreate) => Promise<void>;
}

export function NewPatientModal({
  isOpen,
  onClose,
  onSubmit,
}: NewPatientModalProps) {
  const [mrn, setMrn] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number>(55);
  const [sex, setSex] = useState<"M" | "F">("M");
  const [cohortType, setCohortType] = useState<CohortType>("OUTPATIENT_CHRONIC");
  const [historySummary, setHistorySummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrn.trim() || !fullName.trim()) {
      setError("MRN and Patient Name are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        mrn: mrn.trim(),
        full_name: fullName.trim(),
        age: Number(age),
        sex,
        cohort_type: cohortType,
        clinical_history_summary: historySummary.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create patient.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const prefillOutpatient = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setMrn(`MRN-CV-${rand}`);
    setFullName("Charles E. Montgomery");
    setAge(62);
    setSex("M");
    setCohortType("OUTPATIENT_CHRONIC");
    setHistorySummary(
      "62yo male with borderline hypertension, elevated baseline LDL, and mild family history of ischemic cardiomyopathy."
    );
  };

  const prefillIcu = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setMrn(`MRN-ICU-${rand}`);
    setFullName("Sarah Jenkins");
    setAge(58);
    setSex("F");
    setCohortType("INPATIENT_ACUTE_ICU");
    setHistorySummary(
      "58yo female admitted to Medical ICU with urosepsis, refractory hypotension on vasopressor support, and acute kidney injury."
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-[#FFFFFF] border border-[#E9EBEF] text-[#17191C] p-6 rounded-lg">
        <DialogHeader className="pb-3 border-b border-[#E9EBEF]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-[#386DF4] text-white flex items-center justify-center shrink-0">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[#17191C]">
                Enroll New Patient Record
              </DialogTitle>
              <DialogDescription className="text-xs text-[#667085] mt-0.5">
                Register a patient into the PULSE longitudinal clinical database.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Presets Bar */}
        <div className="bg-[#FAFAFB] p-2.5 rounded-md border border-[#E9EBEF] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-[#667085] flex items-center gap-1 text-[11px]">
            <Sparkles className="h-3 w-3 text-[#386DF4]" />
            Test Scenarios:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prefillOutpatient}
              className="h-6 px-2 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#386DF4] border border-[#E9EBEF] rounded transition-colors"
            >
              Preset: Outpatient CV
            </button>
            <button
              type="button"
              onClick={prefillIcu}
              className="h-6 px-2 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#C2414B] border border-[#E9EBEF] rounded transition-colors"
            >
              Preset: ICU Sepsis
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-2">
          {error && (
            <div className="p-2.5 bg-[#C2414B]/10 border border-[#C2414B]/20 text-[#C2414B] rounded-md text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-[#17191C]">Medical Record Number (MRN) *</label>
              <input
                placeholder="e.g. MRN-CV-10029"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                required
                className="w-full h-8 px-2.5 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md font-mono text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-[#17191C]">Patient Full Name *</label>
              <input
                placeholder="e.g. Eleanor Vance"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full h-8 px-2.5 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-[#17191C]">Age (years)</label>
              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                required
                className="w-full h-8 px-2.5 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md font-mono text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-[#17191C]">Biological Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as "M" | "F")}
                className="w-full h-8 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md px-2 text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-medium text-[#17191C]">Care Cohort</label>
              <select
                value={cohortType}
                onChange={(e) => setCohortType(e.target.value as CohortType)}
                className="w-full h-8 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md px-2 text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
              >
                <option value="OUTPATIENT_CHRONIC">Outpatient Omics</option>
                <option value="INPATIENT_ACUTE_ICU">Inpatient ICU</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[#17191C]">Clinical History Summary</label>
            <textarea
              rows={3}
              placeholder="Baseline conditions, comorbidities, or acute reason for monitoring..."
              value={historySummary}
              onChange={(e) => setHistorySummary(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E9EBEF] rounded-md p-2.5 text-xs text-[#17191C] focus:border-[#386DF4] outline-none resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-[#E9EBEF]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 px-3 text-xs font-medium text-[#667085] hover:text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-8 px-3.5 bg-[#386DF4] hover:bg-[#2F5ECC] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition"
            >
              {isSubmitting ? "Enrolling..." : "Enroll Patient"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
