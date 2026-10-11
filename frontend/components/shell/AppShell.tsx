"use client";

import React, { useState } from "react";
import { Sidebar, NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";
import { RightInspector, InspectorContent } from "./RightInspector";
import { BreadcrumbItem } from "./Breadcrumbs";
import { CohortType, Patient } from "@/types/clinical";

interface AppShellProps {
  children: React.ReactNode;
  activeNav: NavItem;
  onNavigate: (item: NavItem) => void;
  breadcrumbs: BreadcrumbItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cohortFilter: CohortType | "ALL";
  onCohortFilterChange: (cohort: CohortType | "ALL") => void;
  unacknowledgedAlertsCount: number;
  onOpenAlerts: () => void;
  isApiHealthy: boolean;
  onOpenNewPatient: () => void;
  onOpenBatchImport: () => void;
  onOpenAbout: () => void;
  onOpenInBrowser?: () => void;
  inspectorContent: InspectorContent;
  onSelectPatient?: (id: string) => void;
  onRunPulse?: (id: string) => void;
  isRunningPulse?: boolean;
  showCohortFilter?: boolean;
}

export function AppShell({
  children,
  activeNav,
  onNavigate,
  breadcrumbs,
  searchQuery,
  onSearchChange,
  cohortFilter,
  onCohortFilterChange,
  unacknowledgedAlertsCount,
  onOpenAlerts,
  isApiHealthy,
  onOpenNewPatient,
  onOpenBatchImport,
  onOpenAbout,
  onOpenInBrowser,
  inspectorContent,
  onSelectPatient,
  onRunPulse,
  isRunningPulse,
  showCohortFilter = true,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);

  // Automatically open inspector when valid context is loaded
  const hasInspectorContent = inspectorContent.type !== "none";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FFFFFF] text-[#17191C] font-sans">
      {/* 1. Left Linear-Style Sidebar */}
      <Sidebar
        activeItem={activeNav}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        unacknowledgedAlertsCount={unacknowledgedAlertsCount}
        isApiHealthy={isApiHealthy}
        onOpenNewPatient={onOpenNewPatient}
        onOpenBatchImport={onOpenBatchImport}
        onOpenAbout={onOpenAbout}
      />

      {/* 2. Main Vertical Stack (Topbar + Canvas) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Topbar
          breadcrumbs={breadcrumbs}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          cohortFilter={cohortFilter}
          onCohortFilterChange={onCohortFilterChange}
          unacknowledgedAlertsCount={unacknowledgedAlertsCount}
          onOpenAlerts={() => {
            onOpenAlerts();
            setInspectorOpen(true);
          }}
          inspectorOpen={inspectorOpen || hasInspectorContent}
          onToggleInspector={() => setInspectorOpen((prev) => !prev)}
          onOpenNewPatient={onOpenNewPatient}
          onOpenBatchImport={onOpenBatchImport}
          onOpenInBrowser={onOpenInBrowser}
          showCohortFilter={showCohortFilter}
        />

        {/* Center Canvas + Right Inspector Split */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-[#FFFFFF] px-6 sm:px-8 py-6">
            <div className="max-w-[1400px] mx-auto w-full">{children}</div>
          </main>

          {/* Right Contextual Inspector */}
          {(inspectorOpen || hasInspectorContent) && (
            <RightInspector
              isOpen={inspectorOpen || hasInspectorContent}
              onClose={() => setInspectorOpen(false)}
              content={inspectorContent}
              onSelectPatient={onSelectPatient}
              onRunPulse={onRunPulse}
              isRunningPulse={isRunningPulse}
            />
          )}
        </div>
      </div>
    </div>
  );
}
