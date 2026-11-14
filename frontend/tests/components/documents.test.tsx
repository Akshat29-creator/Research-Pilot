import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { UploadZone } from "@/components/documents/upload-zone";
import { ChunkInspectorDialog } from "@/components/documents/chunk-inspector-dialog";
import { SAMPLE_DOCUMENTS } from "@/components/documents/document-types";

describe("Document Library Components", () => {
  it("renders UploadZone with drag-and-drop targets", () => {
    const handleIngested = vi.fn();
    render(<UploadZone onDocumentIngested={handleIngested} />);

    expect(screen.getByText(/Drag & drop research papers or click to browse/i)).toBeInTheDocument();
    expect(screen.getByText("nomic-embed-text (768-d)")).toBeInTheDocument();
    expect(screen.getByText("Local PostgreSQL pgvector")).toBeInTheDocument();
  });

  it("renders ChunkInspectorDialog with document chunks", () => {
    const handleClose = vi.fn();
    const doc = SAMPLE_DOCUMENTS[0];

    render(
      <ChunkInspectorDialog
        document={doc}
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText("PGVECTOR CHUNK EXPLORER")).toBeInTheDocument();
    expect(screen.getByText(doc.title)).toBeInTheDocument();
    expect(screen.getByText("Chunk #1")).toBeInTheDocument();
    expect(screen.getByText(/We evaluate HNSW and IVFFlat across 1M 768-dimensional vectors/i)).toBeInTheDocument();
  });
});
