"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Cpu,
  Layers,
  LogOut,
  Plus,
  Search,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { authApi, healthApi } from "@/lib/api";
import { ReadyResponse, User } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [readyInfo, setReadyInfo] = useState<ReadyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [researchQuery, setResearchQuery] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await authApi.getMe();
        setUser(userData);
      } catch {
        router.push("/login");
        return;
      }

      try {
        const healthData = await healthApi.getReady();
        setReadyInfo(healthData);
      } catch {
        // Readiness check non-blocking
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleLogout = () => {
    authApi.logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 text-sm">
        <Activity className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                RP
              </div>
              <span className="font-semibold text-white tracking-tight">ResearchPilot</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-zinc-400 font-mono">dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            {/* System Status Pill */}
            {readyInfo && (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  readyInfo.status === "healthy"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : readyInfo.status === "degraded"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    readyInfo.status === "healthy"
                      ? "bg-emerald-400"
                      : readyInfo.status === "degraded"
                      ? "bg-amber-400"
                      : "bg-red-400"
                  }`}
                />
                System: {readyInfo.status.toUpperCase()}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-zinc-300 bg-[#18181b] border border-[#27272a] px-3 py-1.5 rounded-lg">
              <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span>{user?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs text-zinc-400 hover:text-white p-2 hover:bg-[#18181b] rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Research Workspace</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Initiate multi-agent investigations with real-time evidence evaluation and grounding.
          </p>
        </div>

        {/* Start New Research Card */}
        <div className="p-6 bg-[#18181b] border border-[#27272a] rounded-2xl shadow-xl mb-8">
          <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> New Research Query
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input
                type="text"
                value={researchQuery}
                onChange={(e) => setResearchQuery(e.target.value)}
                placeholder="Ask an in-depth research question (e.g. Architectural trade-offs between RRF vs Cross-Encoder in Hybrid RAG)..."
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-9 pr-3 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button
              disabled={!researchQuery.trim()}
              onClick={() => alert(`Starting Research: "${researchQuery}". Multi-agent execution will activate in Phase 4!`)}
              className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Start Pilot
            </button>
          </div>
        </div>

        {/* Status & Telemetry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Database</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-semibold text-white">PostgreSQL 16</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">pgvector active</div>
          </div>

          <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Primary Model</span>
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-semibold text-white">Qwen3:8B</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">Q4_K_M (Local Ollama)</div>
          </div>

          <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Search Engine</span>
              <Search className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-semibold text-white">SearXNG</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">Local metasearch container</div>
          </div>

          <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-xl">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
              <span>Active Agents</span>
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-semibold text-white">5 Sequential</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">Semaphore concurrency = 1</div>
          </div>
        </div>

        {/* Recent Sessions List */}
        <div className="border border-[#27272a] rounded-2xl bg-[#18181b] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" /> Research Sessions
            </h3>
            <span className="text-xs text-zinc-500 font-mono">0 active sessions</span>
          </div>

          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 border border-[#27272a] flex items-center justify-center text-zinc-500 mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-medium text-white">No research sessions yet</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Submit your first research inquiry above to dispatch the Orchestrator and Research agents.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
