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
          modality: "routine_lab",
          feature_category: "routine_lab",
          feature_name: key,
          feature_value: val,
          value: val,
          unit: def?.unit || "",
          ref_low: def?.ref_low,
          ref_high: def?.ref_high,
          reference_low: def?.ref_low,
          reference_high: def?.ref_high,
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
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-[#FFFFFF] border border-[#E9EBEF] text-[#17191C] p-6 rounded-lg">
        <DialogHeader className="pb-3 border-b border-[#E9EBEF]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-[#386DF4] text-white flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[#17191C]">
                Record Clinical Encounter #{nextVisitIndex}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#667085] mt-0.5">
                Patient: <strong className="text-[#17191C]">{patient.full_name}</strong> ({patient.mrn})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Preset Quick Fill Buttons */}
        <div className="bg-[#FAFAFB] p-2.5 rounded-md border border-[#E9EBEF] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-[#667085] flex items-center gap-1 text-[11px]">
            <Sparkles className="h-3 w-3 text-[#386DF4]" />
            Lab Panel Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={applyPresetNormal}
              className="h-6 px-2 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#15803D] border border-[#E9EBEF] rounded transition-colors"
            >
              Normal Panel
            </button>
            <button
              type="button"
              onClick={applyPresetMetabolic}
              className="h-6 px-2 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#B7791F] border border-[#E9EBEF] rounded transition-colors"
            >
              High Lipids / Metabolic
            </button>
            <button
              type="button"
              onClick={applyPresetCardiac}
              className="h-6 px-2 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#386DF4] border border-[#E9EBEF] rounded transition-colors"
            >
              Cardiovascular Alert
            </button>
            {isIcu && (
              <button
                type="button"
                onClick={applyPresetIcuSepsis}
                className="h-6 px-2 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#C2414B] border border-[#E9EBEF] rounded transition-colors"
              >
                Septic Deterioration
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
          {error && (
            <div className="p-2.5 bg-[#C2414B]/10 border border-[#C2414B]/20 text-[#C2414B] rounded-md text-xs">
              {error}
            </div>
          )}

          {/* Timing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-[#17191C]">Encounter Date</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                className="w-full h-8 px-2.5 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-[#17191C]">
                Hours from Baseline (h)
              </label>
              <input
                type="number"
                step="any"
                value={hoursFromBaseline}
                onChange={(e) => setHoursFromBaseline(Number(e.target.value))}
                required
                className="w-full h-8 px-2.5 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md font-mono text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[#17191C]">Encounter Summary</label>
            <input
              value={visitSummary}
              onChange={(e) => setVisitSummary(e.target.value)}
              placeholder="e.g. Annual follow up, Routine metabolic monitoring..."
              className="w-full h-8 px-2.5 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
            />
          </div>

          {/* Lab Entry Wizard Grid */}
          <div className="space-y-2 pt-2 border-t border-[#E9EBEF]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#17191C] flex items-center gap-1.5 text-xs">
                <Activity className="h-3.5 w-3.5 text-[#386DF4]" />
                Laboratory Test Entries ({Object.keys(measurements).length} recorded)
              </span>
              <span className="text-[11px] text-[#98A2B3]">
                Leave blank for unobserved markers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-[#E9EBEF] rounded-md bg-[#FAFAFB]">
              {labDefinitions.map((lab) => {
                const currentVal = measurements[lab.name];
                const isOutOfRange =
                  currentVal !== undefined &&
                  (currentVal < lab.ref_low || currentVal > lab.ref_high);

                return (
                  <div
                    key={lab.name}
                    className={`p-2 rounded border flex flex-col justify-between transition-colors ${
                      currentVal !== undefined
                        ? isOutOfRange
                          ? "bg-[#C2414B]/5 border-[#C2414B]/30"
                          : "bg-[#15803D]/5 border-[#15803D]/30"
                        : "bg-[#FFFFFF] border-[#E9EBEF]"
                    }`}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-[#17191C] text-[11px]">
                        {lab.label}
                      </span>
                      <span className="text-[10px] text-[#98A2B3] font-mono">
                        [{lab.ref_low}–{lab.ref_high}]
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="Not tested"
                        value={currentVal !== undefined ? currentVal : ""}
                        onChange={(e) => handleInputChange(lab.name, e.target.value)}
                        className="h-6 px-2 text-xs font-mono bg-white border border-[#E9EBEF] rounded w-full focus:border-[#386DF4] outline-none"
                      />
                      <span className="text-[10px] text-[#667085] font-medium w-12 shrink-0">
                        {lab.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Narrative Note */}
          <div className="space-y-1 pt-2 border-t border-[#E9EBEF]">
            <label className="font-medium text-[#17191C] flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#386DF4]" />
              Clinical Narrative Progress Note (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Enter physician assessment, nursing notes, or care plan..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E9EBEF] rounded-md p-2.5 text-xs text-[#17191C] focus:border-[#386DF4] outline-none resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-[#E9EBEF] flex items-center justify-between">
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
              {isSubmitting ? "Saving Encounter..." : "Save Encounter & Labs"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
