"use client";

import React from "react";
import { Activity, UserPlus, FileSpreadsheet, ShieldAlert, Users, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CohortType } from "@/types/clinical";

interface HeaderProps {
  currentView: "registry" | "analytics";
  onViewChange: (view: "registry" | "analytics") => void;
  cohortFilter: CohortType | "ALL";
  onCohortFilterChange: (cohort: CohortType | "ALL") => void;
  onOpenNewPatient: () => void;
  onOpenBatchImport: () => void;
  onOpenAlerts: () => void;
  unacknowledgedAlertsCount?: number;
  isApiHealthy: boolean;
  selectedPatientName?: string;
  onBackToDirectory?: () => void;
}

export function Header({
  currentView,
  onViewChange,
  cohortFilter,
  onCohortFilterChange,
  onOpenNewPatient,
  onOpenBatchImport,
  onOpenAlerts,
  unacknowledgedAlertsCount = 0,
  isApiHealthy,
  selectedPatientName,
  onBackToDirectory,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md px-4 lg:px-8 py-3 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Attribution */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-500 text-white shadow-md shadow-indigo-500/20">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                onClick={() => {
                  onViewChange("registry");
                  if (onBackToDirectory) onBackToDirectory();
                }}
                className="text-lg font-bold tracking-tight text-slate-900 cursor-pointer hover:text-indigo-600 transition"
              >
                PULSE CDSS
              </span>
              <span className="text-xs px-2 py-0.5 font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Nature Comp Sci 2026
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isApiHealthy ? "bg-emerald-500 shadow-xs shadow-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span className="text-[11px] font-medium text-slate-500">
                  {isApiHealthy ? "Engine Online" : "Connecting..."}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Personalized Multimodal Longitudinal Synthesis</span>
              <span>•</span>
              <span className="text-slate-600 font-medium">Wei Wu (@ww20hust) et al.</span>
            </div>
          </div>
        </div>

        {/* Navigation & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Top-Level Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => {
                onViewChange("registry");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                currentView === "registry"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5 text-indigo-600" />
              <span>Patient Registry</span>
            </button>
            <button
              onClick={() => {
                onViewChange("analytics");
                if (onBackToDirectory) onBackToDirectory();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                currentView === "analytics"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
              <span>Population Health & Triage</span>
            </button>
          </div>

          {selectedPatientName && currentView === "registry" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToDirectory}
              className="text-xs text-slate-600"
            >
              ← Back to Directory
            </Button>
          )}

          {/* Cohort Selector Pills (Visible in Registry view when no single patient is selected) */}
          {currentView === "registry" && !selectedPatientName && (
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-medium">
              <button
                onClick={() => onCohortFilterChange("ALL")}
                className={`px-2.5 py-1 rounded-md transition ${
                  cohortFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => onCohortFilterChange("OUTPATIENT_CHRONIC")}
                className={`px-2.5 py-1 rounded-md transition ${
                  cohortFilter === "OUTPATIENT_CHRONIC"
                    ? "bg-white text-indigo-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Outpatient
              </button>
              <button
                onClick={() => onCohortFilterChange("INPATIENT_ACUTE_ICU")}
                className={`px-2.5 py-1 rounded-md transition ${
                  cohortFilter === "INPATIENT_ACUTE_ICU"
                    ? "bg-white text-rose-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ICU
              </button>
            </div>
          )}

          {/* Deterioration Alert Bell Button */}
          <Button
            onClick={onOpenAlerts}
            variant="outline"
            size="sm"
            className={`relative text-xs font-medium gap-1.5 shadow-2xs transition ${
              unacknowledgedAlertsCount > 0
                ? "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                : "bg-white text-slate-700 hover:text-slate-900 border-slate-200"
            }`}
          >
            <Bell className={`h-4 w-4 ${unacknowledgedAlertsCount > 0 ? "text-rose-600 animate-wiggle" : "text-slate-500"}`} />
            <span className="hidden sm:inline">Alerts</span>
            {unacknowledgedAlertsCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
                {unacknowledgedAlertsCount}
              </span>
            )}
          </Button>

          {/* Batch Ingest CSV */}
          <Button
            onClick={onOpenBatchImport}
            variant="outline"
            size="sm"
            className="text-xs font-medium text-slate-700 hover:text-slate-900 border-slate-200 bg-white gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Import CSV</span>
          </Button>

          {/* Add Patient Button */}
          <Button
            onClick={onOpenNewPatient}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>New Patient</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
