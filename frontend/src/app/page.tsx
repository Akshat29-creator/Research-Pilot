import Link from "next/link";
import { ArrowRight, Bot, Cpu, Database, FileText, Search, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-[#f4f4f5]">
      {/* Navigation Header */}
      <header className="border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              RP
            </div>
            <span className="font-semibold tracking-tight text-lg text-white">ResearchPilot AI</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-8">
          <Cpu className="w-3.5 h-3.5" />
          Local-First Multi-Agent Research Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
          Autonomous Research with <span className="text-emerald-400">Verifiable Grounding</span>
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Ask complex questions. Coordinated AI agents search the web and uploaded PDFs, analyze evidence, resolve contradictions, and compile cited, reviewed reports—100% locally on your RTX 5060 GPU.
        </p>

        {/* Mock Search Prompt */}
        <div className="w-full max-w-2xl mt-10 p-2 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl focus-within:border-emerald-500/50 transition-colors">
          <div className="flex items-center px-3 py-2 gap-3">
            <Search className="w-5 h-5 text-zinc-500" />
            <input
              type="text"
              readOnly
              placeholder="e.g. Compare HNSW vs IVFFlat indexing in pgvector with memory trade-offs..."
              className="w-full bg-transparent border-none text-zinc-300 placeholder-zinc-500 text-sm focus:outline-none cursor-default"
            />
            <Link
              href="/register"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              Start Research <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="p-6 rounded-xl bg-[#18181b] border border-[#27272a]">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Multi-Agent Graph</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              LangGraph-orchestrated agents: Orchestrator, Research, Analysis, Writer, and Reviewer with bounded revision loops.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#18181b] border border-[#27272a]">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">PostgreSQL + pgvector</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Unified relational and vector store with HNSW indexing, full-text tsvector search, and RRF hybrid rank fusion.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#18181b] border border-[#27272a]">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Verifiable Citations</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Every factual assertion is cryptographically and textually verified against raw extracted source snippets and PDF page offsets.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] py-8 text-center text-xs text-zinc-500">
        ResearchPilot AI — Local-first, privacy-preserving research automation.
      </footer>
    </div>
  );
}
