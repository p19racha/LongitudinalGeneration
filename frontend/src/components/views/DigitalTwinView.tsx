"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Sliders,
  TrendingDown,
  Activity,
  HeartPulse,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
  const [isSimulating, setIsSimulating] = useState(false);
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
      setError(err instanceof Error ? err.message : "Failed to run counterfactual simulation.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Concept Header */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Sliders className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">
                  PULSE Digital Twin: Counterfactual Scenario Sandbox
                </CardTitle>
                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                  Nature Comp Sci (2026)
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-600 mt-1">
                Hypothesize proactive clinical therapeutic goals (e.g. lipid-lowering, glycemic control, or ICU hemodynamic resuscitation) and project latent state trajectory divergence and downstream risk reductions.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={resetInterventions}
                className="text-xs text-slate-600 border-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Quick Therapeutic Strategy Presets */}
        <CardContent className="pt-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1 mr-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Simulated Therapeutic Protocols:
            </span>
            {!isIcu ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyStatinPreset}
                  className="text-xs h-7 border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                >
                  High-Intensity Statin (LDL 65)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyGlycemicPreset}
                  className="text-xs h-7 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                >
                  Strict Glycemic Control (HbA1c 5.2%)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyDualProtectionPreset}
                  className="text-xs h-7 border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                >
                  Dual Statin + SGLT2i Strategy
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyIcuHemodynamicPreset}
                  className="text-xs h-7 border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                >
                  Vasopressor Perfusion Goal (MAP 78, Lac 1.2)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyIcuComprehensivePreset}
                  className="text-xs h-7 border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                >
                  Multisystem Stabilization (MAP, Lac, Cr, P/F)
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Target Parameters Adjustment Grid */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-indigo-600" />
            Hypothetical Biomarker Targets
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Specify counterfactual therapeutic values to evaluate through the PULSE generative model:
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {!isIcu ? (
              <>
                <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="text-xs font-bold text-slate-700 block">
                    LDL Cholesterol (mg/dL)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 65"
                    value={interventions["ldl_cholesterol"] ?? ""}
                    onChange={(e) =>
                      setInterventions({
                        ...interventions,
                        ldl_cholesterol: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Target goal: &lt; 70 mg/dL</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="text-xs font-bold text-slate-700 block">
                    Triglycerides (mg/dL)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 110"
                    value={interventions["triglycerides"] ?? ""}
                    onChange={(e) =>
                      setInterventions({
                        ...interventions,
                        triglycerides: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Target goal: &lt; 150 mg/dL</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="text-xs font-bold text-slate-700 block">
                    Fasting Glucose (mg/dL)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 85"
                    value={interventions["glucose_fasting"] ?? ""}
                    onChange={(e) =>
                      setInterventions({
                        ...interventions,
                        glucose_fasting: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Normal: 70–99 mg/dL</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="text-xs font-bold text-slate-700 block">
                    HbA1c (%)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 5.2"
                    value={interventions["hba1c"] ?? ""}
                    onChange={(e) =>
                      setInterventions({
                        ...interventions,
                        hba1c: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Normal: &lt; 5.7%</span>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="text-xs font-bold text-slate-700 block">
                    Mean Arterial Pressure (mmHg)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 78"
                    value={interventions["map"] ?? ""}
                    onChange={(e) =>
                      setInterventions({
                        ...interventions,
                        map: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Target: 65–85 mmHg</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="text-xs font-bold text-slate-700 block">
                    Serum Lactate (mmol/L)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 1.2"
                    value={interventions["lactate"] ?? ""}
                    onChange={(e) =>
                      setInterventions({
                        ...interventions,
                        lactate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Clearance goal: &lt; 2.0</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="text-xs font-bold text-slate-700 block">
                    Creatinine (mg/dL)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 1.1"
                    value={interventions["creatinine"] ?? ""}
                    onChange={(e) =>
                      setInterventions({
                        ...interventions,
                        creatinine: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Ref: 0.7–1.3 mg/dL</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <label className="text-xs font-bold text-slate-700 block">
                    PaO2 / FiO2 Ratio
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 340"
                    value={interventions["pao2_fio2"] ?? ""}
                    onChange={(e) =>
                      setInterventions({
                        ...interventions,
                        pao2_fio2: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Adequate: &gt; 300</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs text-slate-500 font-mono">
            {Object.keys(interventions).length} Parameter(s) Ready for Simulation
          </span>
          <Button
            onClick={handleRunSimulation}
            disabled={isSimulating || Object.keys(interventions).length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-2 shadow-xs"
          >
            <Sparkles className={`h-4 w-4 ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Executing Counterfactual Run..." : "Run Digital Twin Simulation"}</span>
          </Button>
        </CardFooter>
      </Card>

      {/* Simulation Results Comparison */}
      {simulationResult && (
        <Card className="border-indigo-200 bg-white shadow-md animate-in fade-in duration-300">
          <CardHeader className="pb-3 border-b border-slate-100 bg-indigo-50/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-emerald-600" />
                  Projected Risk Reductions (Before vs. After Intervention)
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 mt-0.5">
                  Counterfactual outcomes generated by propagating therapeutic targets through PULSE latent representations.
                </CardDescription>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                Active Simulation
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-6">
            {/* Table of Disease Risk Comparisons */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Clinical Endpoint</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Baseline Risk</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Counterfactual Risk</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Absolute Reduction</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Relative Benefit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulationResult.risk_comparisons.map((c) => {
                  const origPct = Math.round(c.original_probability * 100);
                  const simPct = Math.round(c.simulated_probability * 100);
                  const absPct = Math.round(c.absolute_risk_reduction * 100);
                  const isBeneficial = c.absolute_risk_reduction > 0;

                  return (
                    <TableRow key={c.disease_name} className="hover:bg-slate-50/80">
                      <TableCell className="font-bold text-slate-900 capitalize">
                        {c.disease_name.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        <span className="font-bold text-slate-800">{origPct}%</span>
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {c.original_category}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        <span className="font-bold text-indigo-700">{simPct}%</span>
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                          {c.simulated_category}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {isBeneficial ? (
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            -{absPct}%
                          </span>
                        ) : (
                          <span className="text-slate-500">0%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {isBeneficial ? (
                          <span className="font-bold text-emerald-700">
                            +{c.relative_risk_reduction_pct}% reduction
                          </span>
                        ) : (
                          <span className="text-slate-400">Neutral</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Downstream Omics & Biomarker Response Preview */}
            {Object.keys(simulationResult.simulated_measurements_sample).length > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Projected Downstream Molecular Shifts:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {Object.entries(simulationResult.simulated_measurements_sample).map(([k, v]) => (
                    <div key={k} className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block truncate">{k}</span>
                      <span className="font-bold text-slate-900">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
