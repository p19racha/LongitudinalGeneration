"use client";

import React, { useState } from "react";
import { Search, UserCheck, Calendar, Activity, Dna, AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Patient, CohortType } from "@/types/clinical";

interface PatientDirectoryProps {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  cohortFilter: CohortType | "ALL";
  isLoading: boolean;
}

export function PatientDirectory({
  patients,
  selectedPatientId,
  onSelectPatient,
  cohortFilter,
  isLoading,
}: PatientDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = patients.filter((patient) => {
    const matchesCohort =
      cohortFilter === "ALL" || patient.cohort_type === cohortFilter;
    const matchesSearch =
      patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCohort && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Statistics Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by patient name or MRN (e.g., MRN-CV-10029)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
          <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Total Enrolled: <strong className="text-slate-900">{patients.length}</strong>
          </span>
          <span className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 text-indigo-700">
            Filtered: <strong className="text-indigo-900">{filteredPatients.length}</strong>
          </span>
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
          <Activity className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Loading clinical cohort records...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-xl border border-slate-200 text-slate-500 space-y-3">
          <UserCheck className="h-10 w-10 mx-auto text-slate-300" />
          <h3 className="font-semibold text-slate-700 text-base">No patients found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No patient records matched your filter criteria. Try adjusting your search term or cohort filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map((patient) => {
            const isSelected = patient.id === selectedPatientId;
            const visits = patient.visits || [];
            const hasSynthesized = visits.some((v) =>
              (v.measurements || []).some((m) => m.is_synthetic)
            );
            const latestVisit =
              visits.length > 0 ? visits[visits.length - 1] : null;
            const predictions = latestVisit?.predictions || [];
            const highRisk = predictions.find(
              (p) => p.risk_category === "HIGH" || p.risk_category === "CRITICAL"
            );

            return (
              <Card
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-indigo-300 relative overflow-hidden ${
                  isSelected
                    ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`h-1.5 w-full ${
                    patient.cohort_type === "OUTPATIENT_CHRONIC"
                      ? "bg-indigo-500"
                      : "bg-rose-500"
                  }`}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 hover:text-indigo-600 transition flex items-center gap-2">
                        {patient.full_name}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono font-medium text-slate-500 mt-0.5">
                        {patient.mrn}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold uppercase tracking-wider ${
                        patient.cohort_type === "OUTPATIENT_CHRONIC"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {patient.cohort_type === "OUTPATIENT_CHRONIC" ? "Outpatient" : "ICU Acute"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3.5 text-xs">
                  {/* Demographics Pill */}
                  <div className="flex items-center gap-3 text-slate-600 font-medium">
                    <span>{patient.age} yrs</span>
                    <span>•</span>
                    <span>{patient.sex === "M" ? "Male" : "Female"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {visits.length} {patient.cohort_type === "OUTPATIENT_CHRONIC" ? "Visits" : "Lab Steps"}
                    </span>
                  </div>

                  {/* Clinical Summary */}
                  {patient.clinical_history_summary && (
                    <p className="text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded-md border border-slate-100">
                      &quot;{patient.clinical_history_summary}&quot;
                    </p>
                  )}

                  {/* Status Badges */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {hasSynthesized ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          <Dna className="h-3 w-3" /> Omics Synthesized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Observed Only
                        </span>
                      )}
                    </div>

                    {highRisk && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        <AlertTriangle className="h-3 w-3" />
                        {highRisk.risk_category}: {Math.round(highRisk.risk_probability * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Card Action Link */}
                  <div className="pt-1 flex items-center justify-end text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                    <span>Inspect Profile</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
