"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  Printer,
  Edit3,
  Eye,
  FileText,
  Clock,
  Cpu,
  ShieldCheck,
  Layers,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Save,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CitationChip, CitationData } from "@/components/ui/citation-chip";
import { SourcesDrawer } from "@/components/research/sources-drawer";
import { ReportTOC } from "@/components/report/report-toc";
import { ReviewerVerdictCard } from "@/components/report/reviewer-verdict-card";
import {
  REPORT_SECTIONS,
  REPORT_CITATIONS,
  INITIAL_REPORT_MARKDOWN,
} from "@/components/report/report-content";
import { toast } from "sonner";

export default function ReportViewerPage() {
  const params = useParams();
  const sessionId = (params?.id as string) || "sess_01JBM8";

  const [markdown, setMarkdown] = React.useState(INITIAL_REPORT_MARKDOWN);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("executive-summary");
  const [copied, setCopied] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving">("saved");
  const [highlightCitationId, setHighlightCitationId] = React.useState<number | null>(null);

  // Scroll-spy intersection observer
  React.useEffect(() => {
    const handleScroll = () => {
      const headingElements = REPORT_SECTIONS.map((sec) =>
        document.getElementById(sec.id)
      ).filter(Boolean) as HTMLElement[];

      const scrollPos = window.scrollY + 120;
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const el = headingElements[i];
        if (el.offsetTop <= scrollPos) {
          setActiveSection(el.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const topOffset = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success("Copied report markdown to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ResearchPilot-Report-${sessionId}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded as Markdown");
  };

  const handleExportPdf = () => {
    toast.info("Opening system print dialog (Select 'Save as PDF')...");
    window.print();
  };

  const handleContentChange = (newText: string) => {
    setMarkdown(newText);
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
    }, 600);
  };

  const handleResetDraft = () => {
    setMarkdown(INITIAL_REPORT_MARKDOWN);
    toast.info("Reset report to original synthesized AI draft.");
  };

  // Custom markdown component mapping
  const markdownComponents = React.useMemo(() => {
    return {
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground pb-4 border-b border-border mt-2 mb-6">
          {children}
        </h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => {
        const text = String(children);
        let id = "";
        if (text.includes("Executive Summary")) id = "executive-summary";
        else if (text.includes("Problem Formulation")) id = "problem-scope";
        else if (text.includes("Vector Index Architectures")) id = "architectural-comparison";
        else if (text.includes("Empirical Memory Footprint")) id = "memory-scaling";
        else if (text.includes("Shared Buffer Contention")) id = "concurrency-buffers";
        else if (text.includes("Production Sizing Guide")) id = "recommendations";
        else if (text.includes("Verification & Grounding Audit")) id = "audit-verdict";
        else if (text.includes("References & Citations")) id = "references";

        return (
          <h2
            id={id}
            className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-8 mb-3 pb-2 border-b border-border/60 scroll-mt-24"
          >
            {children}
          </h2>
        );
      },
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="text-sm sm:text-base font-semibold text-foreground mt-5 mb-2">
          {children}
        </h3>
      ),
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed mb-4">
          {children}
        </p>
      ),
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-foreground/90 mb-4 pl-2">
          {children}
        </ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-foreground/90 mb-4 pl-2">
          {children}
        </ol>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li className="leading-relaxed">{children}</li>
      ),
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="overflow-x-auto my-4 rounded-lg border border-border">
          <table className="w-full text-xs font-mono">{children}</table>
        </div>
      ),
      thead: ({ children }: { children?: React.ReactNode }) => (
        <thead className="bg-surface-raised border-b border-border text-[11px] text-muted-foreground">
          {children}
        </thead>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className="px-3 py-2.5 text-left font-semibold text-foreground">{children}</th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className="px-3 py-2 border-t border-border/60 text-foreground/90">{children}</td>
      ),
      code: ({
        inline,
        children,
      }: {
        inline?: boolean;
        children?: React.ReactNode;
      }) => {
        if (inline) {
          return (
            <code className="px-1.5 py-0.5 rounded bg-surface-raised border border-border font-mono text-[11px] text-primary">
              {children}
            </code>
          );
        }
        return (
          <pre className="p-3 my-3 rounded-lg bg-surface-raised border border-border font-mono text-xs overflow-x-auto text-foreground/90">
            <code>{children}</code>
          </pre>
        );
      },
      hr: () => <hr className="my-6 border-border/80" />,
    };
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Top Cockpit Action Bar (Hidden when printing) */}
      <div className="print:hidden border-b border-border bg-surface px-4 py-3 sm:px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/research/${sessionId}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Workspace</span>
            </Link>
            <span className="text-muted-foreground text-xs">•</span>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="font-mono text-[10px] gap-1">
                <ShieldCheck className="h-3 w-3" />
                VERIFIED REPORT
              </Badge>
              <span className="font-mono text-xs text-foreground font-bold hidden md:inline">
                {sessionId}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Edit / View Toggle */}
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="h-8 gap-1.5 text-xs"
            >
              {isEditing ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
              <span>{isEditing ? "Rendered View" : "Edit Mode"}</span>
            </Button>

            {/* Sources Drawer Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSourcesOpen(!isSourcesOpen)}
              className={cn("h-8 gap-1.5 text-xs", isSourcesOpen && "bg-surface-raised border-primary/40")}
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Sources (5)</span>
            </Button>

            {/* Copy Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMarkdown}
              className="h-8 gap-1 text-xs"
              title="Copy formatted markdown"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Copy</span>
            </Button>

            {/* Export Markdown */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMarkdown}
              className="h-8 gap-1 text-xs"
              title="Download Markdown file"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export .md</span>
            </Button>

            {/* Print / PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="h-8 gap-1.5 text-xs"
              title="Print or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Container */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 gap-8 relative">
        {/* =========================================================================
            LEFT STICKY SIDEBAR: Scroll-Spy TOC & Session Navigation
            (Hidden on mobile, collapses into drawer or top)
           ========================================================================= */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6 print:hidden">
          <div className="sticky top-16 space-y-4">
            <ReportTOC
              sections={REPORT_SECTIONS}
              activeSectionId={activeSection}
              onSelectSection={handleScrollToSection}
              className="rounded-xl border border-border bg-surface p-2 shadow-xs"
            />

            {/* Interactive Citations Index Pill */}
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2 text-xs font-mono">
              <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">
                Primary Citations (5)
              </span>
              <div className="flex flex-wrap gap-1">
                {Object.values(REPORT_CITATIONS).map((c) => (
                  <CitationChip
                    key={c.index}
                    citation={c}
                    onOpenDrawer={() => setIsSourcesOpen(true)}
                  />
                ))}
              </div>
            </div>

            {/* Navigation links */}
            <div className="rounded-xl border border-border bg-surface p-3 space-y-2 text-xs font-mono">
              <Link
                href={`/research/${sessionId}/trace`}
                className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>View Agent Execution Trace</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            CENTER: Report Content (Rendered Markdown or Editable Autosaving Editor)
           ========================================================================= */}
        <main className="flex-1 min-w-0">
          <div className="space-y-6">
            {/* Adversarial Reviewer Grounding Audit Banner */}
            <ReviewerVerdictCard className="print:hidden" />

            {/* Editable Mode UI */}
            {isEditing ? (
              <div className="rounded-xl border border-border bg-surface shadow-xs p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">Markdown Document Editor</span>
                    <Badge variant="outline" className="text-[10px]">
                      {saveStatus === "saved" ? "All changes saved locally" : "Autosaving..."}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDraft}
                    className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset to AI Draft</span>
                  </Button>
                </div>

                <textarea
                  rows={28}
                  value={markdown}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full font-mono text-xs bg-surface-raised border border-border rounded-lg p-4 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y leading-relaxed"
                />
              </div>
            ) : (
              /* Rendered Academic Report View */
              <article className="rounded-2xl border border-border bg-surface shadow-xs p-6 sm:p-10 text-left print:border-none print:shadow-none print:p-0">
                {/* Printable Header Info */}
                <div className="hidden print:block mb-8 border-b border-zinc-800 pb-4">
                  <div className="text-xs font-mono text-zinc-500 uppercase">
                    ResearchPilot AI Autonomous Multi-Agent Synthesis Dossier
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    Session: {sessionId} • Generated on November 14, 2026 • Local Inference (RTX 5060)
                  </div>
                </div>

                {/* Markdown Parser */}
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              </article>
            )}
          </div>
        </main>
      </div>

      {/* Slide-over Sources Drawer Modal/Backdrop */}
      {isSourcesOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in-0">
          <div className="w-full max-w-md h-full bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-raised">
              <span className="font-mono text-xs font-bold text-foreground">
                Document Evidence & Citations
              </span>
              <button
                onClick={() => setIsSourcesOpen(false)}
                className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground text-xs"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SourcesDrawer />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
