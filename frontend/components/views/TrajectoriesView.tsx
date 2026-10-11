"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  Dna,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Heart,
  Brain,
  Gauge,
  Shield,
  Layers,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { Patient, TrajectoriesResponse, BiomarkerTrajectory } from "@/types/clinical";

interface TrajectoriesViewProps {
  patient: Patient;
}

type PanelType = "lipid" | "metabolic" | "neuro" | "renal" | "all";

interface PanelDefinition {
  id: PanelType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keys: string[];
}

const PANELS: PanelDefinition[] = [
  {
    id: "lipid",
    label: "Lipid Panel",
    description: "Coronary atherogenic lipoproteins, cholesterol fractions, and synthesized particle balance.",
    icon: Heart,
    keys: [
      "cholesterol_total",
      "ldl_cholesterol",
      "hdl_cholesterol",
      "triglycerides",
      "apob_to_apoa1_ratio",
      "free_cholesterol_to_total_lipid_large_ldl",
      "small_vldl_tg_pct",
      "medium_vldl_cholesterol_pct",
      "large_hdl_phospholipids",
    ],
  },
  {
    id: "metabolic",
    label: "Metabolic Panel",
    description: "Glycemic regulation, insulin resistance markers, and hepatocellular transaminases.",
    icon: Gauge,
    keys: [
      "glucose_fasting",
      "hba1c",
      "alt",
      "ast",
      "total_bcaa",
      "tg_to_pg_ratio",
      "tsh",
    ],
  },
  {
    id: "neuro",
    label: "Neuro Panel",
    description: "Reactive astrogliosis, neuroaxonal degradation, and neuro-nutritional cofactors.",
    icon: Brain,
    keys: [
      "gfap",
      "nefl_nfl",
      "nefl",
      "homocysteine",
      "vitamin_b12",
    ],
  },
  {
    id: "renal",
    label: "Renal & Hemodynamic",
    description: "Glomerular filtration rates, azotemia, systemic perfusion, and cardiorenal strain.",
    icon: Shield,
    keys: [
      "creatinine",
      "bun",
      "cystatin_c",
      "albumin",
      "nt_probnp",
      "troponin_t_hs",
      "hs_ctnt",
      "lactate",
      "map",
      "gdf15",
    ],
  },
  {
    id: "all",
    label: "All Biomarkers",
    description: "Complete longitudinal inventory of all measured labs and synthesized omics profiles.",
    icon: Layers,
    keys: [], // matched dynamically
  },
];

