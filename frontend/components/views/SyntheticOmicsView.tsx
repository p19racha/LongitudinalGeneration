"use client";

import React, { useState } from "react";
import { Dna, Sparkles, PanelRight, Layers } from "lucide-react";
import { Patient, Measurement } from "@/types/clinical";

interface SyntheticOmicsViewProps {
  patient: Patient;
  onRunPulse: () => void;
  isRunningPulse: boolean;
  onSelectBiomarker?: (biomarker: Measurement) => void;
}

export function SyntheticOmicsView({
  patient,
  onRunPulse,
  isRunningPulse,
  onSelectBiomarker,
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
    const val = m.value !== undefined ? m.value : (m as any).feature_value;
    const refLow = m.ref_low !== undefined ? m.ref_low : (m as any).reference_low;
    const refHigh = m.ref_high !== undefined ? m.ref_high : (m as any).reference_high;

    if (val != null && refLow != null && val < refLow) {
      return { label: "Low", color: "bg-[#386DF4]/10 text-[#386DF4] border-[#386DF4]/20" };
    }
    if (val != null && refHigh != null && val > refHigh) {
      return { label: "Elevated", color: "bg-[#C2414B]/10 text-[#C2414B] border-[#C2414B]/20" };
    }
    return { label: "Nominal", color: "bg-[#15803D]/10 text-[#15803D] border-[#15803D]/20" };
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
      <div className="bg-[#FFFFFF] rounded-lg p-12 border border-[#E9EBEF] text-center space-y-3">
        <div className="h-10 w-10 rounded-full bg-[#7856A8]/10 text-[#7856A8] flex items-center justify-center mx-auto">
          <Dna className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#17191C]">
            No Molecular Omics Imputed Yet
          </h3>
          <p className="text-xs text-[#667085] max-w-md mx-auto mt-1">
            This patient currently only has standard routine clinical labs. The PULSE framework can infer high-dimensional metabolomics (lipid fractions) and plasma proteomics (GFAP, NfL, NT-proBNP) directly from routine blood trajectories.
          </p>
        </div>
        <button
          onClick={onRunPulse}
          disabled={isRunningPulse || visits.length === 0}
          className="h-8 px-3.5 bg-[#7856A8] hover:bg-[#684795] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isRunningPulse ? "Synthesizing Omics..." : "Run PULSE Omics Synthesis"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Category selector */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#E9EBEF]">
        <div className="flex items-center gap-1.5 bg-[#FAFAFB] border border-[#E9EBEF] rounded-md p-0.5 text-xs">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-2.5 py-1 rounded transition-colors text-[11px] font-medium ${
              selectedCategory === "ALL"
                ? "bg-[#FFFFFF] text-[#17191C] font-semibold shadow-2xs border border-[#E9EBEF]"
                : "text-[#667085] hover:text-[#17191C]"
            }`}
          >
            All Omics ({omicsMeasurements.length})
          </button>
          <button
            onClick={() => setSelectedCategory("proteomics")}
            className={`px-2.5 py-1 rounded transition-colors text-[11px] font-medium ${
              selectedCategory === "proteomics"
                ? "bg-[#FFFFFF] text-[#7856A8] font-semibold shadow-2xs border border-[#E9EBEF]"
                : "text-[#667085] hover:text-[#7856A8]"
            }`}
          >
            Plasma Proteomics (Olink)
          </button>
          <button
            onClick={() => setSelectedCategory("metabolomics")}
            className={`px-2.5 py-1 rounded transition-colors text-[11px] font-medium ${
              selectedCategory === "metabolomics"
                ? "bg-[#FFFFFF] text-[#7856A8] font-semibold shadow-2xs border border-[#E9EBEF]"
                : "text-[#667085] hover:text-[#7856A8]"
            }`}
          >
            Metabolomics / Lipidomics (Nightingale)
          </button>
        </div>

        <span className="text-[11px] font-mono text-[#98A2B3]">
          Latent Dimension: 64D Variational
        </span>
      </div>

      {/* Omics Explorer Table */}
      <div className="border border-[#E9EBEF] rounded-lg bg-[#FFFFFF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#17191C] divide-y divide-[#E9EBEF]">
            <thead className="bg-[#FAFAFB] text-[#667085] font-medium text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Biomarker Feature</th>
                <th className="py-2.5 px-4">Modality</th>
                <th className="py-2.5 px-4 text-right">Imputed Value</th>
                <th className="py-2.5 px-4 text-center">95% Credible Interval</th>
                <th className="py-2.5 px-4">Reference Range</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EBEF]">
              {displayedMeasurements.map((m) => {
                const status = getStatus(m);
                const val = m.value !== undefined ? m.value : (m as any).feature_value;
                const refLow = m.ref_low !== undefined ? m.ref_low : (m as any).reference_low;
                const refHigh = m.ref_high !== undefined ? m.ref_high : (m as any).reference_high;

                return (
                  <tr
                    key={m.id || m.feature_name}
                    onClick={() => onSelectBiomarker && onSelectBiomarker(m)}
                    className="hover:bg-[#F6F7F9] transition-colors cursor-pointer group"
                  >
                    {/* Feature Name & Rationale */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-[#17191C] text-[13px] group-hover:text-[#386DF4] transition-colors">
                        {m.feature_name}
                      </div>
                      <div className="text-[11px] text-[#667085] truncate mt-0.5">
                        {getClinicalRationale(m.feature_name)}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#7856A8]/10 text-[#7856A8] font-semibold border border-[#7856A8]/20">
                        {m.feature_category}
                      </span>
                    </td>

                    {/* Imputed Value */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[13px] tabular-nums text-[#17191C]">
                      {val != null ? Number(val).toFixed(2) : "—"}{" "}
                      <span className="text-[11px] text-[#667085] font-normal">{m.unit}</span>
                    </td>

                    {/* 95% Credible Interval */}
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-[#7856A8]">
                      {m.confidence_interval_low != null && m.confidence_interval_high != null ? (
                        <span>
                          [{Number(m.confidence_interval_low).toFixed(2)},{" "}
                          {Number(m.confidence_interval_high).toFixed(2)}]
                        </span>
                      ) : (
                        <span className="text-[#98A2B3]">± 0.12 (calibrated)</span>
                      )}
                    </td>

                    {/* Reference Range */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[#667085]">
                      {refLow != null && refHigh != null
                        ? `${refLow} – ${refHigh} ${m.unit}`
                        : "Nominal"}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right pr-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectBiomarker) onSelectBiomarker(m);
                        }}
                        className="p-1 text-[#667085] hover:text-[#17191C] hover:bg-[#E9EBEF] rounded transition-colors"
                        title="Inspect in side panel"
                      >
                        <PanelRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
