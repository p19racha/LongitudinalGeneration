"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldAlert,
  Activity,
  Dna,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  UploadCloud,
  ChevronRight,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "@/lib/api";
import { CohortOverviewResponse, TriageRadarResponse } from "@/types/clinical";

interface PopulationHealthViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenBatchImport: () => void;
}

export function PopulationHealthView({
  onSelectPatient,
  onOpenBatchImport,
}: PopulationHealthViewProps) {
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
      setError(err instanceof Error ? err.message : "Failed to load population health data.");
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
          Computing population-level trajectories & triage velocities...
        </p>
      </div>
    );
  }

  if (error || !overview || !triage) {
    return (
      <div className="p-8 border border-[#E9EBEF] rounded-lg text-center space-y-3 bg-[#FFFFFF] max-w-md mx-auto my-12">
        <AlertCircle className="h-6 w-6 text-[#C2414B] mx-auto" />
        <h3 className="text-sm font-semibold text-[#17191C]">Unable to Load Analytics</h3>
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
      {/* Page Header (Reference 2 style: Clean, spacious, minimal) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E9EBEF]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#17191C]">
            Population Health & Triage Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Macro cohort risk stratification, longitudinal trajectory velocity, and omics reconstruction coverage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh statistics"
            className="h-8 px-2.5 text-xs font-medium text-[#667085] hover:text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={onOpenBatchImport}
            className="h-8 px-3 text-xs font-semibold text-white bg-[#386DF4] hover:bg-[#2F5ECC] rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UploadCloud className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Import Labs CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Section (Reference 2: Big, clear typography KPI numbers, 28–40px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Enrolled Patients */}
        <div className="p-5 rounded-lg border border-[#E9EBEF] bg-[#FFFFFF] space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Enrolled Patients</span>
            <Users className="h-4 w-4 text-[#98A2B3]" />
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

        {/* KPI 2: Urgent Triage */}
        <div className="p-5 rounded-lg border border-[#E9EBEF] bg-[#FFFFFF] space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Prioritized Triage</span>
            <ShieldAlert className="h-4 w-4 text-[#C2414B]" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-[#C2414B]">
            {triage.urgent_count}
          </div>
          <div className="text-[11px] text-[#667085] pt-1">
            <span>High Risk / Deteriorating trajectory</span>
          </div>
        </div>

        {/* KPI 3: Longitudinal Observations */}
        <div className="p-5 rounded-lg border border-[#E9EBEF] bg-[#FFFFFF] space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Clinical Observations</span>
            <Activity className="h-4 w-4 text-[#386DF4]" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-[#17191C]">
            {overview.total_measurements.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#667085] pt-1">
            <span>{overview.average_encounters_per_patient} visits / patient avg</span>
          </div>
        </div>

        {/* KPI 4: Omics Imputed */}
        <div className="p-5 rounded-lg border border-[#E9EBEF] bg-[#FFFFFF] space-y-1">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-medium uppercase tracking-wider">Synthetic Omics Rate</span>
            <Dna className="h-4 w-4 text-[#7856A8]" />
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight text-[#7856A8]">
            {overview.omics_synthesis_rate_pct}%
          </div>
          <div className="text-[11px] text-[#667085] pt-1">
            <span>{overview.synthetic_omics_count} imputed biomarkers</span>
          </div>
        </div>
      </div>

      {/* Cohort Risk Breakdown & High-Risk Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Breakdown */}
        <div className="lg:col-span-2 border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E9EBEF]">
            <div>
              <h3 className="text-sm font-semibold text-[#17191C]">
                Risk Stratification Breakdown
              </h3>
              <p className="text-xs text-[#667085]">
                Calibrated multi-disease forecasting categories across enrolled population
              </p>
            </div>
            <span className="text-xs font-mono text-[#98A2B3]">
              {overview.total_patients} Patients
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Critical */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-[#C2414B]">Critical Severity</span>
                <span className="font-mono text-[#17191C]">
                  {overview.risk_distribution["CRITICAL"] || 0} pts (
                  {Math.round(
                    ((overview.risk_distribution["CRITICAL"] || 0) /
                      Math.max(1, overview.total_patients)) *
                      100
                  )}
                  %)
                </span>
              </div>
              <div className="w-full bg-[#F6F7F9] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#C2414B] h-2 rounded-full transition-all duration-300"
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

            {/* High */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-[#B7791F]">High Risk</span>
                <span className="font-mono text-[#17191C]">
                  {overview.risk_distribution["HIGH"] || 0} pts (
                  {Math.round(
                    ((overview.risk_distribution["HIGH"] || 0) /
                      Math.max(1, overview.total_patients)) *
                      100
                  )}
                  %)
                </span>
              </div>
              <div className="w-full bg-[#F6F7F9] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#B7791F] h-2 rounded-full transition-all duration-300"
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

            {/* Moderate */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-[#667085]">Moderate Risk</span>
                <span className="font-mono text-[#17191C]">
                  {overview.risk_distribution["MODERATE"] || 0} pts (
                  {Math.round(
                    ((overview.risk_distribution["MODERATE"] || 0) /
                      Math.max(1, overview.total_patients)) *
                      100
                  )}
                  %)
                </span>
              </div>
              <div className="w-full bg-[#F6F7F9] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#98A2B3] h-2 rounded-full transition-all duration-300"
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

            {/* Low */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-[#15803D]">Controlled / Low Risk</span>
                <span className="font-mono text-[#17191C]">
                  {overview.risk_distribution["LOW"] || 0} pts (
                  {Math.round(
                    ((overview.risk_distribution["LOW"] || 0) /
                      Math.max(1, overview.total_patients)) *
                      100
                  )}
                  %)
                </span>
              </div>
              <div className="w-full bg-[#F6F7F9] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#15803D] h-2 rounded-full transition-all duration-300"
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

        {/* Prevalent High Risk Endpoints */}
        <div className="border border-[#E9EBEF] rounded-lg p-5 bg-[#FFFFFF] space-y-4">
          <div className="pb-3 border-b border-[#E9EBEF]">
            <h3 className="text-sm font-semibold text-[#17191C]">Prevalent High-Risk Endpoints</h3>
            <p className="text-xs text-[#667085]">Top clinical conditions flagged across cohorts</p>
          </div>

          <div className="space-y-2 pt-1">
            {overview.prevalent_high_risk_diseases.length === 0 ? (
              <p className="text-xs text-[#98A2B3] italic">No high-risk endpoints detected.</p>
            ) : (
              overview.prevalent_high_risk_diseases.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-[#FAFAFB] rounded-md border border-[#E9EBEF] text-xs"
                >
                  <span className="font-medium text-[#17191C] truncate">{d.disease}</span>
                  <span className="font-mono font-semibold text-[#C2414B] bg-[#C2414B]/10 px-2 py-0.5 rounded text-[11px] shrink-0 ml-2">
                    {d.count} Cases
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Clinical Triage Radar Table (Linear Style Dense Table) */}
      <div className="border border-[#E9EBEF] rounded-lg bg-[#FFFFFF] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E9EBEF] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#17191C]">
              Clinical Triage Radar Queue
            </h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Longitudinal rate-of-change (ΔRisk/ΔVisit) prioritized ranking for deterioration surveillance
            </p>
          </div>
          <span className="text-xs font-mono text-[#98A2B3]">
            {triage.triage_queue.length} Active Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#17191C] divide-y divide-[#E9EBEF]">
            <thead className="bg-[#FAFAFB] text-[#667085] font-medium text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">Status</th>
                <th className="py-2.5 px-4">Patient & MRN</th>
                <th className="py-2.5 px-4">Cohort</th>
                <th className="py-2.5 px-4">Primary Risk Flag</th>
                <th className="py-2.5 px-4 text-center">Forecast</th>
                <th className="py-2.5 px-4 text-center">Velocity (Δ)</th>
                <th className="py-2.5 px-4 text-center">Encounters</th>
                <th className="py-2.5 px-4 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EBEF]">
              {triage.triage_queue.map((item) => {
                const percent = Math.round(item.latest_risk_score * 100);
                const isIcu = item.cohort_type.includes("ICU");

                return (
                  <tr
                    key={item.patient_id}
                    onClick={() => onSelectPatient(item.patient_id)}
                    className={`hover:bg-[#F6F7F9] transition-colors cursor-pointer ${
                      item.is_urgent ? "bg-[#C2414B]/3" : ""
                    }`}
                  >
                    {/* Status Dot */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          item.is_urgent
                            ? "bg-[#C2414B]"
                            : percent >= 50
                            ? "bg-[#B7791F]"
                            : "bg-[#15803D]"
                        }`}
                      />
                    </td>

                    {/* Patient Name & MRN */}
                    <td className="py-3 px-4 font-medium">
                      <div className="text-[13px] text-[#17191C] font-semibold">
                        {item.full_name}
                      </div>
                      <div className="font-mono text-[11px] text-[#98A2B3]">
                        {item.mrn}
                      </div>
                    </td>

                    {/* Cohort */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isIcu
                            ? "bg-[#C2414B]/10 text-[#C2414B]"
                            : "bg-[#EDF3FF] text-[#386DF4]"
                        }`}
                      >
                        {isIcu ? "ICU Acute" : "Outpatient"}
                      </span>
                    </td>

                    {/* Primary Disease */}
                    <td className="py-3 px-4 font-medium text-[#17191C]">
                      {item.primary_disease}
                    </td>

                    {/* Forecast Score */}
                    <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums">
                      <span
                        className={
                          percent >= 70
                            ? "text-[#C2414B]"
                            : percent >= 40
                            ? "text-[#B7791F]"
                            : "text-[#15803D]"
                        }
                      >
                        {percent}%
                      </span>
                    </td>

                    {/* Risk Velocity */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
                          item.velocity_direction === "increasing"
                            ? "text-[#C2414B]"
                            : item.velocity_direction === "decreasing"
                            ? "text-[#15803D]"
                            : "text-[#98A2B3]"
                        }`}
                      >
                        {item.velocity_direction === "increasing" && (
                          <TrendingUp className="h-3.5 w-3.5" />
                        )}
                        {item.velocity_direction === "decreasing" && (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {item.velocity_direction === "stable" && (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                        {item.risk_velocity > 0
                          ? `+${(item.risk_velocity * 100).toFixed(1)}%`
                          : `${(item.risk_velocity * 100).toFixed(1)}%`}
                      </span>
                    </td>

                    {/* Visits Count */}
                    <td className="py-3 px-4 text-center font-mono text-[#667085]">
                      {item.total_visits}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right pr-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPatient(item.patient_id);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#386DF4] hover:text-[#2F5ECC] transition-colors"
                      >
                        <span>Inspect Dossier</span>
                        <ChevronRight className="h-3 w-3" />
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
