import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { GanttTimeline } from "@/components/trace/gantt-timeline";
import { SpanInspector } from "@/components/trace/span-inspector";
import { SAMPLE_TRACE } from "@/components/trace/trace-data";

describe("Agent Trace Components", () => {
  it("renders GanttTimeline with total latency and spans", () => {
    const handleSelectSpan = vi.fn();
    render(
      <GanttTimeline
        spans={SAMPLE_TRACE.spans}
        totalDurationMs={SAMPLE_TRACE.totalDurationMs}
        selectedSpanId="span_orch_01"
        onSelectSpan={handleSelectSpan}
      />
    );

    expect(screen.getByText("Execution Timeline (Gantt)")).toBeInTheDocument();
    expect(screen.getByText(/Total Latency: 4810ms/i)).toBeInTheDocument();
    expect(screen.getByText("orchestrator.plan_decomposition")).toBeInTheDocument();
  });

  it("renders SpanInspector with telemetry and tabs", () => {
    const selectedSpan = SAMPLE_TRACE.spans[0];
    render(<SpanInspector span={selectedSpan} />);

    expect(screen.getByText("orchestrator.plan_decomposition")).toBeInTheDocument();
    expect(screen.getByText("412ms")).toBeInTheDocument();
    expect(screen.getByText("qwen3:8b Q4_K_M")).toBeInTheDocument();
    expect(screen.getByText(/295 tokens/i)).toBeInTheDocument();
  });

  it("switches tabs in SpanInspector", () => {
    const selectedSpan = SAMPLE_TRACE.spans[0];
    render(<SpanInspector span={selectedSpan} />);

    const inputsTab = screen.getByRole("button", { name: /Input Payload/i });
    fireEvent.click(inputsTab);
    expect(screen.getByText("Serialized Ingestion Arguments")).toBeInTheDocument();
  });
});
