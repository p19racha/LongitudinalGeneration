"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  UserPlus,
  Dna,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  PanelRight,
  Activity,
  Layers,
} from "lucide-react";
import { Patient, CohortType } from "@/types/clinical";

interface PatientRegistryViewProps {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  onInspectPatient: (patient: Patient) => void;
  cohortFilter: CohortType | "ALL";
  onCohortFilterChange: (cohort: CohortType | "ALL") => void;
  isLoading: boolean;
  onOpenNewPatient: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function PatientRegistryView({
  patients,
  selectedPatientId,
  onSelectPatient,
  onInspectPatient,
  cohortFilter,
  onCohortFilterChange,
  isLoading,
  onOpenNewPatient,
  searchQuery,
  onSearchChange,
}: PatientRegistryViewProps) {
  const [riskFilter, setRiskFilter] = useState<"ALL" | "CRITICAL_HIGH" | "CONTROLLED">("ALL");

  // Helper to extract highest risk from patient's latest visit
  const getPatientRiskProfile = (p: Patient) => {
    if (!p.visits || p.visits.length === 0) return { disease: "None", percent: 0, category: "LOW" as const };
    const latestVisit = [...p.visits].sort((a, b) => b.visit_index - a.visit_index)[0];
    if (!latestVisit.predictions || latestVisit.predictions.length === 0) {
      return { disease: "Pending PULSE", percent: 0, category: "LOW" as const };
    }
    const maxPred = [...latestVisit.predictions].sort(
      (a, b) => b.risk_probability - a.risk_probability
    )[0];
    return {
      disease: maxPred.disease_name,
      percent: Math.round(maxPred.risk_probability * 100),
      category: maxPred.risk_category,
    };
  };

  // Helper to count synthetic omics measurements
  const getSyntheticCount = (p: Patient) => {
    return p.visits?.reduce(
      (acc, v) => acc + (v.measurements?.filter((m) => m.is_synthetic).length || 0),
      0
    ) || 0;
  };

  // Filter patients by search query, cohort, and risk
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Cohort filter
      if (cohortFilter !== "ALL" && p.cohort_type !== cohortFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.full_name.toLowerCase().includes(query);
        const matchesMrn = p.mrn.toLowerCase().includes(query);
        const matchesHistory = p.clinical_history_summary?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesMrn && !matchesHistory) {
          return false;
        }
      }
      // Risk filter
      if (riskFilter !== "ALL") {
        const risk = getPatientRiskProfile(p);
        if (riskFilter === "CRITICAL_HIGH") {
          if (risk.category !== "CRITICAL" && risk.category !== "HIGH") return false;
        } else if (riskFilter === "CONTROLLED") {
          if (risk.category !== "LOW" && risk.category !== "MODERATE") return false;
        }
      }
      return true;
    });
  }, [patients, cohortFilter, searchQuery, riskFilter]);

  return (
    <div className="space-y-6">
      {/* Page Title & Stats Bar (Reference 1 & 2 hybrid) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9EBEF]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#17191C]">
              Patient Cohort Registry
            </h1>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-[#F6F7F9] text-[#667085] border border-[#E9EBEF]">
              {filteredPatients.length} / {patients.length} Enrolled
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1">
            Clinical decision support workspace for longitudinal EHR surveillance and generative omics synthesis.
          </p>
        </div>

        <button
          onClick={onOpenNewPatient}
          className="h-8 px-3 text-xs font-semibold text-white bg-[#386DF4] hover:bg-[#2F5ECC] rounded-md transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <UserPlus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Enroll Patient</span>
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Cohort & Risk Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#98A2B3] text-[11px] font-medium uppercase tracking-wider">
            Risk Filter:
          </span>
          <div className="flex items-center bg-[#FAFAFB] border border-[#E9EBEF] rounded-md p-0.5">
            <button
              onClick={() => setRiskFilter("ALL")}
              className={`px-2 py-1 rounded transition-colors text-[11px] ${
                riskFilter === "ALL"
                  ? "bg-[#FFFFFF] text-[#17191C] font-semibold shadow-xs border border-[#E9EBEF]"
                  : "text-[#667085] hover:text-[#17191C]"
              }`}
            >
              All Risks
            </button>
            <button
              onClick={() => setRiskFilter("CRITICAL_HIGH")}
              className={`px-2 py-1 rounded transition-colors text-[11px] ${
                riskFilter === "CRITICAL_HIGH"
                  ? "bg-[#FFFFFF] text-[#C2414B] font-semibold shadow-xs border border-[#E9EBEF]"
                  : "text-[#667085] hover:text-[#C2414B]"
              }`}
            >
              Critical / High
            </button>
            <button
              onClick={() => setRiskFilter("CONTROLLED")}
              className={`px-2 py-1 rounded transition-colors text-[11px] ${
                riskFilter === "CONTROLLED"
                  ? "bg-[#FFFFFF] text-[#15803D] font-semibold shadow-xs border border-[#E9EBEF]"
                  : "text-[#667085] hover:text-[#15803D]"
              }`}
            >
              Controlled
            </button>
          </div>
        </div>

        {/* Search status */}
        {searchQuery && (
          <div className="flex items-center gap-1.5 text-xs text-[#667085]">
            <span>Filtering by:</span>
            <span className="font-medium text-[#17191C] bg-[#F6F7F9] px-2 py-0.5 rounded border border-[#E9EBEF]">
              "{searchQuery}"
            </span>
            <button
              onClick={() => onSearchChange("")}
              className="text-[#98A2B3] hover:text-[#17191C] underline text-[11px]"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Main Linear-Style Data Table */}
      <div className="border border-[#E9EBEF] rounded-lg bg-[#FFFFFF] overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-5 h-5 border-2 border-[#386DF4] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#667085]">Loading clinical registry...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-16 text-center text-[#98A2B3] space-y-2">
            <Search className="h-6 w-6 mx-auto stroke-[1.5] text-[#98A2B3]" />
            <p className="text-xs font-semibold text-[#17191C]">No Matching Patients Found</p>
            <p className="text-[11px] text-[#667085]">
              Adjust your search keywords or cohort/risk filters to find enrolled records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#17191C] divide-y divide-[#E9EBEF]">
              <thead className="bg-[#FAFAFB] text-[#667085] font-medium text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 w-10 text-center">Status</th>
                  <th className="py-2.5 px-4">Patient MRN & Name</th>
                  <th className="py-2.5 px-4">Demographics</th>
                  <th className="py-2.5 px-4">Cohort</th>
                  <th className="py-2.5 px-4 text-center">Encounters</th>
                  <th className="py-2.5 px-4">Synthetic Omics</th>
                  <th className="py-2.5 px-4">Primary Risk Forecast</th>
                  <th className="py-2.5 px-4 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EBEF]">
                {filteredPatients.map((p) => {
                  const risk = getPatientRiskProfile(p);
                  const syntheticCount = getSyntheticCount(p);
                  const isIcu = p.cohort_type === "INPATIENT_ACUTE_ICU";

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPatient(p.id)}
                      className="hover:bg-[#F6F7F9] transition-colors cursor-pointer group"
                    >
                      {/* Status Dot Indicator */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            risk.category === "CRITICAL"
                              ? "bg-[#C2414B]"
                              : risk.category === "HIGH"
                              ? "bg-[#B7791F]"
                              : "bg-[#15803D]"
                          }`}
                        />
                      </td>

                      {/* MRN & Name */}
                      <td className="py-3 px-4">
                        <div className="text-[13px] font-semibold text-[#17191C] group-hover:text-[#386DF4] transition-colors">
                          {p.full_name}
                        </div>
                        <div className="font-mono text-[11px] text-[#98A2B3]">
                          {p.mrn}
                        </div>
                      </td>

                      {/* Demographics */}
                      <td className="py-3 px-4 text-[#667085]">
                        <span className="font-mono">{p.age}</span> yrs • {p.sex}
                      </td>

                      {/* Cohort */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            isIcu
                              ? "bg-[#C2414B]/10 text-[#C2414B]"
                              : "bg-[#EDF3FF] text-[#386DF4]"
                          }`}
                        >
                          {isIcu ? "ICU Acute" : "Outpatient"}
                        </span>
                      </td>

                      {/* Encounters */}
                      <td className="py-3 px-4 text-center font-mono font-medium text-[#17191C]">
                        {p.visits?.length || 0}
                      </td>

                      {/* Synthetic Omics */}
                      <td className="py-3 px-4">
                        {syntheticCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#7856A8] bg-[#7856A8]/10 px-2 py-0.5 rounded">
                            <Dna className="h-3 w-3" />
                            <span>{syntheticCount} Omics</span>
                          </span>
                        ) : (
                          <span className="text-[#98A2B3] text-[11px] italic">
                            Labs only
                          </span>
                        )}
                      </td>

                      {/* Risk Forecast */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold font-mono tabular-nums text-[12px] ${
                              risk.category === "CRITICAL"
                                ? "text-[#C2414B]"
                                : risk.category === "HIGH"
                                ? "text-[#B7791F]"
                                : "text-[#15803D]"
                            }`}
                          >
                            {risk.percent > 0 ? `${risk.percent}%` : "—"}
                          </span>
                          <span className="text-[#667085] truncate max-w-[120px]">
                            {risk.disease}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectPatient(p);
                            }}
                            title="Inspect in side panel"
                            className="p-1 text-[#667085] hover:text-[#17191C] hover:bg-[#E9EBEF] rounded transition-colors"
                          >
                            <PanelRight className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPatient(p.id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#386DF4] hover:text-[#2F5ECC] px-2 py-1 rounded bg-[#EDF3FF] hover:bg-[#D3E2FE] transition-colors"
                          >
                            <span>Dossier</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
