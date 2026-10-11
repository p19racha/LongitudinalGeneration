"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Activity, Dna, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { api } from "@/lib/api";
import { Patient, TrajectoriesResponse, BiomarkerTrajectory } from "@/types/clinical";

interface TrajectoriesViewProps {
  patient: Patient;
}

export function TrajectoriesView({ patient }: TrajectoriesViewProps) {
  const [trajectoriesData, setTrajectoriesData] = useState<TrajectoriesResponse | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string>("");
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

        // 1. If backend returned trajectories dictionary
        if (res?.trajectories && typeof res.trajectories === "object" && Object.keys(res.trajectories).length > 0) {
          trajMap = res.trajectories;
        }
        // 2. Fallback: if backend returned features list
        else if (Array.isArray(res?.features) && res.features.length > 0) {
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

        const featureKeys = Object.keys(trajMap);
        if (featureKeys.length > 0) {
          const priority = ["GFAP", "NT_proBNP", "cholesterol_total", "ldl_cholesterol", "lactate", "wbc"];
          const found = priority.find((k) => featureKeys.includes(k));
          setSelectedFeature(found || featureKeys[0]);
        }
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

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-2">
        <div className="w-5 h-5 border-2 border-[#386DF4] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#667085]">Aligning longitudinal biomarker trajectories...</p>
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

  const currentTrajectory: BiomarkerTrajectory | undefined =
    trajectoriesData.trajectories[selectedFeature] ||
    Object.values(trajectoriesData.trajectories)[0];

  const chartData = (currentTrajectory?.points || []).map((pt) => {
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

  const featureKeys = Object.keys(trajectoriesData.trajectories);

  return (
    <div className="space-y-6">
      {/* Biomarker Selector Pill Strip */}
      <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-[#E9EBEF]">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#98A2B3] mr-1">
          Select Biomarker:
        </span>
        {featureKeys.map((key) => {
          const traj = trajectoriesData.trajectories[key];
          const isSelected = selectedFeature === key;
          const isOmics = traj.feature_category === "metabolomics" || traj.feature_category === "proteomics";

          return (
            <button
              key={key}
              onClick={() => setSelectedFeature(key)}
              className={`h-7 px-2.5 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${
                isSelected
                  ? "bg-[#386DF4] text-white shadow-xs font-semibold"
                  : isOmics
                  ? "bg-[#7856A8]/10 text-[#7856A8] hover:bg-[#7856A8]/20 border border-[#7856A8]/20"
                  : "bg-[#FAFAFB] text-[#667085] hover:text-[#17191C] border border-[#E9EBEF]"
              }`}
            >
              {isOmics && <Dna className="h-3 w-3 shrink-0" />}
              <span>{key}</span>
            </button>
          );
        })}
      </div>

      {currentTrajectory && (
        <div className="border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-5">
          {/* Top Biomarker Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9EBEF]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#17191C]">
                  {currentTrajectory.feature_name}
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FAFAFB] text-[#667085] border border-[#E9EBEF]">
                  {currentTrajectory.feature_category}
                </span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5 max-w-xl">
                {currentTrajectory.description}
              </p>
            </div>

            <div className="flex items-baseline gap-4 shrink-0 font-mono">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#98A2B3] block">
                  Latest Value
                </span>
                <span className="text-2xl font-bold text-[#17191C] tabular-nums">
                  {lastVal} {currentTrajectory.unit}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#98A2B3] block">
                  Longitudinal Δ
                </span>
                <span
                  className={`text-base font-semibold tabular-nums flex items-center gap-0.5 ${
                    delta > 0
                      ? "text-[#C2414B]"
                      : delta < 0
                      ? "text-[#15803D]"
                      : "text-[#667085]"
                  }`}
                >
                  {delta > 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : delta < 0 ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Curve */}
          <div className="h-[320px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EBEF" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#98A2B3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#E9EBEF" }}
                />
                <YAxis
                  stroke="#98A2B3"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#E9EBEF" }}
                  unit={` ${currentTrajectory.unit}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-[#FFFFFF] border border-[#E9EBEF] rounded shadow-sm text-xs font-sans space-y-1">
                          <p className="font-semibold text-[#17191C]">
                            {data.date} {data.hours > 0 ? `(+${data.hours}h)` : ""}
                          </p>
                          <p className="font-mono text-[#386DF4] font-bold">
                            {data.value} {currentTrajectory.unit}
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

                {currentTrajectory.ref_high && (
                  <ReferenceLine
                    y={currentTrajectory.ref_high}
                    stroke="#C2414B"
                    strokeDasharray="4 4"
                    label={{
                      value: `Max Ref: ${currentTrajectory.ref_high}`,
                      fill: "#C2414B",
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                )}

                {currentTrajectory.ref_low && (
                  <ReferenceLine
                    y={currentTrajectory.ref_low}
                    stroke="#386DF4"
                    strokeDasharray="4 4"
                    label={{
                      value: `Min Ref: ${currentTrajectory.ref_low}`,
                      fill: "#386DF4",
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={currentTrajectory.feature_category === "routine_lab" ? "#386DF4" : "#7856A8"}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#FFFFFF", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
