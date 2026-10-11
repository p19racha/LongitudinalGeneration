"use client";

import React from "react";
import { AlertCircle, TrendingUp, CheckCircle, ShieldAlert, Sparkles } from "lucide-react";
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

  const getCategoryStyles = (cat: RiskCategory) => {
    switch (cat) {
      case "CRITICAL":
        return {
          text: "text-[#C2414B]",
          badge: "bg-[#C2414B]/10 text-[#C2414B] border-[#C2414B]/20",
          bar: "bg-[#C2414B]",
        };
      case "HIGH":
        return {
          text: "text-[#B7791F]",
          badge: "bg-[#B7791F]/10 text-[#B7791F] border-[#B7791F]/20",
          bar: "bg-[#B7791F]",
        };
      case "MODERATE":
        return {
          text: "text-[#667085]",
          badge: "bg-[#667085]/10 text-[#667085] border-[#667085]/20",
          bar: "bg-[#98A2B3]",
        };
      default:
        return {
          text: "text-[#15803D]",
          badge: "bg-[#15803D]/10 text-[#15803D] border-[#15803D]/20",
          bar: "bg-[#15803D]",
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
      <div className="bg-[#FFFFFF] rounded-lg p-12 border border-[#E9EBEF] text-center space-y-3">
        <div className="h-10 w-10 rounded-full bg-[#EDF3FF] text-[#386DF4] flex items-center justify-center mx-auto">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#17191C]">
            No Calibrated Risk Projections Computed
          </h3>
          <p className="text-xs text-[#667085] max-w-md mx-auto mt-1">
            Execute the PULSE generative synthesis engine to calculate longitudinal multi-disease risk forecasts and biomarker attributions from this patient&apos;s trajectory.
          </p>
        </div>
        <button
          onClick={onRunPulse}
          disabled={isRunningPulse || visits.length === 0}
          className="h-8 px-3.5 bg-[#386DF4] hover:bg-[#2F5ECC] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{isRunningPulse ? "Running PULSE Synthesis..." : "Run PULSE Engine"}</span>
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
        <div className="bg-[#C2414B]/4 border border-[#C2414B]/20 rounded-lg p-3.5 flex items-start gap-3 text-[#17191C]">
          <ShieldAlert className="h-4 w-4 text-[#C2414B] shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <h4 className="font-semibold text-[13px] text-[#C2414B]">
              Clinical Flag: High Multi-Disease Risk Identified
            </h4>
            <p className="text-[#667085] text-[12px]">
              {criticalRisks.map((c) => formatDiseaseTitle(c.disease_name)).join(", ")} exceed calibrated clinical intervention thresholds.
            </p>
          </div>
        </div>
      )}

      {/* Grid of Disease Risk Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predictions.map((p) => {
          const styles = getCategoryStyles(p.risk_category);
          const percent = Math.round(p.risk_probability * 100);

          return (
            <div
              key={p.id || p.disease_name}
              className="border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-4 shadow-2xs hover:border-[#386DF4]/30 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#17191C] text-sm">
                    {formatDiseaseTitle(p.disease_name)}
                  </h3>
                  <span className="text-[11px] font-mono text-[#98A2B3]">
                    {p.task_type.replace(/_/g, " ")}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${styles.badge}`}
                >
                  {p.risk_category}
                </span>
              </div>

              {/* Progress and Value */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[#667085]">Calibrated Probability</span>
                  <span className={`font-mono text-xl font-bold tabular-nums ${styles.text}`}>
                    {percent}%
                  </span>
                </div>
                <div className="w-full bg-[#F6F7F9] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${styles.bar}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Top Biological Drivers */}
              {p.top_drivers && p.top_drivers.length > 0 && (
                <div className="pt-2 border-t border-[#E9EBEF] space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3] block">
                    Top Contributing Feature Drivers
                  </span>
                  <div className="space-y-1.5">
                    {p.top_drivers.map((driver, dIdx) => (
                      <div
                        key={dIdx}
                        className="p-2 rounded bg-[#FAFAFB] border border-[#E9EBEF] text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-[#17191C] text-[12px] block truncate">
                            {driver.feature_name}
                          </span>
                          {driver.description && (
                            <span className="text-[10px] text-[#667085] truncate block">
                              {driver.description}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-[#386DF4] shrink-0">
                          +{Math.round(driver.impact_score * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
