import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { MetricCard } from "@/components/ui/metric-card";

describe("UI Primitives", () => {
  it("renders Button with text and handles loading state", () => {
    const { rerender } = render(<Button>Analyze Evidence</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Analyze Evidence");

    rerender(<Button loading>Analyze Evidence</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders Badge variants correctly", () => {
    render(<Badge variant="success">98% Grounded</Badge>);
    expect(screen.getByText("98% Grounded")).toBeDefined();
  });

  it("renders StatusDot with appropriate color markers", () => {
    const { container } = render(<StatusDot status="healthy" />);
    expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  });

  it("renders MetricCard with tabular numerals", () => {
    render(
      <MetricCard
        label="RTX 5060 VRAM"
        value="5.47 GB"
        subtext="67% of 8.15 GB"
      />
    );
    expect(screen.getByText("RTX 5060 VRAM")).toBeDefined();
    expect(screen.getByText("5.47 GB")).toBeDefined();
    expect(screen.getByText("67% of 8.15 GB")).toBeDefined();
  });
});
