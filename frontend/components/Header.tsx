"use client";

import React from "react";
import { Activity, UserPlus, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CohortType } from "@/types/clinical";

interface HeaderProps {
  cohortFilter: CohortType | "ALL";
  onCohortFilterChange: (cohort: CohortType | "ALL") => void;
  onOpenNewPatient: () => void;
  isApiHealthy: boolean;
  selectedPatientName?: string;
  onBackToDirectory?: () => void;
}

export function Header({
  cohortFilter,
  onCohortFilterChange,
  onOpenNewPatient,
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
                onClick={onBackToDirectory}
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
          {selectedPatientName && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToDirectory}
              className="text-xs text-slate-600"
            >
              ← Back to Patient Registry
            </Button>
          )}

          {/* Cohort Selector Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-medium">
            <button
              onClick={() => onCohortFilterChange("ALL")}
              className={`px-3 py-1 rounded-md transition ${
                cohortFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Cohorts
            </button>
            <button
              onClick={() => onCohortFilterChange("OUTPATIENT_CHRONIC")}
              className={`px-3 py-1 rounded-md transition ${
                cohortFilter === "OUTPATIENT_CHRONIC"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Outpatient Omics
            </button>
            <button
              onClick={() => onCohortFilterChange("INPATIENT_ACUTE_ICU")}
              className={`px-3 py-1 rounded-md transition ${
                cohortFilter === "INPATIENT_ACUTE_ICU"
                  ? "bg-white text-rose-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Inpatient ICU
            </button>
          </div>

          {/* Add Patient Button */}
          <Button
            onClick={onOpenNewPatient}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>New Patient</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
