"use client";

import React, { useState, useEffect } from "react";
import {
  Monitor,
  Globe,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

interface LaunchModeDialogProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function LaunchModeDialog({ forceOpen = false, onClose }: LaunchModeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(true);
  const [selectedMode, setSelectedMode] = useState<"desktop" | "web">("desktop");
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false);
  const [browserLaunched, setBrowserLaunched] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Check if preference already saved
    const saved = localStorage.getItem("pulse_workspace_mode");
    if (!saved) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleSelectDesktop = () => {
    if (rememberChoice) {
      localStorage.setItem("pulse_workspace_mode", "desktop");
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleSelectWeb = async () => {
    setIsOpeningBrowser(true);
    try {
      if (rememberChoice) {
        localStorage.setItem("pulse_workspace_mode", "web");
      }
      await api.openInBrowser();
      setBrowserLaunched(true);
      setTimeout(() => {
        setIsOpen(false);
        if (onClose) onClose();
      }, 1500);
    } catch {
      // Fallback: window.open
      window.open("http://localhost:8000", "_blank");
      setIsOpen(false);
      if (onClose) onClose();
    } finally {
      setIsOpeningBrowser(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
      <DialogContent className="sm:max-w-md bg-[#FFFFFF] border border-[#E9EBEF] text-[#17191C] p-6 rounded-xl shadow-2xl">
        <DialogHeader className="text-left space-y-2 pb-3 border-b border-[#E9EBEF]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#386DF4] text-white flex items-center justify-center font-mono text-xs font-semibold shadow-xs">
              P
            </div>
            <DialogTitle className="text-base font-semibold text-[#17191C]">
              PULSE CDSS Workspace Launcher
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[#667085]">
            Choose how you would like to run your clinical decision support session today:
          </DialogDescription>
        </DialogHeader>

        {browserLaunched ? (
          <div className="py-8 text-center space-y-2">
            <div className="h-10 w-10 rounded-full bg-[#15803D]/10 text-[#15803D] flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-[#17191C]">Browser Workspace Launched!</h4>
            <p className="text-xs text-[#667085]">
              Opened <strong>http://localhost:8000</strong> in your default browser.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Mode Option Cards */}
            <div className="grid grid-cols-1 gap-3">
              {/* Option 1: Native Desktop */}
              <div
                onClick={() => setSelectedMode("desktop")}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3.5 ${
                  selectedMode === "desktop"
                    ? "border-[#386DF4] bg-[#EDF3FF]/40 shadow-xs ring-1 ring-[#386DF4]"
                    : "border-[#E9EBEF] bg-[#FFFFFF] hover:border-[#D0D5DD] hover:bg-[#FAFAFB]"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                    selectedMode === "desktop"
                      ? "bg-[#386DF4] text-white shadow-xs"
                      : "bg-[#F6F7F9] text-[#667085]"
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[#17191C]">
                      Native Desktop Window (Recommended)
                    </h4>
                    {selectedMode === "desktop" && (
                      <span className="text-[10px] font-semibold text-[#386DF4] bg-[#EDF3FF] px-1.5 py-0.2 rounded border border-[#386DF4]/20">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#667085] mt-0.5 leading-snug">
                    Dedicated standalone workstation window with offline local execution and hardware-accelerated charting.
                  </p>
                </div>
              </div>

              {/* Option 2: Web Browser */}
              <div
                onClick={() => setSelectedMode("web")}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3.5 ${
                  selectedMode === "web"
                    ? "border-[#386DF4] bg-[#EDF3FF]/40 shadow-xs ring-1 ring-[#386DF4]"
                    : "border-[#E9EBEF] bg-[#FFFFFF] hover:border-[#D0D5DD] hover:bg-[#FAFAFB]"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                    selectedMode === "web"
                      ? "bg-[#386DF4] text-white shadow-xs"
                      : "bg-[#F6F7F9] text-[#667085]"
                  }`}
                >
                  <Globe className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[#17191C]">
                      Default Web Browser (Chrome / Firefox)
                    </h4>
                    {selectedMode === "web" && (
                      <span className="text-[10px] font-semibold text-[#386DF4] bg-[#EDF3FF] px-1.5 py-0.2 rounded border border-[#386DF4]/20">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#667085] mt-0.5 leading-snug">
                    Spawns <code className="font-mono text-[10px] bg-[#FAFAFB] px-1 rounded">http://localhost:8000</code> in your browser for multi-tab clinical workflows.
                  </p>
                </div>
              </div>
            </div>

            {/* Remember Checkbox */}
            <div className="flex items-center gap-2 pt-1 text-xs text-[#667085]">
              <input
                id="remember_choice"
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="h-3.5 w-3.5 text-[#386DF4] rounded border-[#E9EBEF] focus:ring-[#386DF4]"
              />
              <label htmlFor="remember_choice" className="select-none cursor-pointer">
                Remember my choice (switch anytime from the top bar)
              </label>
            </div>

            {/* Launch Action Button */}
            <div className="pt-3 border-t border-[#E9EBEF] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={selectedMode === "desktop" ? handleSelectDesktop : handleSelectWeb}
                disabled={isOpeningBrowser}
                className="h-8 px-4 bg-[#386DF4] hover:bg-[#2F5ECC] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <span>{selectedMode === "desktop" ? "Continue in Desktop Window" : "Open in Web Browser"}</span>
                {selectedMode === "desktop" ? (
                  <ArrowRight className="h-3.5 w-3.5" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
