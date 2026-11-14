import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { VramEstimatorCard } from "@/components/settings/vram-estimator-card";
import { SearchProviderSection } from "@/components/settings/search-provider-section";
import { AgentGuardrailsSection } from "@/components/settings/agent-guardrails-section";
import { DatabaseStorageSection } from "@/components/settings/database-storage-section";
import { DangerPurgeDialog } from "@/components/settings/danger-purge-dialog";

describe("VramEstimatorCard", () => {
  it("renders safe VRAM envelope for Qwen3:8B at 4096 tokens", () => {
    render(<VramEstimatorCard model="qwen3:8b" contextLen={4096} />);

    expect(
      screen.getByText("Hardware VRAM Allocation Projection")
    ).toBeInTheDocument();
    expect(screen.getByText("Safe VRAM Envelope")).toBeInTheDocument();
    expect(
      screen.getByText(/100% CUDA GPU Layer Offload Guaranteed/i)
    ).toBeInTheDocument();
  });

  it("displays VRAM capacity warning alert when context length exceeds safe envelope", () => {
    render(<VramEstimatorCard model="qwen3:8b" contextLen={8192} />);

    expect(screen.getByText("Risk of CPU Spillover")).toBeInTheDocument();
    expect(
      screen.getByText(/VRAM Capacity Warning: Context window exceeds 4,096 tokens!/i)
    ).toBeInTheDocument();
  });
});

describe("SearchProviderSection", () => {
  it("renders search aggregator options, max results, and engine toggles", () => {
    const handleProviderChange = vi.fn();
    const handleMaxResultsChange = vi.fn();
    const handleToggleEngine = vi.fn();

    render(
      <SearchProviderSection
        provider="searxng"
        onProviderChange={handleProviderChange}
        maxResults={8}
        onMaxResultsChange={handleMaxResultsChange}
        engines={["google", "arxiv", "wikipedia"]}
        onToggleEngine={handleToggleEngine}
      />
    );

    expect(
      screen.getByText("Metasearch & Ingestion Providers")
    ).toBeInTheDocument();
    expect(screen.getByText("8 sources")).toBeInTheDocument();
    expect(screen.getByText("Google Web")).toBeInTheDocument();
    expect(screen.getByText("ArXiv e-Print")).toBeInTheDocument();
  });
});

describe("AgentGuardrailsSection", () => {
  it("renders review strictness, approval mode, and system instructions", () => {
    const handleStrictness = vi.fn();
    const handleApproval = vi.fn();
    const handlePrompt = vi.fn();
    const handleReset = vi.fn();

    render(
      <AgentGuardrailsSection
        strictness="strict"
        onStrictnessChange={handleStrictness}
        approvalMode="always_pause"
        onApprovalModeChange={handleApproval}
        systemPrompt="Test academic prompt"
        onSystemPromptChange={handlePrompt}
        onResetPrompt={handleReset}
      />
    );

    expect(
      screen.getByText("Agent Quality & Adversarial Guardrails")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test academic prompt")).toBeInTheDocument();

    const resetBtn = screen.getByRole("button", { name: /reset default/i });
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});

describe("DatabaseStorageSection", () => {
  it("renders storage metrics and triggers purge modal", () => {
    render(<DatabaseStorageSection />);

    expect(
      screen.getByText("Local Database & Vector Storage (pgvector)")
    ).toBeInTheDocument();
    expect(screen.getByText("12 Dossiers")).toBeInTheDocument();
    expect(screen.getByText("172 Chunks")).toBeInTheDocument();

    const purgeBtn = screen.getByRole("button", { name: /purge all data/i });
    fireEvent.click(purgeBtn);

    expect(screen.getByText("Purge All Local Research Data?")).toBeInTheDocument();
  });
});

describe("DangerPurgeDialog", () => {
  it("keeps purge button disabled until confirmation text DELETE-ALL-DATA is typed", () => {
    const handlePurge = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <DangerPurgeDialog
        open={true}
        onOpenChange={handleOpenChange}
        onConfirmPurge={handlePurge}
      />
    );

    const purgeActionBtn = screen.getByRole("button", { name: /purge everything/i });
    expect(purgeActionBtn).toBeDisabled();

    // Type incorrect text
    const input = screen.getByPlaceholderText("DELETE-ALL-DATA");
    fireEvent.change(input, { target: { value: "DELETE" } });
    expect(purgeActionBtn).toBeDisabled();

    // Type required text
    fireEvent.change(input, { target: { value: "DELETE-ALL-DATA" } });
    expect(purgeActionBtn).not.toBeDisabled();

    fireEvent.click(purgeActionBtn);
    expect(handlePurge).toHaveBeenCalledTimes(1);
  });
});
