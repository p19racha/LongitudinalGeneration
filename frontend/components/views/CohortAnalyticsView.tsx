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
  AlertTriangle,
  ArrowRight,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { CohortOverviewResponse, TriageRadarResponse, TriageItem } from "@/types/clinical";

interface CohortAnalyticsViewProps {
  onSelectPatient: (patientId: string) => void;
  onOpenBatchImport: () => void;
}

export function CohortAnalyticsView({
  onSelectPatient,
  onOpenBatchImport,
}: CohortAnalyticsViewProps) {
  const [overview, setOverview] = useState<CohortOverviewResponse | null>(null);
  const [triage, setTriage] = useState<TriageRadarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center space-y-4">
        <Activity className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-800">
          Aggregating population health statistics and computing longitudinal triage velocity...
        </p>
      </div>
    );
  }

  if (error || !overview || !triage) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
        <h3 className="font-bold text-slate-900 text-base">Failed to Load Cohort Analytics</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
        <Button onClick={loadData} size="sm" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              Population Health & Clinical Triage Radar
            </h2>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px]">
              Multi-Cohort Macro View
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-cohort disease risk distributions, trajectory velocity ranking, and molecular omics synthesis coverage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs text-slate-600 gap-1.5 h-8"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={onOpenBatchImport}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 h-8 shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Import Labs CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registry */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Enrolled Population</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {overview.total_patients} Patients
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 pt-0">
            <span>{overview.outpatient_count} Outpatient • {overview.icu_count} ICU Acute</span>
          </CardContent>
        </Card>

        {/* Urgent Triage Flags */}
        <Card className="border-rose-200 bg-rose-50/40 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-xs font-bold uppercase tracking-wider">Urgent Triage Flags</span>
              <ShieldAlert className="h-4 w-4 text-rose-600 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-black text-rose-900 mt-1">
              {triage.urgent_count} Critical / Rising
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-rose-700 pt-0 font-medium">
            <span>Requiring prioritized clinical review</span>
          </CardContent>
        </Card>

        {/* Longitudinal Depth */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Longitudinal Depth</span>
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {overview.average_encounters_per_patient} Visits / Pt
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 pt-0">
            <span>{overview.total_measurements} Total Observations Ingested</span>
          </CardContent>
        </Card>

        {/* Omics Synthesis Coverage */}
        <Card className="border-purple-200 bg-purple-50/40 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-xs font-bold uppercase tracking-wider">PULSE Omics Synthesis</span>
              <Dna className="h-4 w-4 text-purple-600" />
            </div>
            <CardTitle className="text-2xl font-black text-purple-900 mt-1">
              {overview.omics_synthesis_rate_pct}% Reconstructed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-purple-700 pt-0 font-medium">
            <span>{overview.synthetic_omics_count} Proteomic & Lipid Biomarkers</span>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Risk Stratification Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Risk Distribution Breakdown */}
        <Card className="border-slate-200 bg-white shadow-xs lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              Patient Risk Stratification Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Categorization based on latest multi-disease calibrated forecasts across all active profiles.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-3">
              {/* Critical */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-rose-700">Critical Risk Category</span>
                  <span className="font-mono text-slate-700">{overview.risk_distribution["CRITICAL"] || 0} Patients</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-rose-600 h-2 rounded-full"
                    style={{
                      width: `${((overview.risk_distribution["CRITICAL"] || 0) / Math.max(1, overview.total_patients)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* High */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-amber-700">High Risk Category</span>
                  <span className="font-mono text-slate-700">{overview.risk_distribution["HIGH"] || 0} Patients</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{
                      width: `${((overview.risk_distribution["HIGH"] || 0) / Math.max(1, overview.total_patients)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Moderate */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-yellow-700">Moderate Risk Category</span>
                  <span className="font-mono text-slate-700">{overview.risk_distribution["MODERATE"] || 0} Patients</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${((overview.risk_distribution["MODERATE"] || 0) / Math.max(1, overview.total_patients)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Low */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-emerald-700">Low / Controlled Risk</span>
                  <span className="font-mono text-slate-700">{overview.risk_distribution["LOW"] || 0} Patients</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${((overview.risk_distribution["LOW"] || 0) / Math.max(1, overview.total_patients)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prevalent High Risk Endpoints */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              Prevalent High-Risk Endpoints
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Most frequent clinical risk flags across the hospital population.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            {overview.prevalent_high_risk_diseases.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No high-risk endpoints flagged.</p>
            ) : (
              overview.prevalent_high_risk_diseases.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs"
                >
                  <span className="font-semibold text-slate-800">{d.disease}</span>
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold font-mono text-[11px]">
                    {d.count} Cases
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clinical Triage Radar Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-indigo-600" />
                Clinical Triage Radar Queue (Ranked by Risk & Velocity)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Patients prioritized by predicted disease probability and longitudinal rate of change (ΔRisk/ΔVisit).
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {triage.triage_queue.length} Active Records
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-700 text-center w-20">Priority</TableHead>
                <TableHead className="font-bold text-slate-700">Patient & MRN</TableHead>
                <TableHead className="font-bold text-slate-700">Cohort</TableHead>
                <TableHead className="font-bold text-slate-700">Primary Risk Flag</TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Score</TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Risk Velocity</TableHead>
                <TableHead className="font-bold text-slate-700 text-center">Encounters</TableHead>
                <TableHead className="font-bold text-slate-700 text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {triage.triage_queue.map((item) => {
                const percent = Math.round(item.latest_risk_score * 100);
                const isIcu = item.cohort_type.includes("ICU");

                return (
                  <TableRow
                    key={item.patient_id}
                    className={`hover:bg-slate-50/80 transition ${
                      item.is_urgent ? "bg-rose-50/20" : ""
                    }`}
                  >
                    {/* Priority Alert Indicator */}
                    <TableCell className="text-center">
                      {item.is_urgent ? (
                        <span className="inline-flex items-center justify-center p-1 rounded-full bg-rose-100 text-rose-700 animate-pulse">
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">●</span>
                      )}
                    </TableCell>

                    {/* Patient Name & MRN */}
                    <TableCell>
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">
                          {item.full_name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {item.mrn}
                        </span>
                      </div>
                    </TableCell>

                    {/* Cohort Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          isIcu
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}
                      >
                        {isIcu ? "ICU Acute" : "Outpatient"}
                      </Badge>
                    </TableCell>

                    {/* Primary Disease */}
                    <TableCell className="font-medium text-slate-800 text-xs">
                      {item.primary_disease}
                    </TableCell>

                    {/* Risk Score */}
                    <TableCell className="text-center font-mono">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          item.latest_risk_category === "CRITICAL"
                            ? "bg-rose-600 text-white"
                            : item.latest_risk_category === "HIGH"
                            ? "bg-amber-500 text-white"
                            : item.latest_risk_category === "MODERATE"
                            ? "bg-yellow-500 text-white"
                            : item.latest_risk_category === "LOW"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {percent}%
                      </span>
                    </TableCell>

                    {/* Risk Velocity */}
                    <TableCell className="text-center font-mono text-xs">
                      {item.velocity_direction === "ACCELERATING_UP" ? (
                        <span className="text-rose-600 font-bold inline-flex items-center gap-0.5">
                          <TrendingUp className="h-3.5 w-3.5" />
                          +{Math.round(item.risk_velocity * 100)}%
                        </span>
                      ) : item.velocity_direction === "IMPROVING_DOWN" ? (
                        <span className="text-emerald-600 font-bold inline-flex items-center gap-0.5">
                          <TrendingDown className="h-3.5 w-3.5" />
                          {Math.round(item.risk_velocity * 100)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 inline-flex items-center gap-0.5">
                          <Minus className="h-3.5 w-3.5" />
                          Stable
                        </span>
                      )}
                    </TableCell>

                    {/* Encounter Count */}
                    <TableCell className="text-center font-mono text-xs text-slate-600">
                      {item.total_visits}
                    </TableCell>

                    {/* Action Button */}
                    <TableCell className="text-right pr-6">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectPatient(item.patient_id)}
                        className="h-7 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1"
                      >
                        <span>Dossier</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
