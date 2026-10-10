"use client";

import React, { useState } from "react";
import { X, Plus, Sparkles, Activity, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Patient, VisitCreate, MeasurementCreate } from "@/types/clinical";

interface AddVisitModalProps {
  isOpen: boolean;
  patient: Patient;
  onClose: () => void;
  onSubmit: (data: VisitCreate) => Promise<void>;
}

export function AddVisitModal({
  isOpen,
  patient,
  onClose,
  onSubmit,
}: AddVisitModalProps) {
  const isIcu = patient.cohort_type === "INPATIENT_ACUTE_ICU";
  const nextVisitIndex = (patient.visits?.length || 0) + 1;
  const lastHours = patient.visits?.length
    ? patient.visits[patient.visits.length - 1].hours_from_baseline
    : 0;
  const nextHours = isIcu ? lastHours + 4 : lastHours + 8760; // +4h for ICU, +1 yr for outpatient

  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [hoursFromBaseline, setHoursFromBaseline] = useState<number>(nextHours);
  const [visitSummary, setVisitSummary] = useState(
    isIcu
      ? `ICU Step +${nextHours}h: Hemodynamic monitoring and laboratory reassessment.`
      : `Year ${patient.visits?.length || 0} Routine Outpatient Follow-up & Comprehensive Chemistry.`
  );
  const [noteText, setNoteText] = useState("");
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Presets
  const applyPresetNormal = () => {
    setMeasurements({
      cholesterol_total: 180,
      ldl_cholesterol: 95,
      hdl_cholesterol: 55,
      triglycerides: 110,
      glucose_fasting: 88,
      hba1c: 5.2,
      creatinine: 0.9,
      bun: 14,
      alt: 22,
      ast: 20,
      crp_hs: 0.8,
      wbc: 6.5,
      platelets: 240,
    });
  };

  const applyPresetMetabolic = () => {
    setMeasurements({
      cholesterol_total: 245,
      ldl_cholesterol: 165,
      hdl_cholesterol: 38,
      triglycerides: 280,
      glucose_fasting: 128,
      hba1c: 7.4,
      creatinine: 1.2,
      bun: 22,
      alt: 48,
      ast: 35,
      crp_hs: 4.8,
      wbc: 8.2,
      platelets: 290,
    });
    setVisitSummary("Outpatient Follow-up: Marked elevation in triglycerides and fasting hyperglycemia.");
  };

  const applyPresetCardiac = () => {
    setMeasurements({
      cholesterol_total: 230,
      ldl_cholesterol: 155,
      hdl_cholesterol: 35,
      triglycerides: 240,
      creatinine: 1.4,
      bun: 26,
      crp_hs: 6.2,
      wbc: 9.8,
      platelets: 260,
    });
    setVisitSummary("Cardiovascular Clinic: Recurrent dyspnea on exertion with elevated inflammatory markers.");
  };

  const applyPresetIcuSepsis = () => {
    setMeasurements({
      lactate: 3.4,
      wbc: 18.5,
      platelets: 110,
      creatinine: 2.1,
      bun: 42,
      map: 64,
      pao2_fio2: 195,
      glucose_fasting: 165,
    });
    setVisitSummary(`ICU Day 2 (+${hoursFromBaseline}h): Persistent hyperlactatemia, declining platelet counts, and oliguria.`);
    setNoteText(
      "PHYSICIAN ICU ROUNDS:\nPatient remains intubated and ventilated. Blood pressures stabilized on norepinephrine at 0.12 mcg/kg/min. Arterial blood gas shows metabolic acidosis with compensatory tachypnea. Broad spectrum IV antibiotics continued."
    );
  };

  const labDefinitions: Array<{
    name: string;
    label: string;
    unit: string;
    ref_low: number;
    ref_high: number;
  }> = isIcu
    ? [
        { name: "lactate", label: "Lactate", unit: "mmol/L", ref_low: 0.5, ref_high: 2.0 },
        { name: "wbc", label: "White Blood Cells (WBC)", unit: "10^9/L", ref_low: 4.5, ref_high: 11.0 },
        { name: "platelets", label: "Platelets", unit: "10^9/L", ref_low: 150, ref_high: 400 },
        { name: "creatinine", label: "Creatinine", unit: "mg/dL", ref_low: 0.7, ref_high: 1.3 },
        { name: "bun", label: "BUN", unit: "mg/dL", ref_low: 7, ref_high: 20 },
        { name: "map", label: "Mean Arterial Pressure (MAP)", unit: "mmHg", ref_low: 65, ref_high: 100 },
        { name: "pao2_fio2", label: "PaO2 / FiO2 Ratio", unit: "ratio", ref_low: 300, ref_high: 500 },
        { name: "glucose_fasting", label: "Blood Glucose", unit: "mg/dL", ref_low: 70, ref_high: 140 },
      ]
    : [
        { name: "cholesterol_total", label: "Total Cholesterol", unit: "mg/dL", ref_low: 125, ref_high: 200 },
        { name: "ldl_cholesterol", label: "LDL Cholesterol", unit: "mg/dL", ref_low: 50, ref_high: 100 },
        { name: "hdl_cholesterol", label: "HDL Cholesterol", unit: "mg/dL", ref_low: 40, ref_high: 60 },
        { name: "triglycerides", label: "Triglycerides", unit: "mg/dL", ref_low: 50, ref_high: 150 },
        { name: "glucose_fasting", label: "Fasting Glucose", unit: "mg/dL", ref_low: 70, ref_high: 99 },
        { name: "hba1c", label: "HbA1c", unit: "%", ref_low: 4.0, ref_high: 5.6 },
        { name: "creatinine", label: "Creatinine", unit: "mg/dL", ref_low: 0.7, ref_high: 1.3 },
        { name: "bun", label: "Blood Urea Nitrogen", unit: "mg/dL", ref_low: 7, ref_high: 20 },
        { name: "alt", label: "ALT", unit: "U/L", ref_low: 7, ref_high: 56 },
        { name: "ast", label: "AST", unit: "U/L", ref_low: 10, ref_high: 40 },
        { name: "crp_hs", label: "hs-CRP", unit: "mg/L", ref_low: 0.0, ref_high: 3.0 },
        { name: "wbc", label: "WBC", unit: "10^9/L", ref_low: 4.5, ref_high: 11.0 },
        { name: "platelets", label: "Platelets", unit: "10^9/L", ref_low: 150, ref_high: 400 },
      ];

  const handleInputChange = (featureName: string, valStr: string) => {
    if (valStr === "") {
      const copy = { ...measurements };
      delete copy[featureName];
      setMeasurements(copy);
    } else {
      setMeasurements((prev) => ({
        ...prev,
        [featureName]: parseFloat(valStr),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const measurementsList: MeasurementCreate[] = Object.entries(measurements).map(
      ([key, val]) => {
        const def = labDefinitions.find((d) => d.name === key);
        return {
          feature_name: key,
          feature_category: "routine_lab",
          value: val,
          unit: def?.unit || "",
          ref_low: def?.ref_low,
          ref_high: def?.ref_high,
          is_synthetic: false,
        };
      }
    );

    const visitPayload: VisitCreate = {
      visit_index: nextVisitIndex,
      visit_date: visitDate,
      hours_from_baseline: Number(hoursFromBaseline),
      visit_summary: visitSummary.trim() || undefined,
      measurements: measurementsList,
      clinical_notes: noteText.trim()
        ? [
            {
              step_hour: Number(hoursFromBaseline),
              note_type: isIcu ? "ICU_PROGRESS_NOTE" : "OUTPATIENT_PROGRESS",
              note_text: noteText.trim(),
            },
          ]
        : [],
    };

    try {
      await onSubmit(visitPayload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record encounter.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Record Clinical Encounter #{nextVisitIndex}
              </h3>
              <p className="text-xs text-slate-500">
                Patient: <strong className="text-slate-800">{patient.full_name}</strong> ({patient.mrn})
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

        {/* Preset Quick Fill Buttons */}
        <div className="bg-slate-50 p-3 px-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Lab Panel Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={applyPresetNormal}
              className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium hover:bg-emerald-100 transition"
            >
              Normal Panel
            </button>
            <button
              type="button"
              onClick={applyPresetMetabolic}
              className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium hover:bg-amber-100 transition"
            >
              High Lipids / Metabolic
            </button>
            <button
              type="button"
              onClick={applyPresetCardiac}
              className="text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 font-medium hover:bg-indigo-100 transition"
            >
              Cardiovascular Alert
            </button>
            {isIcu && (
              <button
                type="button"
                onClick={applyPresetIcuSepsis}
                className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 font-medium hover:bg-rose-100 transition"
              >
                Septic Deterioration
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* Encounter Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Encounter Date</label>
              <Input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                Hours from Baseline (h)
              </label>
              <Input
                type="number"
                step="any"
                value={hoursFromBaseline}
                onChange={(e) => setHoursFromBaseline(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Encounter Summary</label>
            <Input
              value={visitSummary}
              onChange={(e) => setVisitSummary(e.target.value)}
              placeholder="e.g. Annual follow up, Routine metabolic monitoring..."
            />
          </div>

          {/* Lab Entry Wizard Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-indigo-600" />
                Laboratory Test Entries ({Object.keys(measurements).length} filled)
              </h4>
              <span className="text-[11px] text-slate-400">
                Leave empty for unobserved / missing markers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1">
              {labDefinitions.map((lab) => {
                const currentVal = measurements[lab.name];
                const isOutOfRange =
                  currentVal !== undefined &&
                  (currentVal < lab.ref_low || currentVal > lab.ref_high);

                return (
                  <div
                    key={lab.name}
                    className={`p-2.5 rounded-lg border flex flex-col justify-between transition ${
                      currentVal !== undefined
                        ? isOutOfRange
                          ? "bg-rose-50/50 border-rose-200"
                          : "bg-emerald-50/50 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-slate-800 text-[11px]">
                        {lab.label}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        [{lab.ref_low} – {lab.ref_high} {lab.unit}]
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="any"
                        placeholder="Not tested"
                        value={currentVal !== undefined ? currentVal : ""}
                        onChange={(e) => handleInputChange(lab.name, e.target.value)}
                        className="h-8 text-xs font-mono bg-white"
                      />
                      <span className="text-[11px] text-slate-500 font-medium w-14 shrink-0">
                        {lab.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Narrative Note */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              Clinical Narrative Progress Note (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Enter physician assessment, nursing notes, hemodynamic remarks, or discharge plan..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {isSubmitting ? "Recording Encounter..." : "Save Encounter & Labs"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
