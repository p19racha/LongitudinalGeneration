"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  BookOpen,
  User,
  Bot,
} from "lucide-react";
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

  const [inputQuery, setInputQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedSbarId, setCopiedSbarId] = useState<string | null>(null);

  const quickPrompts = [
    { label: "Explain Risk Drivers", query: "What are the top biological drivers and mechanisms behind this patient's elevated risk scores?" },
    { label: "Interpret Omics", query: "What do the synthesized plasma proteomics and metabolomics reveal about this patient's condition?" },
    { label: "Trajectory Dynamics", query: "Analyze the longitudinal trajectory changes and inflection points across this patient's visits." },
    { label: "Generate SBAR Handover", query: "Generate a structured SBAR clinical handover report for shift transition.", includeSbar: true },
    { label: "Therapeutic Targets", query: "What counterfactual interventions would most effectively reduce this patient's predicted disease risks?" },
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

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "copilot",
        text: res.answer,
        citations: res.citations,
        sbar: res.sbar,
        followups: res.suggested_followups,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const botErrorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "copilot",
        text: `Error connecting to PULSE Co-Pilot: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copySbarToClipboard = (sbar: SBARReport, msgId: string) => {
    const text = `SBAR CLINICAL HANDOVER REPORT
Patient: ${sbar.full_name} (MRN: ${sbar.mrn}) - ${sbar.cohort_type}
Generated: ${new Date(sbar.generated_at).toLocaleString()}

[S] SITUATION:
${sbar.situation}

[B] BACKGROUND:
${sbar.background}

[A] ASSESSMENT:
${sbar.assessment}

[R] RECOMMENDATION:
${sbar.recommendation}

Investigational Clinical Decision Support - PULSE Framework (Nature Computational Science, 2026)`;

    navigator.clipboard.writeText(text);
    setCopiedSbarId(msgId);
    setTimeout(() => setCopiedSbarId(null), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-[#E9EBEF]">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#98A2B3] mr-1">
          Quick Prompts:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.query, qp.includeSbar)}
            disabled={isLoading}
            className="h-6 px-2.5 rounded text-[11px] font-medium bg-[#FAFAFB] hover:bg-[#F6F7F9] text-[#17191C] border border-[#E9EBEF] transition-colors"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="border border-[#E9EBEF] rounded-lg bg-[#FFFFFF] p-5 min-h-[400px] max-h-[600px] overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 text-xs ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender === "copilot" && (
              <div className="w-6 h-6 rounded bg-[#386DF4] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                AI
              </div>
            )}

            <div
              className={`max-w-2xl rounded-lg p-3.5 space-y-2.5 leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[#386DF4] text-white"
                  : "bg-[#FAFAFB] text-[#17191C] border border-[#E9EBEF]"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* SBAR Card Block */}
              {msg.sbar && (
                <div className="p-3 bg-white rounded border border-[#E9EBEF] text-[#17191C] space-y-2 mt-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#E9EBEF]">
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-[#386DF4] flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span>SBAR Clinical Handover</span>
                    </span>
                    <button
                      onClick={() => copySbarToClipboard(msg.sbar!, msg.id)}
                      className="text-[10px] font-medium text-[#667085] hover:text-[#17191C] flex items-center gap-1"
                    >
                      {copiedSbarId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-[#15803D]" />
                          <span className="text-[#15803D]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy SBAR</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div>
                      <strong className="text-[#17191C]">[S] Situation:</strong> {msg.sbar.situation}
                    </div>
                    <div>
                      <strong className="text-[#17191C]">[B] Background:</strong> {msg.sbar.background}
                    </div>
                    <div>
                      <strong className="text-[#17191C]">[A] Assessment:</strong> {msg.sbar.assessment}
                    </div>
                    <div>
                      <strong className="text-[#17191C]">[R] Recommendation:</strong> {msg.sbar.recommendation}
                    </div>
                  </div>
                </div>
              )}

              {/* Followup suggestions */}
              {msg.followups && msg.followups.length > 0 && (
                <div className="pt-2 border-t border-[#E9EBEF] flex flex-wrap gap-1.5">
                  {msg.followups.map((f, fIdx) => (
                    <button
                      key={fIdx}
                      onClick={() => handleSend(f)}
                      className="text-[10px] bg-white hover:bg-[#F6F7F9] text-[#386DF4] border border-[#E9EBEF] rounded px-2 py-0.5 transition-colors"
                    >
                      {f} →
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === "user" && (
              <div className="w-6 h-6 rounded bg-[#F6F7F9] text-[#667085] border border-[#E9EBEF] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                MD
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#667085]">
            <div className="w-4 h-4 border-2 border-[#386DF4] border-t-transparent rounded-full animate-spin" />
            <span>Consulting multimodal latent state & generating clinical response...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputQuery);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Ask PULSE Co-Pilot about disease trajectories, biomarkers, or SBAR..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={isLoading}
          className="flex-1 h-9 px-3 text-xs bg-[#FFFFFF] border border-[#E9EBEF] rounded-md outline-none focus:border-[#386DF4] focus:ring-1 focus:ring-[#386DF4] transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="h-9 px-4 bg-[#386DF4] hover:bg-[#2F5ECC] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
