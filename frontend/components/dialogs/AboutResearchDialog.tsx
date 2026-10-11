"use client";

import React from "react";
import {
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Award,
  FileCheck,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AboutResearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutResearchDialog({
  isOpen,
  onClose,
}: AboutResearchDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-[#FFFFFF] border border-[#E9EBEF] text-[#17191C] p-6 rounded-lg">
        <DialogHeader className="pb-3 border-b border-[#E9EBEF]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-[#386DF4] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[#17191C]">
                PULSE Framework & Regulatory Quality Architecture
              </DialogTitle>
              <DialogDescription className="text-xs text-[#667085] mt-0.5">
                Scientific foundations, academic attribution, and SaMD compliance specifications.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 text-xs py-2">
          {/* Scientific Publication Attribution */}
          <div className="p-4 rounded-md border border-[#E9EBEF] bg-[#FAFAFB] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#386DF4] flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Primary Publication</span>
              </span>
              <span className="font-mono text-[10px] text-[#667085] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E9EBEF]">
                Nature Computational Science (2026)
              </span>
            </div>

            <p className="font-semibold text-[13px] text-[#17191C] leading-snug">
              &ldquo;Longitudinal alignments and syntheses of multimodal clinical data for personalized medicine with the PULSE framework.&rdquo;
            </p>

            <div className="text-[11px] text-[#667085] space-y-1 pt-1">
              <p>
                <strong>Original Author:</strong>{" "}
                <a
                  href="https://github.com/ww20hust"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#386DF4] hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  Wei Wu (@ww20hust)
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </p>
              <p>
                <strong>Affiliation:</strong> Peking University / Huazhong University of Science and Technology (HUST)
              </p>
              <p>
                <strong>DOI:</strong>{" "}
                <a
                  href="https://www.nature.com/articles/s43588-026-00957-5"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#386DF4] hover:underline font-mono"
                >
                  10.1038/s43588-026-00957-5
                </a>
              </p>
            </div>
          </div>

          {/* Model Architecture Overview */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-[#17191C] uppercase tracking-wider text-[#667085]">
              Generative Modeling Architecture
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 rounded border border-[#E9EBEF] bg-[#FAFAFB]">
                <strong className="block text-[#17191C] mb-1">Cross-Modal Synthesis</strong>
                <span className="text-[#667085] leading-relaxed">
                  Deep variational latent alignment mapping routine blood panels to high-dimensional plasma metabolomics (Nightingale) and proteomics (Olink).
                </span>
              </div>
              <div className="p-3 rounded border border-[#E9EBEF] bg-[#FAFAFB]">
                <strong className="block text-[#17191C] mb-1">Temporal In Silico Sandbox</strong>
                <span className="text-[#667085] leading-relaxed">
                  Recurrent latent transitions allowing counterfactual biomarker clamping to forecast personalized absolute risk reductions (ARR).
                </span>
              </div>
            </div>
          </div>

          {/* SaMD & 21 CFR Part 11 Compliance */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-[#17191C] uppercase tracking-wider text-[#667085]">
              Regulatory & Interoperability Standards
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 p-2 rounded bg-[#FFFFFF] border border-[#E9EBEF]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D] shrink-0" />
                <span className="text-[#17191C]">
                  <strong>21 CFR Part 11:</strong> Timestamped audit trails for all algorithmic prognostic evaluations and alert acknowledgements.
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-[#FFFFFF] border border-[#E9EBEF]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D] shrink-0" />
                <span className="text-[#17191C]">
                  <strong>HL7 FHIR R4:</strong> Full export capability into Observation, RiskAssessment, and Bundle resources.
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-[#FFFFFF] border border-[#E9EBEF]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D] shrink-0" />
                <span className="text-[#17191C]">
                  <strong>HL7 CDS Hooks v2.0:</strong> Subscribed `patient-view` real-time clinical deterioration alerts.
                </span>
              </div>
            </div>
          </div>

          {/* Investigational SaMD Disclaimer */}
          <div className="p-3 rounded border border-[#B7791F]/30 bg-[#B7791F]/5 text-[11px] text-[#B7791F] leading-relaxed">
            <strong>Investigational Device Notice:</strong> The PULSE Clinical Decision Support System is an analytical software aid for licensed healthcare providers. Synthesized omics and prognostic projections provide probabilistic estimates and do not replace confirmatory laboratory diagnostic procedures.
          </div>
        </div>

        <div className="pt-3 border-t border-[#E9EBEF] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold text-white bg-[#386DF4] hover:bg-[#2F5ECC] rounded-md transition-colors shadow-xs"
          >
            Acknowledge & Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
