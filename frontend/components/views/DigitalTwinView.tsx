"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Sliders,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient, SimulationResponse } from "@/types/clinical";

interface DigitalTwinViewProps {
  patient: Patient;
}

export function DigitalTwinView({ patient }: DigitalTwinViewProps) {
  const isIcu = patient.cohort_type === "INPATIENT_ACUTE_ICU";

  // Target values state
  const [interventions, setInterventions] = useState<Record<string, number>>({});
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Preset Handlers
  const applyStatinPreset = () => {
    setInterventions({
      ldl_cholesterol: 65,
      triglycerides: 110,
    });
  };

  const applyGlycemicPreset = () => {
    setInterventions({
      glucose_fasting: 85,
      hba1c: 5.2,
    });
  };

  const applyDualProtectionPreset = () => {
    setInterventions({
      ldl_cholesterol: 65,
      triglycerides: 100,
      glucose_fasting: 85,
      hba1c: 5.2,
    });
  };

  const applyIcuHemodynamicPreset = () => {
    setInterventions({
      map: 78,
      lactate: 1.2,
    });
  };

  const applyIcuComprehensivePreset = () => {
    setInterventions({
      map: 80,
      lactate: 1.1,
      creatinine: 1.1,
      pao2_fio2: 340,
    });
  };

  const resetInterventions = () => {
    setInterventions({});
    setSimulationResult(null);
    setError(null);
  };

  const handleRunSimulation = async () => {
    if (Object.keys(interventions).length === 0) {
      setError("Please specify at least one hypothetical biomarker target value.");
      return;
    }

    setIsSimulating(true);
    setError(null);
    try {
      const res = await api.simulateIntervention(patient.id, interventions);
      setSimulationResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Counterfactual simulation failed.");
    } finally {
      setIsSimulating(false);
    }
  };

  // Biomarkers to manipulate depending on cohort
  const controls = isIcu
    ? [
        { key: "map", label: "Mean Arterial Pressure (MAP)", unit: "mmHg", min: 40, max: 120, step: 1 },
        { key: "lactate", label: "Serum Lactate", unit: "mmol/L", min: 0.5, max: 10, step: 0.1 },
        { key: "creatinine", label: "Serum Creatinine", unit: "mg/dL", min: 0.5, max: 8.0, step: 0.1 },
        { key: "pao2_fio2", label: "PaO2 / FiO2 Ratio", unit: "ratio", min: 80, max: 450, step: 5 },
      ]
    : [
        { key: "ldl_cholesterol", label: "LDL Cholesterol", unit: "mg/dL", min: 40, max: 220, step: 1 },
        { key: "triglycerides", label: "Serum Triglycerides", unit: "mg/dL", min: 50, max: 400, step: 5 },
        { key: "glucose_fasting", label: "Fasting Glucose", unit: "mg/dL", min: 65, max: 240, step: 1 },
        { key: "hba1c", label: "Hemoglobin A1c", unit: "%", min: 4.5, max: 13.0, step: 0.1 },
      ];

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#386DF4]" />
            <h3 className="text-sm font-semibold text-[#17191C]">
              In Silico Counterfactual Digital Twin Simulation
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#98A2B3]">
            PULSE Latent Intervention Engine
          </span>
        </div>
        <p className="text-xs text-[#667085] leading-relaxed">
          Simulate prospective therapeutic trajectories by clamping specific biological variables to target values.
          The generative model projects the counterfactual latent trajectory and re-evaluates disease risk reductions.
        </p>

        {/* Preset Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-[#E9EBEF]">
          <span className="text-[11px] font-medium text-[#98A2B3] uppercase tracking-wider mr-1">
            Clinical Presets:
          </span>
          {isIcu ? (
            <>
              <button
                onClick={applyIcuHemodynamicPreset}
                className="h-6 px-2.5 rounded bg-[#FAFAFB] hover:bg-[#F6F7F9] text-[#17191C] border border-[#E9EBEF] text-[11px] font-medium transition-colors"
              >
                Hemodynamic Optimization
              </button>
              <button
                onClick={applyIcuComprehensivePreset}
                className="h-6 px-2.5 rounded bg-[#FAFAFB] hover:bg-[#F6F7F9] text-[#17191C] border border-[#E9EBEF] text-[11px] font-medium transition-colors"
              >
                Full ICU Resuscitation
              </button>
            </>
          ) : (
            <>
              <button
                onClick={applyStatinPreset}
                className="h-6 px-2.5 rounded bg-[#FAFAFB] hover:bg-[#F6F7F9] text-[#17191C] border border-[#E9EBEF] text-[11px] font-medium transition-colors"
              >
                High-Intensity Statin
              </button>
              <button
                onClick={applyGlycemicPreset}
                className="h-6 px-2.5 rounded bg-[#FAFAFB] hover:bg-[#F6F7F9] text-[#17191C] border border-[#E9EBEF] text-[11px] font-medium transition-colors"
              >
                Strict Glycemic Control
              </button>
              <button
                onClick={applyDualProtectionPreset}
                className="h-6 px-2.5 rounded bg-[#FAFAFB] hover:bg-[#F6F7F9] text-[#17191C] border border-[#E9EBEF] text-[11px] font-medium transition-colors"
              >
                Dual Cardioprotective Therapy
              </button>
            </>
          )}

          <button
            onClick={resetInterventions}
            className="h-6 px-2 text-[#98A2B3] hover:text-[#C2414B] text-[11px] font-medium flex items-center gap-1 ml-auto transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Target Intervention Sliders */}
      <div className="border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
          Biomarker Target Parameters
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {controls.map((ctrl) => {
            const currentVal = interventions[ctrl.key];
            const hasIntervention = currentVal !== undefined;

            return (
              <div
                key={ctrl.key}
                className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${
                  hasIntervention
                    ? "bg-[#EDF3FF]/40 border-[#386DF4]/30"
                    : "bg-[#FAFAFB] border-[#E9EBEF]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#17191C]">{ctrl.label}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      step={ctrl.step}
                      min={ctrl.min}
                      max={ctrl.max}
                      placeholder="Baseline"
                      value={hasIntervention ? currentVal : ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? undefined : parseFloat(e.target.value);
                        setInterventions((prev) => {
                          const updated = { ...prev };
                          if (v === undefined || isNaN(v)) {
                            delete updated[ctrl.key];
                          } else {
                            updated[ctrl.key] = v;
                          }
                          return updated;
                        });
                      }}
                      className="w-16 h-6 px-1.5 text-right bg-[#FFFFFF] border border-[#E9EBEF] rounded text-xs font-mono focus:border-[#386DF4] outline-none"
                    />
                    <span className="text-[11px] text-[#667085]">{ctrl.unit}</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={hasIntervention ? currentVal : (ctrl.min + ctrl.max) / 2}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setInterventions((prev) => ({
                      ...prev,
                      [ctrl.key]: v,
                    }));
                  }}
                  className="w-full accent-[#386DF4] cursor-pointer"
                />
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3 bg-[#C2414B]/10 border border-[#C2414B]/20 rounded text-xs text-[#C2414B] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="h-8 px-4 bg-[#386DF4] hover:bg-[#2F5ECC] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isSimulating ? "Simulating Latent Trajectory..." : "Run Simulation"}</span>
          </button>
        </div>
      </div>

      {/* Simulation Results Table */}
      {simulationResult && (
        <div className="border border-[#E9EBEF] rounded-lg bg-[#FFFFFF] overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E9EBEF]">
            <div>
              <h4 className="text-sm font-semibold text-[#17191C]">
                Counterfactual Risk Reduction Projections
              </h4>
              <p className="text-xs text-[#667085]">
                Comparative disease risk deltas generated from counterfactual intervention
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#15803D] bg-[#15803D]/10 px-2.5 py-0.5 rounded border border-[#15803D]/20">
              Simulation Complete
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#17191C] divide-y divide-[#E9EBEF]">
              <thead className="bg-[#FAFAFB] text-[#667085] font-medium text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Disease Endpoint</th>
                  <th className="py-2.5 px-4 text-center">Baseline Risk</th>
                  <th className="py-2.5 px-4 text-center">Simulated Risk</th>
                  <th className="py-2.5 px-4 text-center">Absolute Reduction (ARR)</th>
                  <th className="py-2.5 px-4 text-center">Relative Reduction (RRR)</th>
                  <th className="py-2.5 px-4 text-right pr-4">Projected Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EBEF]">
                {simulationResult.risk_comparisons.map((c, idx) => {
                  const origPct = Math.round(c.original_probability * 100);
                  const simPct = Math.round(c.simulated_probability * 100);
                  const arrPct = (c.absolute_risk_reduction * 100).toFixed(1);
                  const rrrPct = (c.relative_risk_reduction_pct * 100).toFixed(1);
                  const isImproved = c.absolute_risk_reduction > 0;

                  return (
                    <tr key={idx} className="hover:bg-[#F6F7F9] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#17191C]">
                        {c.disease_name.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-[#667085]">
                        {origPct}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#17191C]">
                        {simPct}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-[#15803D]">
                        {isImproved ? `-${arrPct}%` : `${arrPct}%`}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-[#15803D]">
                        {isImproved ? `-${rrrPct}%` : `${rrrPct}%`}
                      </td>
                      <td className="py-3 px-4 text-right pr-4">
                        <span
                          className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${
                            c.simulated_category === "LOW"
                              ? "bg-[#15803D]/10 text-[#15803D] border-[#15803D]/20"
                              : c.simulated_category === "MODERATE"
                              ? "bg-[#667085]/10 text-[#667085] border-[#667085]/20"
                              : "bg-[#C2414B]/10 text-[#C2414B] border-[#C2414B]/20"
                          }`}
                        >
                          {c.simulated_category}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
