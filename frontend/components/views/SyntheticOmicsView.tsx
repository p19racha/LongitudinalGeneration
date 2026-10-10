"use client";

import React, { useState } from "react";
import { Dna, Sparkles, CheckCircle2, AlertCircle, Info, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Patient, Measurement } from "@/types/clinical";

interface SyntheticOmicsViewProps {
  patient: Patient;
  onRunPulse: () => void;
  isRunningPulse: boolean;
}

export function SyntheticOmicsView({
  patient,
  onRunPulse,
  isRunningPulse,
}: SyntheticOmicsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "metabolomics" | "proteomics">("ALL");

  const visits = patient.visits || [];
  const latestVisit = visits.length > 0 ? visits[visits.length - 1] : null;
  const measurements: Measurement[] = latestVisit?.measurements || [];

  // Filter omics measurements (either metabolomics or proteomics)
  const omicsMeasurements = measurements.filter(
    (m) => m.feature_category === "metabolomics" || m.feature_category === "proteomics"
  );

  const displayedMeasurements = omicsMeasurements.filter((m) => {
    if (selectedCategory === "ALL") return true;
    return m.feature_category === selectedCategory;
  });

  const getStatus = (m: Measurement) => {
    if (m.ref_low != null && m.value < m.ref_low) {
      return { label: "Low", color: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    if (m.ref_high != null && m.value > m.ref_high) {
      return { label: "Elevated", color: "bg-rose-50 text-rose-700 border-rose-200" };
    }
    return { label: "Normal Range", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  };

  const getClinicalRationale = (name: string) => {
    switch (name) {
      case "GFAP":
        return "Glial Fibrillary Acidic Protein: Plasma marker of astrocyte activation and reactive astrogliosis; elevated years before clinical dementia onset.";
      case "NEFL":
        return "Neurofilament Light Chain: Axonal damage biomarker reflecting neuroaxonal destruction in neurodegenerative pathologies.";
      case "NT_proBNP":
        return "N-terminal pro-B-type Natriuretic Peptide: Released during myocardial stretch; gold standard biomarker for heart failure risk.";
      case "GDF15":
        return "Growth Differentiation Factor 15: Stress-response cytokine linked to cardiometabolic strain and biological aging.";
      case "hs_cTnT":
        return "High-Sensitivity Cardiac Troponin T: Myocardial ischemic necrosis marker predicting adverse cardiovascular events.";
      case "Cystatin_C":
        return "Alternative glomerular filtration marker unaffected by muscle mass; early predictor of renal and vascular decline.";
      case "ratio_L_LDL_FC_tot":
        return "Free cholesterol ratio in large LDL particles; reflects atherogenic lipid remodeling.";
      case "ratio_TG_PG":
        return "Triglyceride to phosphoglyceride ratio; indicator of hepatic lipogenesis and metabolic syndrome.";
      case "pct_S_VLDL_TG":
        return "Small VLDL triglyceride percentage; surrogate for dense remnant lipoprotein particles.";
      case "ratio_ApoB_ApoA1":
        return "Ratio of atherogenic ApoB to anti-atherogenic ApoA1; strong predictor of myocardial infarction.";
      default:
        return "Synthesized molecular biomarker predicted through PULSE cross-modal latent alignment.";
    }
  };

  if (omicsMeasurements.length === 0) {
    return (
      <div className="bg-white rounded-xl p-10 border border-slate-200 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <Dna className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">
            No Omics Biomarkers Imputed Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            This patient currently only has standard routine clinical labs. The PULSE framework can infer high-dimensional metabolomics (lipid fractions) and plasma proteomics (GFAP, NfL, NT-proBNP) directly from routine blood trajectories.
          </p>
        </div>
        <button
          onClick={onRunPulse}
          disabled={isRunningPulse || visits.length === 0}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition inline-flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {isRunningPulse ? "Synthesizing Omics..." : "Run PULSE Omics Synthesis"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter and Stats Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Dna className="h-4 w-4 text-purple-600" />
            Molecular Omics Synthesis Panel
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            PULSE auto-aligns routine blood panel vectors to impute deep molecular omics with 95% Confidence Bounds.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <Button
            variant={selectedCategory === "ALL" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory("ALL")}
            className={`h-7 text-xs font-semibold ${selectedCategory === "ALL" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs" : "text-slate-600"}`}
          >
            All Omics ({omicsMeasurements.length})
          </Button>
          <Button
            variant={selectedCategory === "metabolomics" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory("metabolomics")}
            className={`h-7 text-xs font-semibold ${selectedCategory === "metabolomics" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs" : "text-slate-600"}`}
          >
            Metabolomics
          </Button>
          <Button
            variant={selectedCategory === "proteomics" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory("proteomics")}
            className={`h-7 text-xs font-semibold ${selectedCategory === "proteomics" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs" : "text-slate-600"}`}
          >
            Proteomics
          </Button>
        </div>
      </div>

      {/* Grid of Omics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedMeasurements.map((m) => {
          const status = getStatus(m);
          const hasCi =
            m.confidence_interval_low != null && m.confidence_interval_high != null;
          const rationale = getClinicalRationale(m.feature_name);

          // Calculate visual position for reference bar
          const low = m.ref_low ?? m.value * 0.5;
          const high = m.ref_high ?? m.value * 1.5;
          const span = Math.max(high - low, 0.001);
          const minRange = Math.max(0, low - span * 0.5);
          const maxRange = high + span * 0.5;
          const totalSpan = maxRange - minRange;
          const markerPct = Math.min(
            100,
            Math.max(0, ((m.value - minRange) / totalSpan) * 100)
          );
          const refLowPct = Math.min(
            100,
            Math.max(0, ((low - minRange) / totalSpan) * 100)
          );
          const refHighPct = Math.min(
            100,
            Math.max(0, ((high - minRange) / totalSpan) * 100)
          );

          return (
            <Card
              key={m.id}
              className="border-slate-200/90 shadow-xs hover:shadow-md transition bg-white flex flex-col justify-between"
            >
              <div>
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                        {m.feature_category}
                      </span>
                      <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
                        {m.feature_name.replace(/_/g, " ")}
                      </CardTitle>
                    </div>

                    {/* Green (Measured) vs Purple (Synthesized) Badge */}
                    {m.is_synthetic ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold bg-purple-100 text-purple-800 border-purple-200 gap-1"
                      >
                        <Sparkles className="h-3 w-3" /> PULSE Synthesized
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-200 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Measured in Lab
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Biomarker Value Display */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {m.value.toFixed(2)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {m.unit}
                        </span>
                      </div>
                      {hasCi && (
                        <div className="text-[11px] font-mono text-purple-700 font-medium mt-0.5">
                          95% CI: [{m.confidence_interval_low?.toFixed(2)},{" "}
                          {m.confidence_interval_high?.toFixed(2)}]
                        </div>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[11px] font-bold ${status.color}`}
                    >
                      {status.label}
                    </Badge>
                  </div>

                  {/* Reference Range Visual Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>Ref Range:</span>
                      <span className="font-mono text-slate-600">
                        {m.ref_low ?? "—"} – {m.ref_high ?? "—"} {m.unit}
                      </span>
                    </div>

                    <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      {/* Normal Range Window */}
                      <div
                        className="absolute h-full bg-emerald-100 border-x border-emerald-300"
                        style={{
                          left: `${refLowPct}%`,
                          width: `${Math.max(refHighPct - refLowPct, 2)}%`,
                        }}
                      />

                      {/* Current Value Marker */}
                      <div
                        className="absolute top-0 bottom-0 w-2 -ml-1 rounded-full bg-indigo-600 shadow-sm"
                        style={{ left: `${markerPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Clinical Description */}
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100 leading-relaxed">
                    {rationale}
                  </p>
                </CardContent>
              </div>

              <div className="p-2.5 bg-slate-50/70 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Visit #{latestVisit?.visit_index} ({latestVisit?.visit_date})</span>
                <span>Prior Z_P Aligned</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