const FEATURE_METADATA: Record<string, { title: string; category: string; description: string }> = {
  cholesterol_total: {
    title: "Total Cholesterol",
    category: "Routine Lipid Panel",
    description: "Total circulating blood cholesterol.",
  },
  ldl_cholesterol: {
    title: "LDL Cholesterol",
    category: "Routine Lipid Panel",
    description: "Low-density lipoprotein; primary atherogenic circulating target.",
  },
  hdl_cholesterol: {
    title: "HDL Cholesterol",
    category: "Routine Lipid Panel",
    description: "High-density lipoprotein; mediates reverse cholesterol transport.",
  },
  triglycerides: {
    title: "Triglycerides",
    category: "Routine Lipid Panel",
    description: "Fasting neutral lipids packaged in rich lipoprotein particles.",
  },
  apob_to_apoa1_ratio: {
    title: "ApoB / ApoA1 Ratio",
    category: "PULSE Synthesized Omics",
    description: "Balance between atherogenic particles (ApoB) and protective particles (ApoA1).",
  },
  free_cholesterol_to_total_lipid_large_ldl: {
    title: "Free Cholesterol in Large LDL",
    category: "PULSE Synthesized Omics",
    description: "High-risk atherogenic lipid remodeling subfraction.",
  },
  small_vldl_tg_pct: {
    title: "Small VLDL TG %",
    category: "PULSE Synthesized Omics",
    description: "Fraction of triglycerides packaged into dense remnant particles.",
  },
  medium_vldl_cholesterol_pct: {
    title: "Medium VLDL Cholesterol %",
    category: "PULSE Synthesized Omics",
    description: "Cholesterol content within remnant medium VLDL fractions.",
  },
  large_hdl_phospholipids: {
    title: "Large HDL Phospholipids",
    category: "PULSE Synthesized Omics",
    description: "Cardioprotective phospholipid fraction supporting vascular efflux.",
  },
  glucose_fasting: {
    title: "Fasting Glucose",
    category: "Routine Glycemic",
    description: "Basal blood glucose concentration after overnight fast.",
  },
  hba1c: {
    title: "Hemoglobin A1c",
    category: "Routine Glycemic",
    description: "Glycated hemoglobin reflecting 90-day mean glucose exposure.",
  },
  alt: {
    title: "Alanine Aminotransferase (ALT)",
    category: "Routine Hepatic",
    description: "Liver transaminase indicating hepatocellular integrity.",
  },
  ast: {
    title: "Aspartate Aminotransferase (AST)",
    category: "Routine Hepatic",
    description: "Transaminase released upon liver or myocardial tissue stress.",
  },
  total_bcaa: {
    title: "Total BCAA (Branched-Chain AA)",
    category: "PULSE Synthesized Omics",
    description: "Circulating valine, leucine, and isoleucine; metabolic insulin resistance marker.",
  },
  tg_to_pg_ratio: {
    title: "TG to PG Ratio",
    category: "PULSE Synthesized Omics",
    description: "Triglyceride to phosphoglyceride ratio reflecting hepatic lipogenesis.",
  },
  tsh: {
    title: "Thyroid Stimulating Hormone",
    category: "Routine Endocrine",
    description: "Pituitary hormone regulating systemic metabolic rate.",
  },
  gfap: {
    title: "Glial Fibrillary Acidic Protein (GFAP)",
    category: "PULSE Synthesized Omics",
    description: "Reactive astrogliosis marker elevated years before clinical neurodegeneration.",
  },
  nefl_nfl: {
    title: "Neurofilament Light Chain (NfL)",
    category: "PULSE Synthesized Omics",
    description: "Axonal injury biomarker tracking active neuroaxonal breakdown.",
  },
  nefl: {
    title: "Neurofilament Light Chain (NfL)",
    category: "PULSE Synthesized Omics",
    description: "Axonal injury biomarker tracking active neuroaxonal breakdown.",
  },
  homocysteine: {
    title: "Total Homocysteine",
    category: "Routine Vascular / Neuro",
    description: "Amino acid associated with endothelial damage and vascular cognitive decline.",
  },
  vitamin_b12: {
    title: "Cobalamin (Vitamin B12)",
    category: "Routine Nutritional / Neuro",
    description: "Crucial cofactor for myelin maintenance and hematopoiesis.",
  },
  creatinine: {
    title: "Serum Creatinine",
    category: "Routine Renal",
    description: "Standard muscle metabolite tracking glomerular filtration rate.",
  },
  bun: {
    title: "Blood Urea Nitrogen (BUN)",
    category: "Routine Renal",
    description: "Urea nitrogen reflecting renal clearance and volume status.",
  },
  cystatin_c: {
    title: "Cystatin C",
    category: "PULSE Synthesized Omics",
    description: "Alternative glomerular filtration marker unaffected by muscle mass.",
  },
  albumin: {
    title: "Serum Albumin",
    category: "Routine Hepatorenal",
    description: "Abundant serum protein reflecting hepatic synthesis and oncotic pressure.",
  },
  nt_probnp: {
    title: "N-Terminal Pro-BNP",
    category: "PULSE Synthesized Omics",
    description: "Myocardial stretch biomarker diagnosing subclinical ventricular strain.",
  },
  troponin_t_hs: {
    title: "High-Sensitivity Troponin T",
    category: "PULSE Synthesized Omics",
    description: "Myocardial necrosis and subclinical cardiac injury marker.",
  },
  hs_ctnt: {
    title: "High-Sensitivity Troponin T",
    category: "PULSE Synthesized Omics",
    description: "Myocardial necrosis and subclinical cardiac injury marker.",
  },
  lactate: {
    title: "Serum Lactate",
    category: "Routine Hemodynamics",
    description: "Marker of anaerobic cellular glycolysis and tissue hypoperfusion.",
  },
  map: {
    title: "Mean Arterial Pressure (MAP)",
    category: "Routine Hemodynamics",
    description: "Arterial perfusion pressure maintaining organ blood flow.",
  },
  gdf15: {
    title: "Growth Differentiation Factor 15",
    category: "PULSE Synthesized Omics",
    description: "Cellular stress cytokine linked to systemic biological aging.",
  },
  wbc: {
    title: "White Blood Cell Count",
    category: "Routine Hematology",
    description: "Total leukocyte count tracking inflammatory and immune response.",
  },
  platelets: {
    title: "Platelet Count",
    category: "Routine Hematology",
    description: "Thrombocyte count assessing coagulation homeostasis.",
  },
  crp_hs: {
    title: "High-Sensitivity CRP",
    category: "Routine Inflammatory",
    description: "Acute phase reactant tracking vascular systemic inflammation.",
  },
  hscrp: {
    title: "High-Sensitivity CRP",
    category: "Routine Inflammatory",
    description: "Acute phase reactant tracking vascular systemic inflammation.",
  },
  glycoprotein_acetyls_glyca: {
    title: "Glycoprotein Acetyls (GlycA)",
    category: "PULSE Synthesized Omics",
    description: "Cumulative NMR marker of chronic systemic inflammatory burden.",
  },
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

export function TrajectoriesView({ patient }: TrajectoriesViewProps) {
  const [trajectoriesData, setTrajectoriesData] = useState<TrajectoriesResponse | null>(null);
  const [activePanel, setActivePanel] = useState<PanelType>("lipid");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getTrajectories(patient.id)
      .then((res: any) => {
        if (!isMounted) return;

        let trajMap: Record<string, BiomarkerTrajectory> = {};

        if (res?.trajectories && typeof res.trajectories === "object" && Object.keys(res.trajectories).length > 0) {
          trajMap = res.trajectories;
        } else if (Array.isArray(res?.features) && res.features.length > 0) {
          for (const f of res.features) {
            trajMap[f.feature_name] = {
              feature_name: f.feature_name,
              feature_category: f.modality || f.category || "routine_lab",
              unit: f.unit || "",
              ref_low: f.reference_low,
              ref_high: f.reference_high,
              description: f.display_name || f.feature_name,
              points: (f.points || []).map((pt: any) => ({
                visit_id: pt.visit_id,
                visit_index: pt.visit_index,
                visit_date: pt.visit_date,
                hours_from_baseline: pt.hours_from_baseline ?? 0,
                value: typeof pt.value === "number" ? pt.value : typeof pt.feature_value === "number" ? pt.feature_value : 0,
                feature_value: pt.feature_value,
                is_synthetic: !!pt.is_synthetic,
                confidence_interval_low: pt.confidence_interval_low ?? pt.confidence_lower,
                confidence_interval_high: pt.confidence_interval_high ?? pt.confidence_upper,
                reference_low: pt.reference_low,
                reference_high: pt.reference_high,
              })),
            };
          }
        }

        const normalized: TrajectoriesResponse = {
          patient_id: res?.patient_id || patient.id,
          mrn: res?.mrn || patient.mrn,
          full_name: res?.full_name || patient.full_name,
          cohort_type: res?.cohort_type || patient.cohort_type,
          features: res?.features,
          trajectories: trajMap,
        };

        setTrajectoriesData(normalized);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load trajectories.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [patient.id, patient.mrn, patient.full_name, patient.cohort_type]);

  // Map trajectory items into their respective panels
  const panelTrajectories = useMemo(() => {
    if (!trajectoriesData?.trajectories) return [];

    const allKeys = Object.keys(trajectoriesData.trajectories);
    const selectedPanelDef = PANELS.find((p) => p.id === activePanel) || PANELS[0];

    return allKeys
      .filter((rawKey) => {
        const norm = normalizeKey(rawKey);
        if (activePanel === "all") return true;
        return selectedPanelDef.keys.some((k) => norm === k || norm.includes(k));
      })
      .map((rawKey) => {
        const traj = trajectoriesData.trajectories[rawKey];
        const norm = normalizeKey(rawKey);
        const meta = FEATURE_METADATA[norm];
        const isSynthetic =
          traj.feature_category === "metabolomics" ||
          traj.feature_category === "proteomics" ||
          (traj.points && traj.points.some((p) => p.is_synthetic));

        return {
          rawKey,
          normKey: norm,
          title: meta?.title || traj.description || rawKey,
          categoryName: meta?.category || (isSynthetic ? "PULSE Synthesized Omics" : "Lab Measured"),
          description: meta?.description || traj.description,
          isSynthetic,
          trajectory: traj,
        };
      })
      .sort((a, b) => {
        // Routine labs first, then synthesized omics
        if (a.isSynthetic === b.isSynthetic) {
          return a.title.localeCompare(b.title);
        }
        return a.isSynthetic ? 1 : -1;
      });
  }, [trajectoriesData, activePanel]);

  // Overall panel statistics
  const panelStats = useMemo(() => {
    const total = panelTrajectories.length;
    const measuredCount = panelTrajectories.filter((item) => !item.isSynthetic).length;
    const synthesizedCount = panelTrajectories.filter((item) => item.isSynthetic).length;

    let elevatedCount = 0;
    let belowCount = 0;

    panelTrajectories.forEach((item) => {
      const pts = item.trajectory.points || [];
      if (pts.length > 0) {
        const lastVal = typeof pts[pts.length - 1].value === "number" ? pts[pts.length - 1].value : (pts[pts.length - 1] as any).feature_value;
        const refHigh = item.trajectory.ref_high;
        const refLow = item.trajectory.ref_low;
        if (refHigh != null && lastVal > refHigh) elevatedCount++;
        else if (refLow != null && lastVal < refLow) belowCount++;
      }
    });

    return { total, measuredCount, synthesizedCount, elevatedCount, belowCount };
  }, [panelTrajectories]);

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-2">
        <div className="w-5 h-5 border-2 border-[#386DF4] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#667085]">Aligning longitudinal biomarker trajectory panels...</p>
      </div>
    );
  }

  if (
    error ||
    !trajectoriesData ||
    !trajectoriesData.trajectories ||
    Object.keys(trajectoriesData.trajectories).length === 0
  ) {
    return (
      <div className="p-12 border border-[#E9EBEF] rounded-lg text-center space-y-2 bg-[#FFFFFF]">
        <p className="text-sm font-semibold text-[#17191C]">No Longitudinal Trajectory Points</p>
        <p className="text-xs text-[#667085]">
          Add at least one visit observation or execute PULSE synthesis to map multi-visit trends.
        </p>
      </div>
    );
  }

  const currentPanelDef = PANELS.find((p) => p.id === activePanel) || PANELS[0];

  return (
    <div className="space-y-6">
      {/* Panel Selector Bar (Linear-inspired segmented tabs) */}
      <div className="border border-[#E9EBEF] rounded-lg p-2 bg-[#FFFFFF] flex flex-wrap items-center gap-1.5">
        {PANELS.map((panel) => {
          const Icon = panel.icon;
          const isActive = activePanel === panel.id;

          // Count matching features
          const count = Object.keys(trajectoriesData.trajectories).filter((rawKey) => {
            if (panel.id === "all") return true;
            const norm = normalizeKey(rawKey);
            return panel.keys.some((k) => norm === k || norm.includes(k));
          }).length;

          return (
            <button
              key={panel.id}
              onClick={() => setActivePanel(panel.id)}
              className={`h-8 px-3 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-[#386DF4] text-white shadow-xs font-semibold"
                  : "bg-[#FAFAFB] text-[#667085] hover:text-[#17191C] hover:bg-[#F6F7F9] border border-[#E9EBEF]"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{panel.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#FFFFFF] text-[#667085] border border-[#E9EBEF]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Panel Header & Summary Context */}
      <div className="border border-[#E9EBEF] rounded-lg p-4 bg-[#FFFFFF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#17191C]">
              {currentPanelDef.label} Trajectories
            </h3>
            <span className="text-[11px] font-mono text-[#667085]">
              {panelStats.total} biomarkers tracked
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            {currentPanelDef.description}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EDF3FF] text-[#386DF4] border border-[#386DF4]/20">
            <Activity className="h-3 w-3" />
            <span>{panelStats.measuredCount} Lab Measured</span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#7856A8]/10 text-[#7856A8] border border-[#7856A8]/20">
            <Dna className="h-3 w-3" />
            <span>{panelStats.synthesizedCount} Synthesized Omics</span>
          </span>

          {panelStats.elevatedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#C2414B]/10 text-[#C2414B] border border-[#C2414B]/20 font-semibold">
              <ArrowUpRight className="h-3 w-3" />
              <span>{panelStats.elevatedCount} Elevated</span>
            </span>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparative Charts Grid */}
      {panelTrajectories.length === 0 ? (
        <div className="p-12 border border-[#E9EBEF] rounded-lg text-center space-y-2 bg-[#FFFFFF]">
          <p className="text-sm font-semibold text-[#17191C]">No Biomarkers in this Panel</p>
          <p className="text-xs text-[#667085]">
            No measurements match this clinical panel yet. Run PULSE synthesis to impute missing omics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {panelTrajectories.map((item) => {
            const { rawKey, title, isSynthetic, trajectory } = item;
            const points = trajectory.points || [];

            const chartData = points.map((pt) => {
              const rawVal =
                typeof pt.value === "number"
                  ? pt.value
                  : typeof (pt as any).feature_value === "number"
                  ? (pt as any).feature_value
                  : 0;

              return {
                name: pt.hours_from_baseline > 0 ? `+${pt.hours_from_baseline}h` : pt.visit_date,
                date: pt.visit_date,
                hours: pt.hours_from_baseline,
                value: Number(rawVal.toFixed(2)),
                is_synthetic: pt.is_synthetic,
                ci_low:
                  pt.confidence_interval_low != null
                    ? Number(pt.confidence_interval_low.toFixed(2))
                    : pt.confidence_lower != null
                    ? Number(pt.confidence_lower.toFixed(2))
                    : undefined,
                ci_high:
                  pt.confidence_interval_high != null
                    ? Number(pt.confidence_interval_high.toFixed(2))
                    : pt.confidence_upper != null
                    ? Number(pt.confidence_upper.toFixed(2))
                    : undefined,
              };
            });

            const firstVal = chartData.length > 0 ? chartData[0].value : 0;
            const lastVal = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
            const delta = lastVal - firstVal;
            const refLow = trajectory.ref_low;
            const refHigh = trajectory.ref_high;

            const isElevated = refHigh != null && lastVal > refHigh;
            const isBelow = refLow != null && lastVal < refLow;
            const isNormal = !isElevated && !isBelow;

            const strokeColor = isSynthetic ? "#7856A8" : "#386DF4";

            return (
              <div
                key={rawKey}
                className="border border-[#E9EBEF] rounded-lg p-4 bg-[#FFFFFF] flex flex-col justify-between hover:border-[#D0D5DD] transition-all"
              >
                {/* Chart Header */}
                <div className="space-y-2 pb-3 border-b border-[#E9EBEF]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-[#17191C] leading-snug">
                        {title}
                      </h4>
                      <p className="text-[11px] text-[#667085] truncate max-w-[280px]">
                        {item.description}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded shrink-0 flex items-center gap-1 font-semibold ${
                        isSynthetic
                          ? "bg-[#7856A8]/10 text-[#7856A8] border border-[#7856A8]/20"
                          : "bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/20"
                      }`}
                    >
                      {isSynthetic ? (
                        <>
                          <Dna className="h-2.5 w-2.5 shrink-0" />
                          <span>PULSE Synthesized</span>
                        </>
                      ) : (
                        <>
                          <Activity className="h-2.5 w-2.5 shrink-0" />
                          <span>Lab Measured</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Metrics & Reference Status */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-[#17191C] tabular-nums">
                        {lastVal}
                      </span>
                      <span className="text-xs text-[#667085] font-mono">
                        {trajectory.unit}
                      </span>

                      {/* Direction Delta */}
                      {chartData.length > 1 && (
                        <span
                          className={`text-xs font-semibold font-mono flex items-center gap-0.5 ml-1 ${
                            delta > 0
                              ? isElevated
                                ? "text-[#C2414B]"
                                : "text-[#15803D]"
                              : delta < 0
                              ? isBelow
                                ? "text-[#C2414B]"
                                : "text-[#15803D]"
                              : "text-[#667085]"
                          }`}
                        >
                          {delta > 0 ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : delta < 0 ? (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                          {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      {refLow != null && refHigh != null ? (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                            isElevated
                              ? "bg-[#C2414B]/10 text-[#C2414B] border border-[#C2414B]/20"
                              : isBelow
                              ? "bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20"
                              : "bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20"
                          }`}
                        >
                          {isElevated ? "Above Normal" : isBelow ? "Below Normal" : "Normal"}{" "}
                          ({refLow} – {refHigh} {trajectory.unit})
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#98A2B3]">
                          Nominal range
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recharts Curve Container */}
                <div className="h-[180px] w-full pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#98A2B3"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: "#E9EBEF" }}
                      />
                      <YAxis
                        stroke="#98A2B3"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: "#E9EBEF" }}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-2.5 bg-[#FFFFFF] border border-[#E9EBEF] rounded shadow-sm text-xs font-sans space-y-1">
                                <p className="font-semibold text-[#17191C]">
                                  {data.date} {data.hours > 0 ? `(+${data.hours}h)` : ""}
                                </p>
                                <p className="font-mono font-bold" style={{ color: strokeColor }}>
                                  {data.value} {trajectory.unit}
                                </p>
                                <p className="text-[10px] text-[#667085]">
                                  {data.is_synthetic ? "PULSE Synthesized Omics" : "Lab Measured"}
                                </p>
                                {data.ci_low !== undefined && data.ci_high !== undefined && (
                                  <p className="text-[10px] font-mono text-[#7856A8]">
                                    95% CI: [{data.ci_low}, {data.ci_high}]
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {refHigh && (
                        <ReferenceLine
                          y={refHigh}
                          stroke="#C2414B"
                          strokeDasharray="3 3"
                          strokeOpacity={0.6}
                        />
                      )}

                      {refLow && (
                        <ReferenceLine
                          y={refLow}
                          stroke="#386DF4"
                          strokeDasharray="3 3"
                          strokeOpacity={0.6}
                        />
                      )}

                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={strokeColor}
                        strokeWidth={2}
                        dot={{ r: 3.5, fill: "#FFFFFF", stroke: strokeColor, strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: strokeColor }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
