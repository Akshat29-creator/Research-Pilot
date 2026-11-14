import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { GpuVramWidget } from "@/components/observability/gpu-vram-widget";
import { LatencyChart } from "@/components/observability/latency-chart";
import { ThroughputChart } from "@/components/observability/throughput-chart";
import { SystemHealthGrid } from "@/components/observability/system-health-grid";
import { AgentReliabilityCard } from "@/components/observability/agent-reliability-card";
import { LiveEventStream } from "@/components/observability/live-event-stream";

// Mock ResizeObserver for Recharts ResponsiveContainer in JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("GpuVramWidget", () => {
  it("renders GPU model name and VRAM allocation statistics", () => {
    render(<GpuVramWidget totalVramMb={8151} gpuTemp={58} gpuPowerWatts={64} />);

    expect(screen.getByText("NVIDIA GeForce RTX 5060 Laptop GPU")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("58°C")).toBeInTheDocument();
    expect(screen.getByText("4,096 tok")).toBeInTheDocument();
    expect(screen.getByText("Semaphore(1)")).toBeInTheDocument();
    expect(screen.getByText("qwen3:8b")).toBeInTheDocument();
    expect(screen.getByText("nomic-embed-text")).toBeInTheDocument();
  });

  it("triggers onRefresh callback when refresh button clicked", () => {
    const handleRefresh = vi.fn();
    render(<GpuVramWidget onRefresh={handleRefresh} isRefreshing={false} />);

    const refreshBtn = screen.getByRole("button", { name: /refresh gpu metrics/i });
    fireEvent.click(refreshBtn);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("LatencyChart", () => {
  it("renders view toggle buttons and summary statistics", () => {
    render(<LatencyChart />);

    expect(screen.getByText(/Execution Latency & Agent Stage Times/i)).toBeInTheDocument();
    expect(screen.getByText("Workflow Percentiles")).toBeInTheDocument();
    expect(screen.getByText("Per-Agent Stages")).toBeInTheDocument();
    expect(screen.getByText("Avg p50 Duration")).toBeInTheDocument();

    // Toggle to Per-Agent Stages view
    const stagesBtn = screen.getByRole("button", { name: /Per-Agent Stages/i });
    fireEvent.click(stagesBtn);
    expect(stagesBtn).toBeInTheDocument();
  });
});

describe("ThroughputChart", () => {
  it("renders token velocity and vector search latency metrics", () => {
    render(<ThroughputChart />);

    expect(screen.getByText(/Inference Throughput & Vector Search Latency/i)).toBeInTheDocument();
    expect(screen.getByText("Peak Generation")).toBeInTheDocument();
    expect(screen.getByText("Sustained Average")).toBeInTheDocument();
    expect(screen.getByText("HNSW Index Latency")).toBeInTheDocument();
    expect(screen.getByText("2,856,400")).toBeInTheDocument();
  });
});

describe("SystemHealthGrid", () => {
  it("renders status cards for all 4 infrastructure daemons", () => {
    render(<SystemHealthGrid />);

    expect(screen.getByText("PostgreSQL 16 + pgvector")).toBeInTheDocument();
    expect(screen.getByText("Redis 7 In-Memory Cache")).toBeInTheDocument();
    expect(screen.getByText("SearXNG Metasearch Engine")).toBeInTheDocument();
    expect(screen.getByText("Ollama Inference Daemon")).toBeInTheDocument();

    expect(screen.getByText(":5432")).toBeInTheDocument();
    expect(screen.getByText(":6379")).toBeInTheDocument();
    expect(screen.getByText(":8080")).toBeInTheDocument();
    expect(screen.getByText(":11434")).toBeInTheDocument();
  });
});

describe("AgentReliabilityCard", () => {
  it("renders adversarial review statistics and dollars saved offset", () => {
    render(
      <AgentReliabilityCard
        firstPassApprovalRate={91.7}
        revisionRate={8.3}
        totalTokensProcessed={2856400}
        dollarsSaved={142.8}
        unverifiedHallucinations={0}
      />
    );

    expect(screen.getByText("Adversarial Review Gate")).toBeInTheDocument();
    expect(screen.getByText("91.7%")).toBeInTheDocument();
    expect(screen.getByText("8.3%")).toBeInTheDocument();
    expect(screen.getByText("Cloud Cost Offset")).toBeInTheDocument();
    expect(screen.getByText("$142.80")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});

describe("LiveEventStream", () => {
  it("renders log stream and filters events by category", () => {
    render(<LiveEventStream />);

    expect(
      screen.getByText(/Live Diagnostics & OpenTelemetry Event Stream/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/RTX 5060 Laptop VRAM verified/i)).toBeInTheDocument();

    // Click RETRIEVAL filter
    const retrievalBtn = screen.getByRole("button", { name: "RETRIEVAL" });
    fireEvent.click(retrievalBtn);
    expect(screen.getByText(/Metasearch query dispatched/i)).toBeInTheDocument();
    expect(screen.getByText(/Cosine similarity search executed/i)).toBeInTheDocument();

    // Copy button works
    const copyBtn = screen.getByRole("button", { name: /copy/i });
    fireEvent.click(copyBtn);
  });
});
