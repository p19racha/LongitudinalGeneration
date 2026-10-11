"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { CDSCard } from "@/types/clinical";

interface CDSCardsViewProps {
  patientId: string;
}

export function CDSCardsView({ patientId }: CDSCardsViewProps) {
  const [cards, setCards] = useState<CDSCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appliedAction, setAppliedAction] = useState<string | null>(null);

  const fetchCards = async () => {
    setIsLoading(true);
    try {
      const res = await api.evaluatePatientViewHook(patientId);
      setCards(res.cards || []);
    } catch (err) {
      console.error("Failed to evaluate CDS Hooks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchCards();
    }
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="bg-[#FAFAFB] rounded-lg p-3 border border-[#E9EBEF] flex items-center justify-between text-xs text-[#667085] animate-pulse">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#386DF4]" />
          <span>Evaluating HL7 FHIR CDS Hooks (patient-view) across multi-organ trajectories...</span>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-[#EDF3FF] text-[#386DF4] border border-[#D3E2FE] text-[10px] font-semibold px-2 py-0.5 rounded font-mono">
            HL7 CDS-HOOKS v2.0
          </span>
          <span className="font-medium text-[#17191C]">Automated Clinical Decision Support Alerts</span>
        </div>
        <button
          onClick={fetchCards}
          className="text-[11px] text-[#667085] hover:text-[#17191C] flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Re-evaluate</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {cards.map((card, idx) => {
          const isCrit = card.indicator === "critical";
          const isWarn = card.indicator === "warning";

          return (
            <div
              key={card.uuid || idx}
              className={`p-3.5 rounded-lg border text-xs transition-all ${
                isCrit
                  ? "bg-[#C2414B]/4 border-[#C2414B]/25 text-[#17191C]"
                  : isWarn
                  ? "bg-[#B7791F]/4 border-[#B7791F]/25 text-[#17191C]"
                  : "bg-[#386DF4]/4 border-[#386DF4]/25 text-[#17191C]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  <div className="mt-0.5 shrink-0">
                    {isCrit ? (
                      <AlertTriangle className="h-4 w-4 text-[#C2414B]" />
                    ) : isWarn ? (
                      <ShieldAlert className="h-4 w-4 text-[#B7791F]" />
                    ) : (
                      <Info className="h-4 w-4 text-[#386DF4]" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#17191C] text-[13px]">
                        {card.summary}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded font-mono ${
                          isCrit
                            ? "bg-[#C2414B] text-white"
                            : isWarn
                            ? "bg-[#B7791F] text-white"
                            : "bg-[#386DF4] text-white"
                        }`}
                      >
                        {card.indicator}
                      </span>
                    </div>

                    {card.detail && (
                      <p className="text-[#667085] leading-relaxed text-[12px]">{card.detail}</p>
                    )}

                    {/* CDS Hook Suggestions */}
                    {card.suggestions && card.suggestions.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {card.suggestions.map((sug, sIdx) => {
                          const actionKey = `${idx}-${sIdx}`;
                          const isDone = appliedAction === actionKey;
                          return (
                            <button
                              key={sIdx}
                              onClick={() => setAppliedAction(actionKey)}
                              disabled={isDone}
                              className={`h-6 px-2.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                                isDone
                                  ? "bg-[#15803D] text-white cursor-default"
                                  : "bg-[#FFFFFF] hover:bg-[#F6F7F9] text-[#17191C] border border-[#E9EBEF] shadow-2xs"
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Order Staged</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 text-[#386DF4]" />
                                  <span>{sug.label}</span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Source Label */}
                {card.source && (
                  <div className="text-[10px] text-[#98A2B3] shrink-0 font-mono">
                    {card.source.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
