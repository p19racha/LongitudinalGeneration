"use client";

import React, { useState } from "react";
import { Plus, Sparkles, Activity, FileText } from "lucide-react";
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
  const nextHours = isIcu ? lastHours + 4 : lastHours + 8760;

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Record Clinical Encounter #{nextVisitIndex}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Patient: <strong className="text-slate-800">{patient.full_name}</strong> ({patient.mrn})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Preset Quick Fill Buttons */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Lab Panel Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyPresetNormal}
              className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            >
              Normal Panel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyPresetMetabolic}
              className="h-7 text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
            >
              High Lipids / Metabolic
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyPresetCardiac}
              className="h-7 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
            >
              Cardiovascular Alert
            </Button>
            {isIcu && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyPresetIcuSepsis}
                className="h-7 text-xs bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
              >
                Septic Deterioration
              </Button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium text-xs">
              {error}
            </div>
          )}

          {/* Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Encounter Date</label>
              <Input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">
                Hours from Baseline (h)
              </label>
              <Input
                type="number"
                step="any"
                value={hoursFromBaseline}
                onChange={(e) => setHoursFromBaseline(Number(e.target.value))}
                required
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Encounter Summary</label>
            <Input
              value={visitSummary}
              onChange={(e) => setVisitSummary(e.target.value)}
              placeholder="e.g. Annual follow up, Routine metabolic monitoring..."
              className="text-xs"
            />
          </div>

          {/* Lab Entry Wizard Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Activity className="h-4 w-4 text-indigo-600" />
                Laboratory Test Entries ({Object.keys(measurements).length} filled)
              </span>
              <span className="text-[11px] text-slate-400">
                Leave blank for unobserved markers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1 border border-slate-200 rounded-lg">
              {labDefinitions.map((lab) => {
                const currentVal = measurements[lab.name];
                const isOutOfRange =
                  currentVal !== undefined &&
                  (currentVal < lab.ref_low || currentVal > lab.ref_high);

                return (
                  <div
                    key={lab.name}
                    className={`p-2 rounded-md border flex flex-col justify-between transition ${
                      currentVal !== undefined
                        ? isOutOfRange
                          ? "bg-rose-50/50 border-rose-200"
                          : "bg-emerald-50/50 border-emerald-200"
                        : "bg-slate-50/50 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-slate-800 text-[11px]">
                        {lab.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        [{lab.ref_low}–{lab.ref_high}]
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="any"
                        placeholder="Not tested"
                        value={currentVal !== undefined ? currentVal : ""}
                        onChange={(e) => handleInputChange(lab.name, e.target.value)}
                        className="h-7 text-xs font-mono bg-white"
                      />
                      <span className="text-[10px] text-slate-500 font-medium w-12 shrink-0">
                        {lab.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Narrative Note */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              Clinical Narrative Progress Note (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Enter physician assessment, nursing notes, or care plan..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
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
              {isSubmitting ? "Saving Encounter..." : "Save Encounter & Labs"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
