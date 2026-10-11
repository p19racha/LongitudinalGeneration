"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Bell,
  UploadCloud,
  Info,
  ChevronLeft,
  ChevronRight,
  Activity,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export type NavItem = "overview" | "patients" | "analytics" | "alerts" | "copilot";

interface SidebarProps {
  activeItem: NavItem;
  onNavigate: (item: NavItem) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unacknowledgedAlertsCount: number;
  isApiHealthy: boolean;
  onOpenNewPatient: () => void;
  onOpenBatchImport: () => void;
  onOpenAbout: () => void;
}

export function Sidebar({
  activeItem,
  onNavigate,
  collapsed,
  onToggleCollapse,
  unacknowledgedAlertsCount,
  isApiHealthy,
  onOpenNewPatient,
  onOpenBatchImport,
  onOpenAbout,
}: SidebarProps) {
  const navItems: Array<{
    id: NavItem;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeVariant?: "default" | "critical";
  }> = [
    {
      id: "overview",
      label: "Clinical Overview",
      icon: LayoutDashboard,
    },
    {
      id: "patients",
      label: "Patient Registry",
      icon: Users,
    },
    {
      id: "analytics",
      label: "Population Health",
      icon: BarChart3,
    },
    {
      id: "alerts",
      label: "Deterioration Alerts",
      icon: Bell,
      badge: unacknowledgedAlertsCount > 0 ? unacknowledgedAlertsCount : undefined,
      badgeVariant: "critical",
    },
    {
      id: "copilot",
      label: "Clinical AI Co-Pilot",
      icon: Sparkles,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-[#FAFAFB] border-r border-[#E9EBEF] text-[#17191C] select-none transition-all duration-200 z-30 shrink-0 ${
        collapsed ? "w-16" : "w-[236px]"
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#E9EBEF]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#386DF4] text-white flex items-center justify-center shrink-0 font-mono text-xs font-semibold shadow-xs">
            P
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-[13px] font-semibold tracking-tight text-[#17191C] truncate">
                PULSE CDSS
              </span>
              <span className="text-[10px] text-[#667085] font-mono tracking-tight">
                v2.6 • SaMD Tier II
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="h-6 w-6 rounded flex items-center justify-center text-[#667085] hover:text-[#17191C] hover:bg-[#F6F7F9] transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1.5">
          {!collapsed ? (
            <span className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider">
              Workspace
            </span>
          ) : (
            <div className="h-2" />
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-[#FFFFFF] text-[#386DF4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-[#E9EBEF]"
                  : "text-[#667085] hover:text-[#17191C] hover:bg-[#F6F7F9] border border-transparent"
              } ${collapsed ? "justify-center px-0" : ""}`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-[#386DF4]" : "text-[#667085]"
                }`}
              />
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    item.badgeVariant === "critical"
                      ? "bg-[#C2414B]/10 text-[#C2414B]"
                      : "bg-[#EDF3FF] text-[#386DF4]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge !== undefined && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C2414B]" />
              )}
            </button>
          );
        })}

        {/* Quick Actions Section */}
        <div className="pt-4 px-2 pb-1.5">
          {!collapsed ? (
            <span className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider">
              Actions
            </span>
          ) : (
            <div className="h-px bg-[#E9EBEF] my-2" />
          )}
        </div>

        <button
          onClick={onOpenNewPatient}
          title={collapsed ? "Enroll Patient" : undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-[#667085] hover:text-[#17191C] hover:bg-[#F6F7F9] transition-all border border-transparent ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <Activity className="h-4 w-4 shrink-0 text-[#667085]" />
          {!collapsed && <span className="truncate flex-1 text-left">Enroll Patient</span>}
        </button>

        <button
          onClick={onOpenBatchImport}
          title={collapsed ? "Batch Import" : undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium text-[#667085] hover:text-[#17191C] hover:bg-[#F6F7F9] transition-all border border-transparent ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <UploadCloud className="h-4 w-4 shrink-0 text-[#667085]" />
          {!collapsed && <span className="truncate flex-1 text-left">Import EHR CSV</span>}
        </button>
      </div>

      {/* Footer Area: PyTorch Engine Status + About Research */}
      <div className="p-2 border-t border-[#E9EBEF] space-y-1">
        {/* Engine status indicator */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] text-[#667085] ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={isApiHealthy ? "PULSE Inference Engine: Online" : "PULSE Inference Engine: Offline"}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isApiHealthy ? "bg-[#15803D]" : "bg-[#C2414B]"
            }`}
          />
          {!collapsed && (
            <span className="truncate font-mono">
              {isApiHealthy ? "PyTorch Engine Active" : "Engine Disconnected"}
            </span>
          )}
        </div>

        {/* About & Research link */}
        <button
          onClick={onOpenAbout}
          title={collapsed ? "Research & Attribution" : undefined}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-[#667085] hover:text-[#17191C] hover:bg-[#F6F7F9] transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="truncate">Research & Safety</span>}
        </button>
      </div>
    </aside>
  );
}
