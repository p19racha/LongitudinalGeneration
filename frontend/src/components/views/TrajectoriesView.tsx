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
  Legend,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Activity, Dna, Clock, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      .then((res) => {
        if (!isMounted) return;
        setTrajectoriesData(res);
        const featureKeys = Object.keys(res.trajectories);
        if (featureKeys.length > 0) {
          // Default to high-interest biomarker if present
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
  }, [patient.id]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-16 border border-slate-200 text-center space-y-3">
        <Activity className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">
          Aligning temporal biomarker trajectories...
        </p>
      </div>
    );
  }

  if (error || !trajectoriesData || Object.keys(trajectoriesData.trajectories).length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 border border-slate-200 text-center space-y-2">
        <p className="text-sm font-semibold text-slate-700">No Longitudinal Trajectory Points</p>
        <p className="text-xs text-slate-400">
          Add at least one visit observation or execute PULSE synthesis to map multi-visit trends.
        </p>
      </div>
    );
  }

  const currentTrajectory: BiomarkerTrajectory | undefined =
    trajectoriesData.trajectories[selectedFeature];

  // Prepare chart data points
  const chartData = (currentTrajectory?.points || []).map((pt) => ({
    name: pt.hours_from_baseline > 0 ? `+${pt.hours_from_baseline}h` : pt.visit_date,
    date: pt.visit_date,
    hours: pt.hours_from_baseline,
    value: Number(pt.value.toFixed(2)),
    is_synthetic: pt.is_synthetic,
    ci_low: pt.confidence_interval_low ? Number(pt.confidence_interval_low.toFixed(2)) : undefined,
    ci_high: pt.confidence_interval_high ? Number(pt.confidence_interval_high.toFixed(2)) : undefined,
  }));

  // Baseline vs Latest delta
  const firstVal = chartData.length > 0 ? chartData[0].value : 0;
  const lastVal = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const delta = lastVal - firstVal;
  const deltaPct = firstVal !== 0 ? (delta / firstVal) * 100 : 0;

  // Features grouped by category for quick picker
  const allFeatures = Object.values(trajectoriesData.trajectories);
  const routineLabs = allFeatures.filter((f) => f.feature_category === "routine_lab");
  const metabolomics = allFeatures.filter((f) => f.feature_category === "metabolomics");
  const proteomics = allFeatures.filter((f) => f.feature_category === "proteomics");

  return (
    <div className="space-y-6">
      {/* Feature Selector & Trajectory Summary */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-slate-700">Select Biomarker:</label>
          <select
            value={selectedFeature}
            onChange={(e) => setSelectedFeature(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {routineLabs.length > 0 && (
              <optgroup label="Routine Blood Labs">
                {routineLabs.map((f) => (
                  <option key={f.feature_name} value={f.feature_name}>
                    {f.feature_name} ({f.unit})
                  </option>
                ))}
              </optgroup>
            )}
            {metabolomics.length > 0 && (
              <optgroup label="Metabolomics (Lipidomics)">
                {metabolomics.map((f) => (
                  <option key={f.feature_name} value={f.feature_name}>
                    {f.feature_name} ({f.unit})
                  </option>
                ))}
              </optgroup>
            )}
            {proteomics.length > 0 && (
              <optgroup label="Plasma Proteomics (PULSE Synthesized)">
                {proteomics.map((f) => (
                  <option key={f.feature_name} value={f.feature_name}>
                    {f.feature_name} ({f.unit})
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {currentTrajectory && (
            <Badge
              variant="outline"
              className={`text-[11px] font-semibold uppercase ${
                currentTrajectory.feature_category === "routine_lab"
                  ? "bg-slate-50 text-slate-700 border-slate-200"
                  : currentTrajectory.feature_category === "metabolomics"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }`}
            >
              {currentTrajectory.feature_category.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {/* Temporal Divergence Metric */}
        <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="text-slate-500 font-medium">Trajectory Divergence:</span>
          <div className="flex items-center gap-1 font-mono font-bold">
            {delta > 0 ? (
              <span className="text-rose-600 flex items-center">
                <ArrowUpRight className="h-4 w-4" />
                +{delta.toFixed(2)} ({deltaPct > 0 ? `+${deltaPct.toFixed(1)}%` : "0%"})
              </span>
            ) : delta < 0 ? (
              <span className="text-emerald-600 flex items-center">
                <ArrowDownRight className="h-4 w-4" />
                {delta.toFixed(2)} ({deltaPct.toFixed(1)}%)
              </span>
            ) : (
              <span className="text-slate-600 flex items-center">
                <Minus className="h-3 w-3" /> 0.00
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Trajectory Interactive Chart */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{selectedFeature.replace(/_/g, " ")}</span>
                <span className="text-xs font-mono font-normal text-slate-500">
                  [{currentTrajectory?.unit}]
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {currentTrajectory?.description}
              </CardDescription>
            </div>
            {currentTrajectory?.ref_low != null && currentTrajectory?.ref_high != null && (
              <div className="text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
                Normal Bounds: {currentTrajectory.ref_low} – {currentTrajectory.ref_high} {currentTrajectory.unit}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1">
                          <p className="font-bold text-slate-200">{data.date} ({data.name})</p>
                          <p className="font-mono text-emerald-400">
                            Value: <span className="font-bold">{data.value}</span> {currentTrajectory?.unit}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Source: {data.is_synthetic ? "PULSE Synthesized" : "Measured in Lab"}
                          </p>
                          {data.ci_low !== undefined && data.ci_high !== undefined && (
                            <p className="text-[11px] text-purple-300 font-mono">
                              95% CI: [{data.ci_low}, {data.ci_high}]
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />

                {/* Reference Range Shaded Area */}
                {currentTrajectory?.ref_low != null && currentTrajectory?.ref_high != null && (
                  <ReferenceArea
                    y1={currentTrajectory.ref_low}
                    y2={currentTrajectory.ref_high}
                    fill="#10b981"
                    fillOpacity={0.08}
                  />
                )}

                {/* Primary Trajectory Curve */}
                <Line
                  type="monotone"
                  dataKey="value"
                  name={`${selectedFeature} (${currentTrajectory?.unit})`}
                  stroke={
                    currentTrajectory?.feature_category === "proteomics"
                      ? "#9333ea"
                      : currentTrajectory?.feature_category === "metabolomics"
                      ? "#f59e0b"
                      : "#4f46e5"
                  }
                  strokeWidth={3}
                  dot={{ r: 5, strokeWidth: 2, fill: "#ffffff" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Points Table */}
          <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[11px] text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-medium">Timepoint / Date</th>
                  <th className="pb-2 font-medium">Value</th>
                  <th className="pb-2 font-medium">Source Type</th>
                  <th className="pb-2 font-medium">95% Confidence Bounds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-mono">
                {chartData.map((pt, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2 text-slate-700">{pt.date} ({pt.name})</td>
                    <td className="py-2 font-bold text-slate-900">{pt.value} {currentTrajectory?.unit}</td>
                    <td className="py-2">
                      {pt.is_synthetic ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          PULSE Synthesized
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Direct Measurement
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-slate-500">
                      {pt.ci_low !== undefined ? `[${pt.ci_low}, ${pt.ci_high}]` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
