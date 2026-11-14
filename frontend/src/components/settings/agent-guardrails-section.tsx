"use client";

import * as React from "react";
import { ShieldCheck, RotateCcw, AlertTriangle, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AgentGuardrailsSectionProps {
  strictness: string;
  onStrictnessChange: (val: string) => void;
  approvalMode: string;
  onApprovalModeChange: (val: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (val: string) => void;
  onResetPrompt: () => void;
}

export function AgentGuardrailsSection({
  strictness,
  onStrictnessChange,
  approvalMode,
  onApprovalModeChange,
  systemPrompt,
  onSystemPromptChange,
  onResetPrompt,
}: AgentGuardrailsSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface-raised border border-border text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Agent Quality &amp; Adversarial Guardrails
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Citation grounding thresholds, review gates, and persona guidance
            </p>
          </div>
        </div>

        <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
          Adversarial Safety Loop
        </Badge>
      </div>

      {/* Review Strictness & Approval Checkpoint */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Adversarial Review Strictness
          </label>
          <Select value={strictness} onValueChange={onStrictnessChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select strictness" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strict">
                Strict (Requires 90%+ Citation Grounding) • Recommended
              </SelectItem>
              <SelectItem value="balanced">
                Balanced (Requires 80%+ Grounding, allows generalizations)
              </SelectItem>
              <SelectItem value="permissive">
                Permissive (Exploratory / High Temperature Ideation)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Strict mode rejects unsubstantiated assertions and triggers automated writer revisions.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Human-in-the-Loop Approval Checkpoint
          </label>
          <Select value={approvalMode} onValueChange={onApprovalModeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select approval mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always_pause">
                Always pause before publishing report (Recommended)
              </SelectItem>
              <SelectItem value="auto_if_grounded">
                Auto-approve if grounding score &ge; 90%
              </SelectItem>
              <SelectItem value="full_auto">
                Full Autonomy (Zero human pause)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Pauses the LangGraph execution graph with full state serialization.
          </p>
        </div>
      </div>

      {/* System Prompt & Guidance Textarea */}
      <div className="space-y-2 pt-2 border-t border-border/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">
            Research Persona &amp; Synthesis Guidance Instructions
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetPrompt}
            className="text-xs font-mono text-muted-foreground hover:text-foreground h-7 gap-1 px-2"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Default</span>
          </Button>
        </div>

        <textarea
          rows={5}
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-raised p-3 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
          placeholder="Enter core research instructions..."
        />

        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>Injected into Orchestrator, Writer, and Reviewer system contexts.</span>
          <span>{systemPrompt.length} characters</span>
        </div>
      </div>
    </div>
  );
}
