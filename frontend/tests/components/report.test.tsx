import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { ReportTOC } from "@/components/report/report-toc";
import { ReviewerVerdictCard } from "@/components/report/reviewer-verdict-card";
import { REPORT_SECTIONS } from "@/components/report/report-content";

describe("Report Viewer Components", () => {
  it("renders ReportTOC with sections and fires selection", () => {
    const handleSelectSection = vi.fn();
    render(
      <ReportTOC
        sections={REPORT_SECTIONS}
        activeSectionId="executive-summary"
        onSelectSection={handleSelectSection}
      />
    );

    expect(screen.getByText("Table of Contents")).toBeInTheDocument();
    expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    expect(screen.getByText("1. Problem Formulation & Scope")).toBeInTheDocument();

    const sectionBtn = screen.getByText("2. Vector Index Architectures");
    fireEvent.click(sectionBtn);
    expect(handleSelectSection).toHaveBeenCalledWith("architectural-comparison");
  });

  it("renders ReviewerVerdictCard with verification score and audit details", () => {
    render(<ReviewerVerdictCard score={0.916} totalAssertions={12} verifiedCount={11} />);

    expect(screen.getByText("Adversarial Grounding Gate: VERIFIED")).toBeInTheDocument();
    expect(screen.getByText("92% Grounded")).toBeInTheDocument();
    expect(screen.getByText(/11 \/ 12 claims/i)).toBeInTheDocument();

    const expandBtn = screen.getByRole("button", { name: /Inspect Audit Log/i });
    fireEvent.click(expandBtn);
    expect(screen.getByText(/Primary Source Verification: 11 Assertions/i)).toBeInTheDocument();
  });
});
