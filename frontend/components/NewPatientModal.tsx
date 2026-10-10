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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Enroll New Patient Record
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Register a patient into the PULSE longitudinal database.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Presets Bar */}
        <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-indigo-900 flex items-center gap-1 text-[11px]">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Quick Test Scenarios:
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={prefillOutpatient}
              className="h-7 text-xs bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              Preset: Outpatient CV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={prefillIcu}
              className="h-7 text-xs bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              Preset: ICU Sepsis
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Medical Record Number (MRN) *</label>
              <Input
                placeholder="e.g. MRN-CV-10029"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                required
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Patient Full Name *</label>
              <Input
                placeholder="e.g. Eleanor Vance"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Age (years)</label>
              <Input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Biological Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as "M" | "F")}
                className="w-full h-8 bg-slate-50 border border-slate-300 rounded-md px-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Care Cohort</label>
              <select
                value={cohortType}
                onChange={(e) => setCohortType(e.target.value as CohortType)}
                className="w-full h-8 bg-slate-50 border border-slate-300 rounded-md px-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="OUTPATIENT_CHRONIC">Outpatient Omics</option>
                <option value="INPATIENT_ACUTE_ICU">Inpatient ICU</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Clinical History Summary</label>
            <textarea
              rows={3}
              placeholder="Baseline conditions, comorbidities, or acute reason for monitoring..."
              value={historySummary}
              onChange={(e) => setHistorySummary(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {isSubmitting ? "Enrolling Patient..." : "Enroll Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
