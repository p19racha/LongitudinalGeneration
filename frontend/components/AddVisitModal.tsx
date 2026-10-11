"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Sparkles,
  Activity,
  FileText,
  Calendar,
  Clock,
  Copy,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Heart,
  Gauge,
  Shield,
  Layers,
} from "lucide-react";
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

interface LabItemDefinition {
  name: string;
  label: string;
  panel: "lipid" | "metabolic" | "renal" | "systemic";
  unit: string;
  ref_low: number;
  ref_high: number;
  nominal_default: number;
  description: string;
}

export function AddVisitModal({
  isOpen,
  patient,
  onClose,
  onSubmit,
}: AddVisitModalProps) {
  const isIcu = patient.cohort_type === "INPATIENT_ACUTE_ICU";
  const visits = patient.visits || [];
  const nextVisitIndex = visits.length + 1;
  const lastVisit = visits.length > 0 ? visits[visits.length - 1] : null;
  const lastHours = lastVisit?.hours_from_baseline || 0;
  const defaultHours = isIcu ? lastHours + 4 : lastHours + 8760;

  // Active form section
  const [activeSection, setActiveSection] = useState<"labs" | "details" | "notes">("labs");
  const [activePanelFilter, setActivePanelFilter] = useState<"all" | "lipid" | "metabolic" | "renal" | "systemic">("all");

  // Form states
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [hoursFromBaseline, setHoursFromBaseline] = useState<number>(defaultHours);
  const [visitSummary, setVisitSummary] = useState(
    isIcu
      ? `ICU Step +${defaultHours}h: Hemodynamic monitoring and multi-organ reassessment.`
      : `Year ${visits.length} Routine Comprehensive Health & Metabolic Assessment.`
  );
  const [noteText, setNoteText] = useState("");
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Complete lab definitions organized by clinical panel
  const labDefinitions: LabItemDefinition[] = useMemo(() => {
    if (isIcu) {
      return [
        {
          name: "lactate",
          label: "Serum Lactate",
          panel: "systemic",
          unit: "mmol/L",
          ref_low: 0.5,
          ref_high: 2.0,
          nominal_default: 1.2,
          description: "Cellular anaerobic glycolysis and hypoperfusion.",
        },
        {
          name: "wbc",
          label: "White Blood Cells (WBC)",
          panel: "systemic",
          unit: "10^9/L",
          ref_low: 4.5,
          ref_high: 11.0,
          nominal_default: 7.2,
          description: "Leukocyte count reflecting systemic sepsis response.",
        },
        {
          name: "platelets",
          label: "Platelet Count",
          panel: "systemic",
          unit: "10^9/L",
          ref_low: 150,
          ref_high: 400,
          nominal_default: 230,
          description: "Thrombocyte count assessing consumptive coagulopathy.",
        },
        {
          name: "creatinine",
          label: "Serum Creatinine",
          panel: "renal",
          unit: "mg/dL",
          ref_low: 0.7,
          ref_high: 1.3,
          nominal_default: 0.95,
          description: "Glomerular filtration and acute kidney injury.",
        },
        {
          name: "bun",
          label: "Blood Urea Nitrogen (BUN)",
          panel: "renal",
          unit: "mg/dL",
          ref_low: 7,
          ref_high: 20,
          nominal_default: 14,
          description: "Azotemia and protein catabolism index.",
        },
        {
          name: "map",
          label: "Mean Arterial Pressure (MAP)",
          panel: "systemic",
          unit: "mmHg",
          ref_low: 65,
          ref_high: 100,
          nominal_default: 78,
          description: "Arterial perfusion sustaining organ flow.",
        },
        {
          name: "pao2_fio2",
          label: "PaO2 / FiO2 Ratio",
          panel: "systemic",
          unit: "ratio",
          ref_low: 300,
          ref_high: 500,
          nominal_default: 380,
          description: "Horowitz index assessing acute respiratory distress.",
        },
        {
          name: "glucose_fasting",
          label: "Blood Glucose",
          panel: "metabolic",
          unit: "mg/dL",
          ref_low: 70,
          ref_high: 140,
          nominal_default: 105,
          description: "Acute glycemic stress in critical illness.",
        },
      ];
    }

    return [
      // Lipid Panel
      {
        name: "cholesterol_total",
        label: "Total Cholesterol",
        panel: "lipid",
        unit: "mg/dL",
        ref_low: 125,
        ref_high: 200,
        nominal_default: 180,
        description: "Total circulating blood cholesterol.",
      },
      {
        name: "ldl_cholesterol",
        label: "LDL Cholesterol",
        panel: "lipid",
        unit: "mg/dL",
        ref_low: 50,
        ref_high: 100,
        nominal_default: 88,
        description: "Atherogenic low-density lipoprotein.",
      },
      {
        name: "hdl_cholesterol",
        label: "HDL Cholesterol",
        panel: "lipid",
        unit: "mg/dL",
        ref_low: 40,
        ref_high: 60,
        nominal_default: 52,
        description: "Protective high-density lipoprotein.",
      },
      {
        name: "triglycerides",
        label: "Triglycerides",
        panel: "lipid",
        unit: "mg/dL",
        ref_low: 50,
        ref_high: 150,
        nominal_default: 110,
        description: "Fasting circulating neutral lipids.",
      },

      // Metabolic Panel
      {
        name: "glucose_fasting",
        label: "Fasting Glucose",
        panel: "metabolic",
        unit: "mg/dL",
        ref_low: 70,
        ref_high: 99,
        nominal_default: 86,
        description: "Basal overnight fasting plasma glucose.",
      },
      {
        name: "hba1c",
        label: "Hemoglobin A1c",
        panel: "metabolic",
        unit: "%",
        ref_low: 4.0,
        ref_high: 5.6,
        nominal_default: 5.2,
        description: "Glycated hemoglobin reflecting 3-month glycemic mean.",
      },
      {
        name: "alt",
        label: "ALT (Alanine Transaminase)",
        panel: "metabolic",
        unit: "U/L",
        ref_low: 7,
        ref_high: 56,
        nominal_default: 24,
        description: "Enzyme indicating hepatocellular integrity.",
      },
      {
        name: "ast",
        label: "AST (Aspartate Transaminase)",
        panel: "metabolic",
        unit: "U/L",
        ref_low: 10,
        ref_high: 40,
        nominal_default: 22,
        description: "Enzyme released upon hepatic or muscular stress.",
      },

      // Renal Panel
      {
        name: "creatinine",
        label: "Serum Creatinine",
        panel: "renal",
        unit: "mg/dL",
        ref_low: 0.7,
        ref_high: 1.3,
        nominal_default: 0.92,
        description: "Glomerular filtration metabolite.",
      },
      {
        name: "bun",
        label: "Blood Urea Nitrogen",
        panel: "renal",
        unit: "mg/dL",
        ref_low: 7,
        ref_high: 20,
        nominal_default: 14,
        description: "Renal urea clearance and volume status.",
      },

      // Systemic / Hematology
      {
        name: "crp_hs",
        label: "High-Sensitivity CRP",
        panel: "systemic",
        unit: "mg/L",
        ref_low: 0.0,
        ref_high: 3.0,
        nominal_default: 0.8,
        description: "Systemic low-grade vascular inflammation.",
      },
      {
        name: "wbc",
        label: "White Blood Cells (WBC)",
        panel: "systemic",
        unit: "10^9/L",
        ref_low: 4.5,
        ref_high: 11.0,
        nominal_default: 6.8,
        description: "Leukocyte count tracking immune activation.",
      },
      {
        name: "platelets",
        label: "Platelets",
        panel: "systemic",
        unit: "10^9/L",
        ref_low: 150,
        ref_high: 400,
        nominal_default: 245,
        description: "Thrombocytes supporting hemostasis.",
      },
    ];
  }, [isIcu]);

  // Quick preset handlers
  const applyPresetNormal = () => {
    const vals: Record<string, number> = {};
    labDefinitions.forEach((def) => {
      vals[def.name] = def.nominal_default;
    });
    setMeasurements(vals);
    setVisitSummary(
      isIcu
        ? `ICU Step +${hoursFromBaseline}h: Hemodynamic stabilization and reassuring biochemical panel.`
        : `Routine Follow-up: All standard chemistry and lipid markers within normal reference intervals.`
    );
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
    setVisitSummary("Outpatient Follow-up: Significant atherogenic dyslipidemia with fasting hyperglycemia.");
  };

  const applyPresetCardiac = () => {
    setMeasurements({
      cholesterol_total: 235,
      ldl_cholesterol: 158,
      hdl_cholesterol: 36,
      triglycerides: 245,
      creatinine: 1.45,
      bun: 28,
      crp_hs: 6.5,
      wbc: 9.8,
      platelets: 275,
      glucose_fasting: 112,
    });
    setVisitSummary("Cardiovascular Clinic: Persistent dyspnea on exertion, high systemic inflammatory markers.");
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
    setVisitSummary(`ICU Step +${hoursFromBaseline}h: Septic deterioration with hyperlactatemia and thrombocytopenia.`);
    setNoteText(
      "PHYSICIAN ICU ROUNDS:\nPatient demonstrates signs of escalating septic shock with increasing vasopressor requirements. Arterial blood gas indicates persistent metabolic acidosis with compensatory tachypnea. Broad spectrum IV antimicrobials continued. Renal replacement therapy standby."
    );
  };

  const copyPreviousVisit = () => {
    if (!lastVisit || !lastVisit.measurements || lastVisit.measurements.length === 0) return;
    const copied: Record<string, number> = {};
    lastVisit.measurements.forEach((m) => {
      const val = typeof m.value === "number" ? m.value : (m as any).feature_value;
      if (val != null) {
        // match by name
        const match = labDefinitions.find(
          (d) => d.name.toLowerCase() === m.feature_name.toLowerCase()
        );
        if (match) {
          copied[match.name] = val;
        }
      }
    });
    setMeasurements(copied);
  };

  const clearAllLabs = () => {
    setMeasurements({});
  };

  const handleInputChange = (featureName: string, valStr: string) => {
    if (valStr === "") {
      const copy = { ...measurements };
      delete copy[featureName];
      setMeasurements(copy);
    } else {
      const parsed = parseFloat(valStr);
      if (!isNaN(parsed)) {
        setMeasurements((prev) => ({
          ...prev,
          [featureName]: parsed,
        }));
      }
    }
  };

  const setSingleNormal = (lab: LabItemDefinition) => {
    setMeasurements((prev) => ({
      ...prev,
      [lab.name]: lab.nominal_default,
    }));
  };

  // Filtered lab items based on panel tab
  const displayedLabs = useMemo(() => {
    if (activePanelFilter === "all") return labDefinitions;
    return labDefinitions.filter((d) => d.panel === activePanelFilter);
  }, [labDefinitions, activePanelFilter]);

  // Count summary
  const recordedCount = Object.keys(measurements).length;
  const abnormalCount = useMemo(() => {
    let count = 0;
    labDefinitions.forEach((lab) => {
      const val = measurements[lab.name];
      if (val !== undefined && (val < lab.ref_low || val > lab.ref_high)) {
        count++;
      }
    });
    return count;
  }, [measurements, labDefinitions]);

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
      setError(err instanceof Error ? err.message : "Failed to record clinical encounter.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col bg-[#FFFFFF] border border-[#E9EBEF] text-[#17191C] p-0 rounded-xl overflow-hidden shadow-xl">
        {/* Header Strip */}
        <DialogHeader className="px-6 py-4 border-b border-[#E9EBEF] bg-[#FFFFFF] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#386DF4] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[#17191C]">
                  Record Clinical Encounter #{nextVisitIndex}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#667085] mt-0.5 flex items-center gap-2">
                  <span>Patient:</span>
                  <strong className="text-[#17191C] font-semibold">{patient.full_name}</strong>
                  <span className="font-mono bg-[#FAFAFB] px-1.5 py-0.2 rounded border border-[#E9EBEF]">
                    {patient.mrn}
                  </span>
                  <span>•</span>
                  <span className="uppercase text-[10px] font-semibold text-[#386DF4]">
                    {isIcu ? "ICU Acute Cohort" : "Outpatient Chronic Cohort"}
                  </span>
                </DialogDescription>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2 text-xs shrink-0 font-medium">
              <span className="px-2.5 py-1 rounded bg-[#FAFAFB] text-[#667085] border border-[#E9EBEF]">
                {recordedCount} of {labDefinitions.length} labs entered
              </span>
              {abnormalCount > 0 && (
                <span className="px-2.5 py-1 rounded bg-[#C2414B]/10 text-[#C2414B] border border-[#C2414B]/20 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{abnormalCount} Abnormal</span>
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Section Navigation Strip */}
        <div className="px-6 pt-3 pb-2 border-b border-[#E9EBEF] bg-[#FAFAFB] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-1 bg-[#FFFFFF] p-0.5 rounded-lg border border-[#E9EBEF] text-xs">
            <button
              type="button"
              onClick={() => setActiveSection("labs")}
              className={`h-7 px-3 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeSection === "labs"
                  ? "bg-[#386DF4] text-white font-semibold shadow-2xs"
                  : "text-[#667085] hover:text-[#17191C]"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Laboratory Chemistry ({recordedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("details")}
              className={`h-7 px-3 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeSection === "details"
                  ? "bg-[#386DF4] text-white font-semibold shadow-2xs"
                  : "text-[#667085] hover:text-[#17191C]"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Encounter Timing & Context</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("notes")}
              className={`h-7 px-3 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeSection === "notes"
                  ? "bg-[#386DF4] text-white font-semibold shadow-2xs"
                  : "text-[#667085] hover:text-[#17191C]"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Progress Note {noteText.trim() ? "•" : ""}</span>
            </button>
          </div>

          {/* Quick Preset Action Bar */}
          <div className="flex items-center gap-1.5">
            {lastVisit && (
              <button
                type="button"
                onClick={copyPreviousVisit}
                title="Copy values from previous visit"
                className="h-7 px-2.5 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#17191C] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Copy className="h-3 w-3 text-[#386DF4]" />
                <span className="hidden sm:inline">Copy Previous Visit</span>
              </button>
            )}

            <button
              type="button"
              onClick={applyPresetNormal}
              className="h-7 px-2.5 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#15803D] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1 shadow-2xs"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Normal Panel</span>
            </button>

            {isIcu ? (
              <button
                type="button"
                onClick={applyPresetIcuSepsis}
                className="h-7 px-2.5 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#C2414B] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1 shadow-2xs"
              >
                <ShieldAlert className="h-3 w-3" />
                <span>Sepsis Alert</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={applyPresetMetabolic}
                  className="h-7 px-2.5 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#B7791F] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1 shadow-2xs hidden sm:flex"
                >
                  <Gauge className="h-3 w-3" />
                  <span>Dyslipidemia</span>
                </button>
                <button
                  type="button"
                  onClick={applyPresetCardiac}
                  className="h-7 px-2.5 text-[11px] font-medium bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#386DF4] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1 shadow-2xs hidden sm:flex"
                >
                  <Heart className="h-3 w-3" />
                  <span>Cardiovascular</span>
                </button>
              </>
            )}

            {recordedCount > 0 && (
              <button
                type="button"
                onClick={clearAllLabs}
                title="Clear all entered measurements"
                className="h-7 px-2 text-[11px] text-[#98A2B3] hover:text-[#C2414B] hover:bg-[#C2414B]/10 rounded-md transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-[#C2414B]/10 border border-[#C2414B]/20 text-[#C2414B] rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: LABORATORY CHEMISTRY */}
          {activeSection === "labs" && (
            <div className="space-y-3">
              {/* Panel Filter Bar */}
              {!isIcu && (
                <div className="flex items-center gap-1 border-b border-[#E9EBEF] pb-2 text-xs">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#98A2B3] mr-1">
                    Panel:
                  </span>
                  {[
                    { id: "all", label: "All Routine Labs" },
                    { id: "lipid", label: "Lipid Profile (4)" },
                    { id: "metabolic", label: "Metabolic & Hepatic (4)" },
                    { id: "renal", label: "Renal Function (2)" },
                    { id: "systemic", label: "Inflammatory & CBC (3)" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActivePanelFilter(tab.id as any)}
                      className={`h-6 px-2 rounded text-[11px] font-medium transition-all ${
                        activePanelFilter === tab.id
                          ? "bg-[#17191C] text-white font-semibold"
                          : "text-[#667085] hover:text-[#17191C] bg-[#FAFAFB] border border-[#E9EBEF]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid of Lab Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedLabs.map((lab) => {
                  const currentVal = measurements[lab.name];
                  const hasValue = currentVal !== undefined;
                  const isOutOfHigh = hasValue && currentVal > lab.ref_high;
                  const isOutOfLow = hasValue && currentVal < lab.ref_low;
                  const isNormal = hasValue && !isOutOfHigh && !isOutOfLow;

                  return (
                    <div
                      key={lab.name}
                      className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                        hasValue
                          ? isOutOfHigh
                            ? "bg-[#C2414B]/5 border-[#C2414B]/40 shadow-xs"
                            : isOutOfLow
                            ? "bg-[#D97706]/5 border-[#D97706]/40 shadow-xs"
                            : "bg-[#15803D]/5 border-[#15803D]/30 shadow-xs"
                          : "bg-[#FFFFFF] border-[#E9EBEF] hover:border-[#D0D5DD]"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <label className="text-xs font-semibold text-[#17191C] leading-snug">
                            {lab.label}
                          </label>

                          {/* Status Pill */}
                          {hasValue && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                                isOutOfHigh
                                  ? "bg-[#C2414B]/15 text-[#C2414B]"
                                  : isOutOfLow
                                  ? "bg-[#D97706]/15 text-[#D97706]"
                                  : "bg-[#15803D]/15 text-[#15803D]"
                              }`}
                            >
                              {isOutOfHigh ? "High" : isOutOfLow ? "Low" : "Normal"}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-[#667085] leading-tight line-clamp-1">
                          {lab.description}
                        </p>
                      </div>

                      {/* Input & Unit */}
                      <div className="pt-2 mt-2 border-t border-[#E9EBEF]/60">
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              step="any"
                              placeholder="Not tested"
                              value={hasValue ? currentVal : ""}
                              onChange={(e) => handleInputChange(lab.name, e.target.value)}
                              className={`w-full h-8 px-2.5 text-xs font-mono font-bold rounded border outline-none transition-colors ${
                                hasValue
                                  ? isOutOfHigh
                                    ? "text-[#C2414B] border-[#C2414B]/50 bg-white"
                                    : isOutOfLow
                                    ? "text-[#D97706] border-[#D97706]/50 bg-white"
                                    : "text-[#17191C] border-[#15803D]/50 bg-white"
                                  : "text-[#17191C] border-[#E9EBEF] bg-[#FAFAFB] focus:bg-white focus:border-[#386DF4]"
                              }`}
                            />
                          </div>

                          <span className="text-[11px] font-mono text-[#667085] shrink-0 min-w-[42px]">
                            {lab.unit}
                          </span>
                        </div>

                        {/* Reference Range & Quick Normal Helper */}
                        <div className="flex items-center justify-between text-[10px] pt-1.5 text-[#98A2B3]">
                          <span className="font-mono">
                            Ref: {lab.ref_low} – {lab.ref_high}
                          </span>

                          <button
                            type="button"
                            onClick={() => setSingleNormal(lab)}
                            className="text-[#386DF4] hover:underline hover:text-[#2F5ECC] transition-colors"
                          >
                            Set {lab.nominal_default}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TIMING & CONTEXT */}
          {activeSection === "details" && (
            <div className="space-y-4 max-w-2xl bg-[#FFFFFF] p-4 border border-[#E9EBEF] rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#17191C] flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#386DF4]" />
                    <span>Encounter Date</span>
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
                  />
                  <p className="text-[11px] text-[#667085]">
                    Chronological observation date for trajectory alignment.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#17191C] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#386DF4]" />
                    <span>Hours from Baseline</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={hoursFromBaseline}
                      onChange={(e) => setHoursFromBaseline(Number(e.target.value))}
                      required
                      className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md font-mono text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
                    />
                    <span className="text-xs font-mono text-[#667085] shrink-0">hours</span>
                  </div>

                  {/* Quick interval suggestions */}
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    <span className="text-[10px] text-[#98A2B3]">Quick step:</span>
                    {isIcu ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setHoursFromBaseline(lastHours + 4)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#FAFAFB] border border-[#E9EBEF] hover:bg-[#F6F7F9]"
                        >
                          +4h step
                        </button>
                        <button
                          type="button"
                          onClick={() => setHoursFromBaseline(lastHours + 24)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#FAFAFB] border border-[#E9EBEF] hover:bg-[#F6F7F9]"
                        >
                          +24h day
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setHoursFromBaseline(lastHours + 4380)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#FAFAFB] border border-[#E9EBEF] hover:bg-[#F6F7F9]"
                        >
                          +6 Months
                        </button>
                        <button
                          type="button"
                          onClick={() => setHoursFromBaseline(lastHours + 8760)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#FAFAFB] border border-[#E9EBEF] hover:bg-[#F6F7F9]"
                        >
                          +1 Year
                        </button>
                        <button
                          type="button"
                          onClick={() => setHoursFromBaseline(lastHours + 17520)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#FAFAFB] border border-[#E9EBEF] hover:bg-[#F6F7F9]"
                        >
                          +2 Years
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E9EBEF]">
                <label className="text-xs font-semibold text-[#17191C]">
                  Encounter Summary & Primary Clinical Indication
                </label>
                <input
                  value={visitSummary}
                  onChange={(e) => setVisitSummary(e.target.value)}
                  placeholder="e.g. Annual follow-up, Routine lipid panel reassessment..."
                  className="w-full h-9 px-3 bg-[#FFFFFF] border border-[#E9EBEF] rounded-md text-xs text-[#17191C] focus:border-[#386DF4] outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: CLINICAL PROGRESS NOTES */}
          {activeSection === "notes" && (
            <div className="space-y-3 bg-[#FFFFFF] p-4 border border-[#E9EBEF] rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#17191C] flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#386DF4]" />
                    <span>Narrative Clinical Progress Note</span>
                  </h4>
                  <p className="text-[11px] text-[#667085]">
                    Unstructured documentation processed alongside numerical laboratory data.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setNoteText(
                        `SUBJECTIVE:\nPatient presents for routine follow-up. Reports good compliance with current therapy.\n\nOBJECTIVE:\nVitals stable. Physical examination unremarkable. Routine laboratory panels obtained.\n\nASSESSMENT & PLAN:\nLongitudinal biomarkers reviewed with PULSE CDSS. Continue current regimen with follow-up in 12 months.`
                      )
                    }
                    className="px-2 py-1 text-[11px] font-medium bg-[#FAFAFB] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded text-[#17191C]"
                  >
                    Insert SOAP Template
                  </button>
                </div>
              </div>

              <textarea
                rows={8}
                placeholder="Enter physician assessment, nursing notes, or care plan..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full bg-[#FAFAFB] focus:bg-white border border-[#E9EBEF] rounded-md p-3 text-xs font-sans text-[#17191C] focus:border-[#386DF4] outline-none resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Footer Submit Bar */}
          <DialogFooter className="pt-4 border-t border-[#E9EBEF] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-[#667085] flex items-center gap-2">
              <span className="font-semibold text-[#17191C]">{recordedCount}</span> labs ready to save
              {abnormalCount > 0 && (
                <span className="text-[#C2414B] font-medium">• {abnormalCount} out of reference range</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-8 px-3.5 text-xs font-medium text-[#667085] hover:text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-8 px-4 bg-[#386DF4] hover:bg-[#2F5ECC] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Recording Encounter..." : "Save Encounter & Labs"}</span>
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
