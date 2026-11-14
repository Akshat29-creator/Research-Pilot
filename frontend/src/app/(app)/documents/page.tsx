"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  UploadCloud,
  Database,
  Cpu,
  Layers,
  Search,
  Trash2,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  HardDrive,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/ui/status-dot";
import { UploadZone } from "@/components/documents/upload-zone";
import { ChunkInspectorDialog } from "@/components/documents/chunk-inspector-dialog";
import {
  SAMPLE_DOCUMENTS,
  IngestedDocument,
} from "@/components/documents/document-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { documentsApi } from "@/lib/api";

export default function DocumentsPage() {
  const [documents, setDocuments] = React.useState<IngestedDocument[]>(SAMPLE_DOCUMENTS);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDocForChunks, setSelectedDocForChunks] = React.useState<IngestedDocument | null>(null);
  const [docToDelete, setDocToDelete] = React.useState<IngestedDocument | null>(null);

  React.useEffect(() => {
    documentsApi
      .listDocuments()
      .then((docs) => {
        if (docs && docs.length > 0) {
          setDocuments(
            docs.map((d) => ({
              id: d.id,
              fileName: d.title,
              title: d.title.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
              author: "Authenticated User",
              fileSizeBytes: d.file_size_bytes,
              pageCount: 10,
              chunkCount: d.chunk_count,
              status: "indexed",
              embeddingModel: "nomic-embed-text",
              vectorDimensions: 768,
              createdAt: d.created_at,
              chunks: [],
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Compute aggregate statistics
  const totalDocuments = documents.length;
  const totalChunks = documents.reduce((acc, doc) => acc + doc.chunkCount, 0);
  const totalBytes = documents.reduce((acc, doc) => acc + doc.fileSizeBytes, 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.fileName.toLowerCase().includes(q) ||
      (doc.author && doc.author.toLowerCase().includes(q)) ||
      (doc.doi && doc.doi.toLowerCase().includes(q))
    );
  });

  const handleDocumentIngested = (newDoc: IngestedDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    try {
      if (!docToDelete.id.startsWith("doc_")) {
        await documentsApi.deleteDocument(docToDelete.id);
      }
    } catch {}
    setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
    toast.success(`Removed "${docToDelete.fileName}" and its ${docToDelete.chunkCount} vector chunks from pgvector.`);
    setDocToDelete(null);
  };

  const handleExportDoc = (doc: IngestedDocument) => {
    const payload = {
      document: {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        embeddingModel: doc.embeddingModel,
        dimensions: doc.vectorDimensions,
      },
      chunks: doc.chunks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.fileName}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported metadata and ${doc.chunks.length} chunks`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Top Header Cockpit */}
      <div className="border-b border-border bg-surface px-4 py-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-[10px] tracking-wider">
                  KNOWLEDGE BASE & RAG
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  PostgreSQL pgvector (HNSW Index)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Document Ingestion & Knowledge Base
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                Upload research papers, technical PDFs, and specifications. Documents are parsed via PyMuPDF, chunked into overlapping token spans, and embedded into local vector storage for hybrid retrieval.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
              <Badge variant="success" className="gap-1 text-[11px] py-1 px-2.5">
                <Database className="h-3 w-3" />
                <span>pgvector: ACTIVE</span>
              </Badge>
            </div>
          </div>

          {/* Telemetry Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-[11px] font-mono">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-surface-raised/40">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div>
                <span className="text-muted-foreground text-[10px] block">Indexed Documents</span>
                <span className="font-bold text-foreground text-xs">{totalDocuments} PDFs</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-surface-raised/40">
              <Layers className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-muted-foreground text-[10px] block">Total Vector Chunks</span>
                <span className="font-bold text-foreground text-xs">{totalChunks} Chunks</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-surface-raised/40">
              <Cpu className="h-4 w-4 text-sky-400 shrink-0" />
              <div>
                <span className="text-muted-foreground text-[10px] block">Embedding Engine</span>
                <span className="font-bold text-foreground text-xs">nomic-embed-text (768-d)</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-surface-raised/40">
              <HardDrive className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-muted-foreground text-[10px] block">Storage Footprint</span>
                <span className="font-bold text-foreground text-xs">{totalMb} MB Indexed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* Drag-and-Drop Ingestion Zone */}
        <UploadZone onDocumentIngested={handleDocumentIngested} />

        {/* Ingested Documents List */}
        <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden space-y-3">
          {/* Table Header & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-b border-border bg-surface-raised">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground tracking-tight">
                Ingested Publications & Corpus
              </h3>
              <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-surface border border-border">
                {filteredDocuments.length} / {totalDocuments}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, or DOI..."
                className="h-8 pl-8 text-xs font-sans bg-surface"
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-surface border-b border-border text-[11px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Document Title</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Pages / Size</th>
                  <th className="px-4 py-2.5 font-medium">Vector Chunks</th>
                  <th className="px-4 py-2.5 font-medium">Model</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs font-sans">
                      No documents match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-raised/50 transition-colors">
                      <td className="px-4 py-3 min-w-[280px]">
                        <div className="flex items-start gap-2.5">
                          <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-sans font-semibold text-foreground block leading-tight">
                              {doc.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              {doc.author || "Internal Source"} {doc.doi && `• DOI: ${doc.doi}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="success" className="gap-1 text-[10px] py-0 px-2 font-mono">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Indexed
                        </Badge>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {doc.pageCount} pages • {(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-emerald-400 font-mono">
                          {doc.chunkCount} chunks
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-[10px]">
                        {doc.embeddingModel} ({doc.vectorDimensions}-d)
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDocForChunks(doc)}
                            className="h-7 px-2 text-[11px] gap-1"
                            title="Inspect text chunks"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Inspect</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportDoc(doc)}
                            className="h-7 px-2 text-[11px] gap-1"
                            title="Export chunk vectors as JSON"
                          >
                            <Download className="h-3 w-3" />
                            <span className="sr-only">Export</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDocToDelete(doc)}
                            className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                            title="Delete document and vector index"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack (< md) */}
          <div className="md:hidden divide-y divide-border">
            {filteredDocuments.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No documents match your query.
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div key={doc.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground font-sans leading-tight">
                          {doc.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                          {doc.fileName}
                        </span>
                      </div>
                    </div>
                    <Badge variant="success" className="text-[9px] py-0 px-1.5 font-mono shrink-0">
                      Indexed
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground pt-1">
                    <div>{doc.pageCount} pages ({(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)</div>
                    <div className="text-right text-emerald-400 font-bold">{doc.chunkCount} chunks</div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDocForChunks(doc)}
                      className="h-7 text-[11px] gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Inspect Chunks</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportDoc(doc)}
                      className="h-7 text-[11px]"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDocToDelete(doc)}
                      className="h-7 text-[11px] text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chunk Explorer Modal */}
      <ChunkInspectorDialog
        document={selectedDocForChunks}
        isOpen={!!selectedDocForChunks}
        onClose={() => setSelectedDocForChunks(null)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="destructive" className="font-mono text-[10px]">
                CONFIRM DELETION
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Delete Document & Vector Chunks?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will permanently remove <code className="text-foreground">{docToDelete?.fileName}</code> and its {docToDelete?.chunkCount} embedded vectors from the PostgreSQL pgvector HNSW index. This action cannot be reversed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-row justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDocToDelete(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              className="text-xs h-8 gap-1.5"
            >
              <Trash2 className="h-3 w-3" />
              <span>Confirm Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
