"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  UserCheck,
  TrendingUp,
  Activity,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { ClinicalAlert, AlertsListResponse } from "@/types/clinical";

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patientId: string) => void;
  onAlertsUpdated?: () => void;
}

export function AlertsDrawer({
  isOpen,
  onClose,
  onSelectPatient,
  onAlertsUpdated,
}: AlertsDrawerProps) {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | "CRITICAL" | "UNACKNOWLEDGED">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [clinicianName, setClinicianName] = useState("Dr. Attending Clinician");
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data.alerts);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const data = await api.triggerAlertScan();
      setAlerts(data.alerts);
      if (onAlertsUpdated) onAlertsUpdated();
    } catch (err) {
      console.error("Failed to run alert scan:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledgingId(alertId);
    try {
      const updated = await api.acknowledgeAlert(alertId, clinicianName, "Reviewed via Alert Center");
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? updated : a))
      );
      if (onAlertsUpdated) onAlertsUpdated();
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === "CRITICAL") return a.severity === "CRITICAL";
    if (filterSeverity === "UNACKNOWLEDGED") return !a.is_acknowledged;
    return true;
  });

  const unackCount = alerts.filter((a) => !a.is_acknowledged).length;
  const critCount = alerts.filter((a) => a.severity === "CRITICAL" && !a.is_acknowledged).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                <Bell className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Clinical Deterioration & SaMD Alert Center</span>
                  {critCount > 0 && (
                    <Badge variant="destructive" className="text-[11px] animate-pulse">
                      {critCount} Critical
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Continuous trajectory monitoring, acute velocity spikes, and 21 CFR Part 11 clinician review logs.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={isScanning}
              className="text-xs gap-1.5 h-8 border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Scanning..." : "Rescan Registry"}</span>
            </Button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between mt-4 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setFilterSeverity("ALL")}
                className={`px-3 py-1 rounded-md transition font-medium ${
                  filterSeverity === "ALL"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({alerts.length})
              </button>
              <button
                onClick={() => setFilterSeverity("UNACKNOWLEDGED")}
                className={`px-3 py-1 rounded-md transition font-medium ${
                  filterSeverity === "UNACKNOWLEDGED"
                    ? "bg-white text-amber-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Unreviewed ({unackCount})
              </button>
              <button
                onClick={() => setFilterSeverity("CRITICAL")}
                className={`px-3 py-1 rounded-md transition font-medium ${
                  filterSeverity === "CRITICAL"
                    ? "bg-white text-rose-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Critical Flags ({alerts.filter((a) => a.severity === "CRITICAL").length})
              </button>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>Reviewing As:</span>
              <input
                type="text"
                value={clinicianName}
                onChange={(e) => setClinicianName(e.target.value)}
                className="px-2 py-0.5 text-xs font-medium border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Alerts List Body */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
              Loading real-time clinical alert queue...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-8 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-slate-900">No Active Clinical Alerts</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All patient longitudinal trajectories and organ dysfunction metrics are stable or have been acknowledged by attending staff.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isCrit = alert.severity === "CRITICAL";
              const isWarn = alert.severity === "WARNING";

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border transition ${
                    isCrit
                      ? "bg-rose-50/60 border-rose-200 hover:border-rose-300"
                      : isWarn
                      ? "bg-amber-50/60 border-amber-200 hover:border-amber-300"
                      : "bg-blue-50/60 border-blue-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isCrit
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : isWarn
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-blue-100 text-blue-800 border-blue-300"
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                        <span className="text-xs font-bold text-slate-900">
                          {alert.patient_name}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          ({alert.mrn})
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-600">
                          {alert.cohort_type === "INPATIENT_ACUTE_ICU" ? "ICU Acute" : "Outpatient"}
                        </Badge>

                        {/* Velocity Badge */}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 ${
                            alert.velocity_direction === "ACCELERATING_UP"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <TrendingUp className="h-3 w-3" />
                          <span>ΔR/Δt: {alert.risk_velocity > 0 ? `+${alert.risk_velocity}` : alert.risk_velocity}</span>
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-900">
                        {alert.title}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {alert.message}
                      </p>

                      {alert.is_acknowledged && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>
                            Acknowledged by <strong className="font-semibold">{alert.acknowledged_by}</strong> on{" "}
                            {new Date(alert.acknowledged_at || "").toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => {
                          onSelectPatient(alert.patient_id);
                          onClose();
                        }}
                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-1 shadow-xs"
                      >
                        <span>Open Dossier</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>

                      {!alert.is_acknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledgingId === alert.id}
                          className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300 gap-1"
                        >
                          <UserCheck className="h-3 w-3 text-emerald-600" />
                          <span>{acknowledgingId === alert.id ? "Signing..." : "Acknowledge"}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Complies with SaMD Clinical Decision Support & 21 CFR Part 11 Electronic Signature standards.
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-slate-600">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
