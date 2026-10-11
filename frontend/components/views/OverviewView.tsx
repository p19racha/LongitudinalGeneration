"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldAlert,
  Activity,
  Dna,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  UploadCloud,
  UserPlus,
  RefreshCw,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { CohortOverviewResponse, TriageRadarResponse } from "@/types/clinical";

interface OverviewViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenNewPatient: () => void;
  onOpenBatchImport: () => void;
  onNavigateToPatients: () => void;
  onNavigateToAlerts: () => void;
}

export function OverviewView({
  onSelectPatient,
  onOpenNewPatient,
  onOpenBatchImport,
  onNavigateToPatients,
  onNavigateToAlerts,
}: OverviewViewProps) {
  const [overview, setOverview] = useState<CohortOverviewResponse | null>(null);
  const [triage, setTriage] = useState<TriageRadarResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovData, trData] = await Promise.all([
        api.getCohortOverview(),
        api.getTriageRadar(),
      ]);
      setOverview(ovData);
      setTriage(trData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load clinical overview.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-6 h-6 border-2 border-[#386DF4] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium text-[#667085]">
          Aggregating longitudinal cohort metrics & model predictions...
        </p>
      </div>
    );
  }

  if (error || !overview || !triage) {
    return (
      <div className="p-8 border border-[#E9EBEF] rounded-lg text-center space-y-3 bg-[#FFFFFF] max-w-md mx-auto my-12">
        <AlertCircle className="h-6 w-6 text-[#C2414B] mx-auto" />
        <h3 className="text-sm font-semibold text-[#17191C]">Overview Unavailable</h3>
        <p className="text-xs text-[#667085]">{error}</p>
        <button
          onClick={loadData}
          className="h-8 px-3 text-xs font-medium bg-[#FAFAFB] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Heading (Reference 2 style: Clean, spacious typography) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E9EBEF]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#17191C]">
            Clinical Decision Support Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Continuous multimodal alignment, generative molecular omics synthesis, and calibrated risk trajectories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh statistics"
            className="h-8 px-2.5 text-xs font-medium text-[#667085] hover:text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync</span>
          </button>
          <button
            onClick={onOpenNewPatient}
            className="h-8 px-3 text-xs font-semibold text-white bg-[#386DF4] hover:bg-[#2F5ECC] rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Enroll Patient</span>
          </button>
        </div>
      </div>

      {/* 4 Typography KPI Metrics (Reference 2: 28–40px readable KPI values, 1px subtle borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div
          onClick={onNavigateToPatients}
          className="p-5 rounded-lg border border-[#E9EBEF] bg-[#FFFFFF] hover:border-[#386DF4]/40 cursor-pointer transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active Registry</span>
            <Users className="h-4 w-4 text-[#98A2B3] group-hover:text-[#386DF4] transition-colors" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-[#17191C]">
            {overview.total_patients}
          </div>
          <div className="text-[11px] text-[#667085] pt-1">
            <span>{overview.outpatient_count} Outpatient</span>
            <span className="mx-1 text-[#98A2B3]">•</span>
            <span>{overview.icu_count} ICU Acute</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div
          onClick={onNavigateToAlerts}
          className="p-5 rounded-lg border border-[#E9EBEF] bg-[#FFFFFF] hover:border-[#C2414B]/40 cursor-pointer transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Prioritized Triage</span>
            <ShieldAlert className="h-4 w-4 text-[#C2414B]" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-[#C2414B]">
            {triage.urgent_count}
          </div>
          <div className="text-[11px] text-[#C2414B] pt-1 font-medium">
            <span>Critical / Rapid Deterioration</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-lg border border-[#E9EBEF] bg-[#FFFFFF] space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Omics Coverage</span>
            <Dna className="h-4 w-4 text-[#7856A8]" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-[#7856A8]">
            {overview.omics_synthesis_rate_pct}%
          </div>
          <div className="text-[11px] text-[#667085] pt-1">
            <span>{overview.synthetic_omics_count.toLocaleString()} imputed biomarkers</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-lg border border-[#E9EBEF] bg-[#FFFFFF] space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Clinical Observations</span>
            <Activity className="h-4 w-4 text-[#386DF4]" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-[#17191C]">
            {overview.total_measurements.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#667085] pt-1">
            <span>{overview.average_encounters_per_patient} encounters / patient avg</span>
          </div>
        </div>
      </div>

      {/* Two-Column Structured Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Risk Stratification & Top Diseases (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stratification bar */}
          <div className="border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E9EBEF]">
              <div>
                <h3 className="text-sm font-semibold text-[#17191C]">
                  Population Risk Stratification
                </h3>
                <p className="text-xs text-[#667085]">
                  Distribution of highest forecasted risk level per patient
                </p>
              </div>
              <span className="text-xs font-mono text-[#98A2B3]">
                {overview.total_patients} Patients
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#C2414B]">Critical Risk</span>
                  <span className="font-mono text-[#17191C]">
                    {overview.risk_distribution["CRITICAL"] || 0} pts
                  </span>
                </div>
                <div className="w-full bg-[#F6F7F9] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#C2414B] h-2 rounded-full"
                    style={{
                      width: `${
                        ((overview.risk_distribution["CRITICAL"] || 0) /
                          Math.max(1, overview.total_patients)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#B7791F]">High Risk</span>
                  <span className="font-mono text-[#17191C]">
                    {overview.risk_distribution["HIGH"] || 0} pts
                  </span>
                </div>
                <div className="w-full bg-[#F6F7F9] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#B7791F] h-2 rounded-full"
                    style={{
                      width: `${
                        ((overview.risk_distribution["HIGH"] || 0) /
                          Math.max(1, overview.total_patients)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#667085]">Moderate Risk</span>
                  <span className="font-mono text-[#17191C]">
                    {overview.risk_distribution["MODERATE"] || 0} pts
                  </span>
                </div>
                <div className="w-full bg-[#F6F7F9] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#98A2B3] h-2 rounded-full"
                    style={{
                      width: `${
                        ((overview.risk_distribution["MODERATE"] || 0) /
                          Math.max(1, overview.total_patients)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-[#15803D]">Controlled / Nominal</span>
                  <span className="font-mono text-[#17191C]">
                    {overview.risk_distribution["LOW"] || 0} pts
                  </span>
                </div>
                <div className="w-full bg-[#F6F7F9] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#15803D] h-2 rounded-full"
                    style={{
                      width: `${
                        ((overview.risk_distribution["LOW"] || 0) /
                          Math.max(1, overview.total_patients)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Prevalent High-Risk Endpoints */}
          <div className="border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-3">
            <div className="pb-3 border-b border-[#E9EBEF]">
              <h3 className="text-sm font-semibold text-[#17191C]">
                Flagged Clinical Endpoints
              </h3>
              <p className="text-xs text-[#667085]">
                Most prevalent disease conditions exceeding clinical risk thresholds
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {overview.prevalent_high_risk_diseases.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[#FAFAFB] rounded-md border border-[#E9EBEF] text-xs"
                >
                  <span className="font-medium text-[#17191C] truncate">{d.disease}</span>
                  <span className="font-mono font-semibold text-[#C2414B] bg-[#C2414B]/10 px-2 py-0.5 rounded text-[11px] shrink-0 ml-2">
                    {d.count} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Urgent Triage Surveillance Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E9EBEF]">
              <div>
                <h3 className="text-sm font-semibold text-[#17191C]">
                  Priority Triage Surveillance
                </h3>
                <p className="text-xs text-[#667085]">
                  Patients with escalating risk velocity (ΔRisk/ΔVisit)
                </p>
              </div>
              <button
                onClick={onNavigateToPatients}
                className="text-[11px] font-semibold text-[#386DF4] hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="flex-1 space-y-2 pt-1">
              {triage.triage_queue.slice(0, 5).map((item) => {
                const percent = Math.round(item.latest_risk_score * 100);
                const isIcu = item.cohort_type.includes("ICU");

                return (
                  <div
                    key={item.patient_id}
                    onClick={() => onSelectPatient(item.patient_id)}
                    className="p-3 rounded-md border border-[#E9EBEF] hover:border-[#386DF4]/40 hover:bg-[#FAFAFB] transition-all cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.is_urgent ? "bg-[#C2414B]" : "bg-[#B7791F]"
                          }`}
                        />
                        <span className="font-semibold text-[#17191C] group-hover:text-[#386DF4] transition-colors">
                          {item.full_name}
                        </span>
                        <span className="text-[10px] font-mono text-[#98A2B3]">
                          {item.mrn}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          isIcu ? "bg-[#C2414B]/10 text-[#C2414B]" : "bg-[#EDF3FF] text-[#386DF4]"
                        }`}
                      >
                        {isIcu ? "ICU" : "Outpatient"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#667085]">
                      <span className="truncate max-w-[170px]">{item.primary_disease}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span
                          className={`font-semibold ${
                            percent >= 70 ? "text-[#C2414B]" : "text-[#B7791F]"
                          }`}
                        >
                          {percent}%
                        </span>
                        <span
                          className={`inline-flex items-center text-[10px] ${
                            item.risk_velocity > 0 ? "text-[#C2414B]" : "text-[#15803D]"
                          }`}
                        >
                          {item.risk_velocity > 0 ? (
                            <TrendingUp className="h-3 w-3 mr-0.5" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-0.5" />
                          )}
                          {item.risk_velocity > 0
                            ? `+${(item.risk_velocity * 100).toFixed(1)}%`
                            : `${(item.risk_velocity * 100).toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
