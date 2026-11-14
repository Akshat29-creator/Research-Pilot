import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { StreamingFeed, SAMPLE_STREAM_EVENTS } from "@/components/research/streaming-feed";
import { SourcesDrawer, SAMPLE_SOURCES } from "@/components/research/sources-drawer";
import { ApprovalModal } from "@/components/research/approval-modal";

describe("Research Workspace Components", () => {
  it("renders StreamingFeed with events and filter toggles", () => {
    render(<StreamingFeed events={SAMPLE_STREAM_EVENTS} isStreaming={true} />);
    expect(screen.getByText("Agent Execution Feed")).toBeInTheDocument();
    expect(screen.getByText("LIVE SSE")).toBeInTheDocument();
    expect(screen.getByText(/Decomposed research query into 3 sequential/i)).toBeInTheDocument();
  });

  it("renders SourcesDrawer with tabs and filter counts", () => {
    render(<SourcesDrawer sources={SAMPLE_SOURCES} />);
    expect(screen.getByText("Ingested Sources")).toBeInTheDocument();
    expect(screen.getByText(/Avg Cred:/i)).toBeInTheDocument();
    expect(screen.getByText(/Open-source vector similarity search for Postgres/i)).toBeInTheDocument();
  });

  it("triggers approval modal approve and reject callbacks", () => {
    const handleApprove = vi.fn();
    const handleReject = vi.fn();
    const handleClose = vi.fn();

    render(
      <ApprovalModal
        isOpen={true}
        onClose={handleClose}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    );

    expect(screen.getByText("Adversarial Reviewer Flagged Unverified Claim")).toBeInTheDocument();
    const approveBtn = screen.getByRole("button", { name: /Approve & Finalize/i });
    fireEvent.click(approveBtn);
    expect(handleApprove).toHaveBeenCalledTimes(1);

    const rejectBtn = screen.getByRole("button", { name: /Reject & Revise/i });
    fireEvent.click(rejectBtn);
    expect(handleReject).toHaveBeenCalledTimes(1);
  });
});
