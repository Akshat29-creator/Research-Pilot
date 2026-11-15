"use client";

import * as React from "react";
import {
  Cpu,
  Database,
  Moon,
  Save,
  Search,
  ShieldCheck,
  Sun,
  Sliders,
  Laptop,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VramEstimatorCard } from "@/components/settings/vram-estimator-card";
import { SearchProviderSection } from "@/components/settings/search-provider-section";
import { AgentGuardrailsSection } from "@/components/settings/agent-guardrails-section";
import { DatabaseStorageSection } from "@/components/settings/database-storage-section";

const DEFAULT_SYSTEM_PROMPT = `You are ResearchPilot AI, an autonomous local-first research workstation.
You strictly adhere to evidence-based synthesis.
Every substantive factual statement must carry an academic citation [1] linked to an indexed source chunk in pgvector.
Never invent non-existent DOIs, authors, or empirical claims.
If evidence is insufficient, explicitly state research limitations.`;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // Settings State
  const [model, setModel] = React.useState("qwen2.5:3b");
  const [contextLen, setContextLen] = React.useState<number>(4096);
  const [temperature, setTemperature] = React.useState<number>(0.2);
  const [searchProvider, setSearchProvider] = React.useState("searxng");
  const [maxResults, setMaxResults] = React.useState<number>(8);
  const [engines, setEngines] = React.useState<string[]>([
    "google",
    "arxiv",
    "wikipedia",
    "europe_pmc",
  ]);
  const [reviewStrictness, setReviewStrictness] = React.useState("strict");
  const [approvalMode, setApprovalMode] = React.useState("always_pause");
  const [systemPrompt, setSystemPrompt] = React.useState(DEFAULT_SYSTEM_PROMPT);
  const [isSaved, setIsSaved] = React.useState(false);

  // Load from localStorage if present
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("researchpilot_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.model) setModel(parsed.model);
        if (parsed.contextLen) setContextLen(parsed.contextLen);
        if (parsed.temperature !== undefined) setTemperature(parsed.temperature);
        if (parsed.searchProvider) setSearchProvider(parsed.searchProvider);
        if (parsed.maxResults) setMaxResults(parsed.maxResults);
        if (parsed.engines) setEngines(parsed.engines);
        if (parsed.reviewStrictness) setReviewStrictness(parsed.reviewStrictness);
        if (parsed.approvalMode) setApprovalMode(parsed.approvalMode);
        if (parsed.systemPrompt) setSystemPrompt(parsed.systemPrompt);
      }
    } catch {}
  }, []);

  const handleToggleEngine = (engineId: string) => {
    setEngines((prev) =>
      prev.includes(engineId) ? prev.filter((e) => e !== engineId) : [...prev, engineId]
    );
  };

  const handleResetPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    toast.info("System instructions reset to academic research default");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      model,
      contextLen,
      temperature,
      searchProvider,
      maxResults,
      engines,
      reviewStrictness,
      approvalMode,
      systemPrompt,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem("researchpilot_settings", JSON.stringify(config));
      setIsSaved(true);
      toast.success("Workspace configuration saved successfully");
      setTimeout(() => setIsSaved(false), 2500);
    } catch {
      toast.error("Failed to save settings to localStorage");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
              WORKSPACE CONFIGURATION
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              Hardware Limits &amp; Parameters
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Settings &amp; Hardware Constraints
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Tune on-device LLM inference parameters, safe VRAM context ceilings, local SearXNG routing,
            and database storage.
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSave}
            className="font-mono text-xs gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            <span>{isSaved ? "Saved" : "Save Changes"}</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: LLM Inference Hardware */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-surface-raised border border-border text-primary">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  Local Inference Engine (Host Ollama)
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  100% On-device execution on NVIDIA GeForce RTX 5060 Laptop (8,151 MiB VRAM)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
              <Lock className="h-3 w-3" />
              <span>Concurrency Lock: Semaphore(1)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Model Selection */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Primary Reasoning &amp; Synthesis Model
              </label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qwen2.5:3b">
                    Qwen2.5:3B (Q4_K_M, 1.9GB) • Recommended (Ultralight)
                  </SelectItem>
                  <SelectItem value="qwen3:8b">
                    Qwen3:8B (Q4_K_M, 5.2GB) • Heavy Reasoning
                  </SelectItem>
                  <SelectItem value="qwen3.5:2b">
                    Qwen3.5:2B (Q4_K_M, 2.7GB) • Lightweight
                  </SelectItem>
                  <SelectItem value="qwen2.5-coder:1.5b">
                    Qwen2.5-Coder:1.5B (986MB) • Sub-1GB
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                Model weights load entirely into host GPU memory (33/33 CUDA layers).
              </p>
            </div>

            {/* Context Length Slider / Ceiling */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-foreground">
                  Context Window Ceiling (`num_ctx`)
                </label>
                <span className="font-mono text-xs font-bold text-primary tabular-nums">
                  {contextLen.toLocaleString()} tokens
                </span>
              </div>
              <input
                type="range"
                min={2048}
                max={8192}
                step={1024}
                value={contextLen}
                onChange={(e) => setContextLen(Number(e.target.value))}
                className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-primary border border-border"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                <span>2,048 (Low VRAM)</span>
                <span className="text-emerald-400 font-semibold">4,096 (Safe Envelope)</span>
                <span className="text-amber-400">8,192 (Spill Risk)</span>
              </div>
            </div>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-medium text-foreground">
                Inference Temperature (Determinism vs Creativity):
              </span>
              <span className="font-bold text-foreground tabular-nums">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={1.0}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-primary border border-border"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>0.00 (Strictly Factual / Deterministic)</span>
              <span>0.20 (Recommended for Research)</span>
              <span>1.00 (High Temperature)</span>
            </div>
          </div>

          {/* Live Dynamic VRAM Projection Card */}
          <VramEstimatorCard model={model} contextLen={contextLen} />
        </div>

        {/* Section 2: Search Provider */}
        <SearchProviderSection
          provider={searchProvider}
          onProviderChange={setSearchProvider}
          maxResults={maxResults}
          onMaxResultsChange={setMaxResults}
          engines={engines}
          onToggleEngine={handleToggleEngine}
        />

        {/* Section 3: Agent Guardrails & System Instructions */}
        <AgentGuardrailsSection
          strictness={reviewStrictness}
          onStrictnessChange={setReviewStrictness}
          approvalMode={approvalMode}
          onApprovalModeChange={setApprovalMode}
          systemPrompt={systemPrompt}
          onSystemPromptChange={setSystemPrompt}
          onResetPrompt={handleResetPrompt}
        />

        {/* Section 4: Local Database & Storage */}
        <DatabaseStorageSection />

        {/* Section 5: Interface Appearance */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-surface-raised border border-border text-primary">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  Interface &amp; Display Preferences
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Visual theme and layout density settings
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="gap-2 font-mono text-xs"
            >
              <Moon className="h-3.5 w-3.5" /> Dark Theme (Workstation Default)
            </Button>
            <Button
              type="button"
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="gap-2 font-mono text-xs"
            >
              <Sun className="h-3.5 w-3.5" /> Light Theme
            </Button>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs font-mono text-muted-foreground">
            Configuration saved locally in browser storage.
          </div>
          <Button
            type="submit"
            className="font-mono text-xs gap-1.5 h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save All Changes</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
