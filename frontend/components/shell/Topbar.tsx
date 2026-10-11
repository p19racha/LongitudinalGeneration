"use client";

import React from "react";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";
import {
  Bell,
  Search,
  Plus,
  PanelRight,
  UploadCloud,
  Layers,
} from "lucide-react";
import { CohortType } from "@/types/clinical";

interface TopbarProps {
  breadcrumbs: BreadcrumbItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cohortFilter: CohortType | "ALL";
  onCohortFilterChange: (cohort: CohortType | "ALL") => void;
  unacknowledgedAlertsCount: number;
  onOpenAlerts: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onOpenNewPatient: () => void;
  onOpenBatchImport: () => void;
  showCohortFilter?: boolean;
}

export function Topbar({
  breadcrumbs,
  searchQuery,
  onSearchChange,
  cohortFilter,
  onCohortFilterChange,
  unacknowledgedAlertsCount,
  onOpenAlerts,
  inspectorOpen,
  onToggleInspector,
  onOpenNewPatient,
  onOpenBatchImport,
  showCohortFilter = true,
}: TopbarProps) {
  return (
    <header className="h-14 bg-[#FFFFFF] border-b border-[#E9EBEF] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center min-w-0 max-w-[40%]">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Center: Global Search & Cohort Filter */}
      <div className="flex items-center gap-2.5 flex-1 max-w-md justify-center">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#98A2B3]" />
          <input
            type="text"
            placeholder="Search patients, MRN, biomarkers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-[#F6F7F9] hover:bg-[#FAFAFB] focus:bg-[#FFFFFF] text-[13px] text-[#17191C] placeholder-[#98A2B3] rounded-md border border-[#E9EBEF] focus:border-[#386DF4] focus:ring-1 focus:ring-[#386DF4] outline-none transition-all"
          />
        </div>

        {showCohortFilter && (
          <div className="hidden lg:flex items-center gap-1 bg-[#FAFAFB] border border-[#E9EBEF] rounded-md p-0.5 text-[11px] font-medium shrink-0">
            <Layers className="h-3 w-3 text-[#98A2B3] ml-1.5 mr-0.5 shrink-0" />
            <button
              onClick={() => onCohortFilterChange("ALL")}
              className={`px-2 py-1 rounded transition-colors ${
                cohortFilter === "ALL"
                  ? "bg-[#FFFFFF] text-[#17191C] font-semibold shadow-xs border border-[#E9EBEF]"
                  : "text-[#667085] hover:text-[#17191C]"
              }`}
            >
              All Cohorts
            </button>
            <button
              onClick={() => onCohortFilterChange("OUTPATIENT_CHRONIC")}
              className={`px-2 py-1 rounded transition-colors ${
                cohortFilter === "OUTPATIENT_CHRONIC"
                  ? "bg-[#FFFFFF] text-[#17191C] font-semibold shadow-xs border border-[#E9EBEF]"
                  : "text-[#667085] hover:text-[#17191C]"
              }`}
            >
              Outpatient
            </button>
            <button
              onClick={() => onCohortFilterChange("INPATIENT_ACUTE_ICU")}
              className={`px-2 py-1 rounded transition-colors ${
                cohortFilter === "INPATIENT_ACUTE_ICU"
                  ? "bg-[#FFFFFF] text-[#17191C] font-semibold shadow-xs border border-[#E9EBEF]"
                  : "text-[#667085] hover:text-[#17191C]"
              }`}
            >
              ICU Acute
            </button>
          </div>
        )}
      </div>

      {/* Right: Actions, Alerts, Inspector Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenBatchImport}
          title="Import EHR Records via CSV"
          className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 text-[12px] font-medium text-[#667085] hover:text-[#17191C] bg-[#FFFFFF] hover:bg-[#F6F7F9] border border-[#E9EBEF] rounded-md transition-colors"
        >
          <UploadCloud className="h-3.5 w-3.5 text-[#667085]" />
          <span>Import CSV</span>
        </button>

        <button
          onClick={onOpenNewPatient}
          className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold text-white bg-[#386DF4] hover:bg-[#2F5ECC] rounded-md shadow-xs transition-colors"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>New Patient</span>
        </button>

        <div className="h-4 w-px bg-[#E9EBEF] mx-0.5 hidden sm:block" />

        {/* Alerts trigger */}
        <button
          onClick={onOpenAlerts}
          title="Clinical Alerts"
          className="relative h-8 w-8 rounded-md flex items-center justify-center text-[#667085] hover:text-[#17191C] hover:bg-[#F6F7F9] border border-transparent hover:border-[#E9EBEF] transition-all"
        >
          <Bell className="h-4 w-4" />
          {unacknowledgedAlertsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C2414B] text-white text-[10px] font-mono font-bold flex items-center justify-center leading-none">
              {unacknowledgedAlertsCount}
            </span>
          )}
        </button>

        {/* Right Inspector Toggle */}
        <button
          onClick={onToggleInspector}
          title={inspectorOpen ? "Hide Inspector" : "Show Inspector"}
          className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${
            inspectorOpen
              ? "bg-[#EDF3FF] text-[#386DF4] border border-[#D3E2FE]"
              : "text-[#667085] hover:text-[#17191C] hover:bg-[#F6F7F9] border border-transparent hover:border-[#E9EBEF]"
          }`}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
