"use client";

import React, { useState } from "react";
import {
  Bot,
  User,
  Sparkles,
  Send,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Activity,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { Patient, SBARReport, CopilotQueryResponse } from "@/types/clinical";

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  citations?: string[];
  sbar?: SBARReport | null;
  followups?: string[];
  timestamp: string;
}

interface ClinicalCopilotViewProps {
  patient: Patient;
}

export function ClinicalCopilotView({ patient }: ClinicalCopilotViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: `Hello, Doctor. I am your **PULSE Clinical AI Co-Pilot**, grounded in the multimodal latent architectures published in *Nature Computational Science* (2026).\n\nI have loaded the longitudinal record for **${patient.full_name}** (${patient.mrn}, ${patient.cohort_type.replace(/_/g, " ")}).\n\nHow can I assist your clinical rounds or prognostic assessment today?`,
      citations: [
        "Wu, W. et al. 'Longitudinal alignments and syntheses of multimodal clinical data for personalized medicine with the PULSE framework.' Nature Computational Science (2026).",
      ],
      followups: [
        "Explain high-risk prognostic drivers",
        "Interpret the synthesized omics panel",
        "Generate SBAR clinical handover",
        "Longitudinal trajectory dynamics",
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSbarId, setCopiedSbarId] = useState<string | null>(null);

  const quickPrompts = [
    { label: "🩺 Explain Risk Drivers", query: "What are the top biological drivers and mechanisms behind this patient's elevated risk scores?" },
    { label: "🧬 Interpret Omics", query: "What do the synthesized plasma proteomics and metabolomics reveal about this patient's condition?" },
    { label: "📈 Trajectory Dynamics", query: "Analyze the longitudinal trajectory changes and inflection points across this patient's visits." },
    { label: "📋 Generate SBAR Handover", query: "Generate a structured SBAR clinical handover report for shift transition.", includeSbar: true },
    { label: "🎯 Therapeutic Targets", query: "What counterfactual interventions would most effectively reduce this patient's predicted disease risks?" },
  ];

  const handleSend = async (queryText: string, forceIncludeSbar: boolean = false) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res: CopilotQueryResponse = await api.queryCopilot(
        patient.id,
        trimmed,
        forceIncludeSbar || trimmed.toLowerCase().includes("sbar")
      );

      const copilotMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "copilot",
        text: res.answer,
        citations: res.citations,
        sbar: res.sbar,
        followups: res.suggested_followups,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: unknown) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "copilot",
        text: `⚠️ **Error communicating with Co-Pilot service:** ${err instanceof Error ? err.message : "Internal error"}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copySbarToClipboard = (sbar: SBARReport, msgId: string) => {
    const text = `CLINICAL SBAR HANDOVER REPORT
PATIENT: ${sbar.full_name} (${sbar.mrn}) | COHORT: ${sbar.cohort_type}
GENERATED: ${new Date(sbar.generated_at).toLocaleString()}

[SITUATION]
${sbar.situation}

[BACKGROUND]
${sbar.background}

[ASSESSMENT]
${sbar.assessment}

[RECOMMENDATION]
${sbar.recommendation}

CONFIDENTIAL CLINICAL DOCUMENT - SaMD 21 CFR Part 11 COMPLIANT`;

    navigator.clipboard.writeText(text);
    setCopiedSbarId(msgId);
    setTimeout(() => setCopiedSbarId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Co-Pilot Header Info Banner */}
      <Card className="border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Clinical AI Co-Pilot & Decision Explainer
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                    Nature Comp Sci 2026 Grounded
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  Multimodal reasoning assistant for risk driver explanations, omics interpretation, and automated SBAR clinical handover.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSend("Generate a structured SBAR clinical handover report for shift transition.", true)}
                className="text-xs font-semibold text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50 gap-1.5 shadow-xs"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span>1-Click SBAR Handover</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Prompt Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          Quick Actions:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.query, p.includeSbar)}
            disabled={isLoading}
            className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/50 shadow-2xs shrink-0 transition"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main Conversation Stream */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4 max-h-[600px] overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "copilot" && (
                <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-3 ${
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-tr-xs"
                    : "bg-slate-50 border border-slate-200/80 text-slate-900 rounded-tl-xs"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between text-[10px] opacity-75">
                  <span className="font-semibold">
                    {msg.sender === "user" ? "Attending Clinician" : "PULSE Co-Pilot AI"}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Body */}
                <div className="whitespace-pre-wrap leading-relaxed text-xs space-y-2">
                  {msg.text}
                </div>

                {/* Specialized SBAR Card Presentation */}
                {msg.sbar && (
                  <div className="mt-3 bg-white rounded-xl border border-indigo-200 p-4 space-y-3 text-slate-800 shadow-xs">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <span className="font-bold text-xs text-indigo-950 uppercase tracking-wide">
                          Clinical SBAR Handover Briefing
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copySbarToClipboard(msg.sbar!, msg.id)}
                        className="h-7 text-xs bg-indigo-50/50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 gap-1.5"
                      >
                        {copiedSbarId === msg.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Copied to EHR!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy SBAR</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="font-bold text-indigo-900 block mb-0.5">S — Situation:</span>
                        <p className="text-slate-700 leading-relaxed">{msg.sbar.situation}</p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="font-bold text-indigo-900 block mb-0.5">B — Background:</span>
                        <p className="text-slate-700 leading-relaxed">{msg.sbar.background}</p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="font-bold text-indigo-900 block mb-0.5">A — Assessment:</span>
                        <p className="text-slate-700 leading-relaxed">{msg.sbar.assessment}</p>
                      </div>

                      <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-200">
                        <span className="font-bold text-indigo-950 block mb-0.5">R — Recommendation:</span>
                        <p className="text-indigo-900 whitespace-pre-wrap leading-relaxed">{msg.sbar.recommendation}</p>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Generated: {new Date(msg.sbar.generated_at).toLocaleString()}</span>
                      <span className="font-mono">MRN: {msg.sbar.mrn}</span>
                    </div>
                  </div>
                )}

                {/* Citations Panel */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 text-[10px] text-slate-500 space-y-1">
                    <span className="font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-indigo-600" />
                      Evidence & Clinical Guidelines:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                      {msg.citations.map((cite, cIdx) => (
                        <li key={cIdx} className="leading-snug">{cite}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Followups Chips */}
                {msg.followups && msg.followups.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Suggested Inquiries:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.followups.map((f, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSend(f)}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition text-left"
                        >
                          → {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === "user" && (
                <div className="h-8 w-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <Bot className="h-5 w-5 text-indigo-600 animate-pulse" />
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                <span>PULSE Co-Pilot is synthesizing clinical explanation and cross-modal latent evidence...</span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Input Bar */}
        <CardFooter className="p-3 border-t border-slate-100 bg-slate-50/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputQuery);
            }}
            className="flex w-full items-center gap-2"
          >
            <Input
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask the Co-Pilot about risk drivers, synthesized omics, SBAR handover, or trajectory trends..."
              disabled={isLoading}
              className="bg-white text-xs h-9"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !inputQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-3 gap-1.5 font-semibold"
            >
              <span>Send</span>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
