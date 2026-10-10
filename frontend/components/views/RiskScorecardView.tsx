"use client";

import React from "react";
import { AlertCircle, TrendingUp, CheckCircle, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Patient, RiskPrediction, RiskCategory } from "@/types/clinical";

interface RiskScorecardViewProps {
  patient: Patient;
  onRunPulse: () => void;
  isRunningPulse: boolean;
}

export function RiskScorecardView({
  patient,
  onRunPulse,
  isRunningPulse,
}: RiskScorecardViewProps) {
  const visits = patient.visits || [];
  const latestVisit = visits.length > 0 ? visits[visits.length - 1] : null;
  const predictions: RiskPrediction[] = latestVisit?.predictions || [];

  const getCategoryColor = (cat: RiskCategory) => {
    switch (cat) {
      case "CRITICAL":
        return {
          bg: "bg-rose-50 border-rose-200 text-rose-800",
          badge: "bg-rose-600 text-white",
          bar: "bg-rose-600",
        };
      case "HIGH":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          badge: "bg-amber-600 text-white",
          bar: "bg-amber-500",
        };
      case "MODERATE":
        return {
          bg: "bg-yellow-50 border-yellow-200 text-yellow-800",
          badge: "bg-yellow-600 text-white",
          bar: "bg-yellow-500",
        };
      default:
        return {
          bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
          badge: "bg-emerald-600 text-white",
          bar: "bg-emerald-500",
        };
    }
  };

  const formatDiseaseTitle = (name: string) => {
    return name
      .replace(/_/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  if (predictions.length === 0) {
    return (
      <div className="bg-white rounded-xl p-10 border border-slate-200 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">
            No Risk Predictions Generated Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Run the PULSE generative synthesis engine to calculate longitudinal multi-disease risk scorecards and biomarker attributions from this patient&apos;s trajectory.
          </p>
        </div>
        <button
          onClick={onRunPulse}
          disabled={isRunningPulse || visits.length === 0}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition inline-flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {isRunningPulse ? "Running PULSE Synthesis..." : "Run PULSE Generative Engine"}
        </button>
      </div>
    );
  }

  const criticalRisks = predictions.filter(
    (p) => p.risk_category === "CRITICAL" || p.risk_category === "HIGH"
  );

  return (
    <div className="space-y-6">
      {/* Alert Header if High Risk Present */}
      {criticalRisks.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-900">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-sm">
              Clinical Alert: Elevated Multi-Disease Risk Detected
            </h4>
            <p>
              PULSE prognostic forecast identified {criticalRisks.length} high-probability clinical endpoint(s) based on observed labs and synthesized molecular omics profiles.
            </p>
          </div>
        </div>
      )}

      {/* Disease Risk Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {predictions.map((pred) => {
          const colors = getCategoryColor(pred.risk_category);
          const percent = Math.round(pred.risk_probability * 100);

          return (
            <Card
              key={pred.id}
              className="border-slate-200/90 shadow-xs hover:shadow-md transition bg-white overflow-hidden flex flex-col justify-between"
            >
              <div>
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                        {pred.task_type.replace(/_/g, " ")}
                      </span>
                      <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
                        {formatDiseaseTitle(pred.disease_name)}
                      </CardTitle>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}
                    >
                      {pred.risk_category}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Probability Gauge */}
                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-xs text-slate-500 font-medium">
                        Forecast Probability:
                      </span>
                      <span className="text-2xl font-extrabold text-slate-900">
                        {percent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Top Driving Biomarkers / Attribution */}
                  {pred.top_drivers && pred.top_drivers.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span>Key Biomarker Attributions</span>
                        <span className="text-slate-400 font-normal">Impact weight</span>
                      </div>
                      <div className="space-y-1.5">
                        {pred.top_drivers.map((driver, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-slate-50 p-1.5 rounded-md border border-slate-100"
                          >
                            <span className="font-medium text-slate-700 truncate mr-2" title={driver.description}>
                              {driver.description}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                driver.impact_score > 0
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {driver.impact_score > 0 ? `+${driver.impact_score.toFixed(2)}` : driver.impact_score.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Card Footer note */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Calculated via PULSE Latent Model</span>
                <span>Visit #{latestVisit?.visit_index}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
