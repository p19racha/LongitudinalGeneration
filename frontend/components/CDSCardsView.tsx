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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { CDSCard } from "@/types/clinical";

interface CDSCardsViewProps {
  patientId: string;
}

export function CDSCardsView({ patientId }: CDSCardsViewProps) {
  const [cards, setCards] = useState<CDSCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex items-center justify-between text-xs text-slate-500 animate-pulse">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
          <span>Evaluating HL7 FHIR CDS Hooks (patient-view) across multi-organ trajectories...</span>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
            HL7 CDS-HOOKS v2.0
          </Badge>
          <span className="font-semibold text-slate-700">Real-Time Clinical Decision Support Guidance</span>
        </div>
        <button
          onClick={fetchCards}
          className="text-[11px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Re-evaluate</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {cards.map((card, idx) => {
          const isCrit = card.indicator === "critical";
          const isWarn = card.indicator === "warning";

          return (
            <div
              key={card.uuid || idx}
              className={`p-3.5 rounded-xl border transition shadow-2xs ${
                isCrit
                  ? "bg-rose-50/70 border-rose-200 text-rose-950"
                  : isWarn
                  ? "bg-amber-50/70 border-amber-200 text-amber-950"
                  : "bg-indigo-50/50 border-indigo-200 text-indigo-950"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  <div className="mt-0.5 shrink-0">
                    {isCrit ? (
                      <ShieldAlert className="h-5 w-5 text-rose-600 animate-pulse" />
                    ) : isWarn ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-black tracking-wide ${
                          isCrit
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : isWarn
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-indigo-100 text-indigo-800 border-indigo-300"
                        }`}
                      >
                        {card.indicator}
                      </Badge>
                      <h4 className="text-xs font-bold leading-tight">{card.summary}</h4>
                    </div>

                    {card.detail && (
                      <p className="text-xs opacity-90 leading-relaxed font-normal">{card.detail}</p>
                    )}

                    {/* Suggestions */}
                    {card.suggestions && card.suggestions.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {card.suggestions.map((sug, sIdx) => {
                          const isDone = appliedAction === sug.label;
                          return (
                            <Button
                              key={sug.uuid || sIdx}
                              size="sm"
                              variant="outline"
                              onClick={() => setAppliedAction(sug.label)}
                              className={`h-7 text-xs font-medium gap-1.5 transition ${
                                isDone
                                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                  : isCrit
                                  ? "bg-white text-rose-700 border-rose-300 hover:bg-rose-100"
                                  : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Order Queued in EHR</span>
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  <span>{sug.label}</span>
                                </>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}

                    {/* Source citation */}
                    {card.source && (
                      <div className="pt-1 flex items-center gap-2 text-[10px] opacity-75">
                        <span>Source: {card.source.label}</span>
                        {card.source.url && (
                          <a
                            href={card.source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 hover:underline font-semibold"
                          >
                            <span>Guidelines</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
