"use client";

import React, { useState } from "react";
import { X, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Enroll New Patient</h3>
              <p className="text-xs text-slate-500">
                Register a patient profile into the PULSE longitudinal database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Prefill Templates */}
        <div className="bg-indigo-50/60 p-3 px-5 border-b border-indigo-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-indigo-900 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Quick Test Presets:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prefillOutpatient}
              className="text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-md border border-indigo-200 font-medium shadow-2xs hover:bg-indigo-50 transition"
            >
              Preset: Outpatient CV
            </button>
            <button
              type="button"
              onClick={prefillIcu}
              className="text-rose-700 hover:text-rose-900 bg-white px-2.5 py-1 rounded-md border border-rose-200 font-medium shadow-2xs hover:bg-rose-50 transition"
            >
              Preset: ICU Sepsis
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Medical Record Number (MRN) *</label>
              <Input
                placeholder="e.g. MRN-CV-10029"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                required
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Patient Full Name *</label>
              <Input
                placeholder="e.g. Eleanor Vance"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Age (years)</label>
              <Input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Biological Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as "M" | "F")}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Care Cohort</label>
              <select
                value={cohortType}
                onChange={(e) => setCohortType(e.target.value as CohortType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="OUTPATIENT_CHRONIC">Outpatient Omics</option>
                <option value="INPATIENT_ACUTE_ICU">Inpatient ICU</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Clinical History Summary</label>
            <textarea
              rows={3}
              placeholder="Clinical baseline notes, comorbidities, medications, or primary admission diagnosis..."
              value={historySummary}
              onChange={(e) => setHistorySummary(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {isSubmitting ? "Enrolling Patient..." : "Enroll Patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
