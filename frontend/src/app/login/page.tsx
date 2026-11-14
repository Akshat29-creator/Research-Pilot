"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please provide both email address and password.");
      return;
    }

    setLoading(true);

    try {
      await authApi.login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Authentication failed. Please verify your email and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("pilot@researchpilot.com");
    setPassword("PilotSecurePass123!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-foreground">
      {/* Left Column: Workstation & Hardware Telemetry Showcase (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-surface border-r border-border relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-mono font-bold text-sm group-hover:border-primary/60 transition-colors">
              RP
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-foreground flex items-center gap-2">
                <span>ResearchPilot AI</span>
                <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                  Local-First
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Autonomous Multi-Agent Research Workstation
              </div>
            </div>
          </Link>
        </div>

        {/* Middle Hardware & Privacy Showcase */}
        <div className="space-y-6 my-auto max-w-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <StatusDot status="healthy" pulse />
              <span>100% Free &amp; Private On-Device Execution</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Enterprise-grade research with absolute zero cloud egress.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ResearchPilot AI runs autonomous orchestrators, SearXNG metasearch, and pgvector embeddings
              entirely on your local workstation GPU. Your queries, PDF documents, and intelligence dossiers
              never leave your machine.
            </p>
          </div>

          {/* Telemetry Feature Card */}
          <div className="rounded-xl border border-border bg-surface-raised p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/80">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                HOST HARDWARE ENVELOPE
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                RTX 5060 (8GB)
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-muted-foreground block">Reasoning Engine:</span>
                <span className="font-bold text-foreground">Qwen3:8B (Q4_K_M)</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Vector Index:</span>
                <span className="font-bold text-foreground">pgvector (768-d HNSW)</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Context Limit:</span>
                <span className="font-bold text-foreground">4,096 tokens (0 OOM)</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Cloud Ingress Cost:</span>
                <span className="font-bold text-emerald-400">$0.00 / query</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Adversarial Reviewer Gate enforces 90%+ citation verification on all drafts.</span>
          </div>
        </div>

        {/* Bottom Platform Tag */}
        <div className="text-[11px] font-mono text-muted-foreground">
          ResearchPilot AI Platform • Host Model Context Protocol &amp; OpenTelemetry v1.28
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
            SECURE ACCESS
          </Badge>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="rounded-2xl border border-border bg-surface p-7 sm:p-9 shadow-xl space-y-6">
            {/* Form Header */}
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Sign In to Workspace
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Access your private research sessions and document library.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-400"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-mono text-[11px]">{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-foreground mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pilot@researchpilot.com"
                    className="pl-9 font-mono text-xs h-9 bg-surface-raised border-border"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-medium text-foreground">Password</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="pl-9 pr-9 font-mono text-xs h-9 bg-surface-raised border-border"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 font-mono text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90 mt-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authenticating Workspace...</span>
                  </>
                ) : (
                  <span>Sign In to Workstation</span>
                )}
              </Button>
            </form>

            {/* Quick Demo Credentials Autofill */}
            <div className="pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={handleFillDemo}
                className="w-full p-2.5 rounded-lg border border-border/80 bg-surface-raised/60 hover:bg-surface-raised hover:border-primary/40 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-all flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3 w-3 text-primary" />
                  <span>Autofill Demo Credentials</span>
                </span>
                <span className="text-[10px] text-primary font-bold">pilot@researchpilot.com</span>
              </button>
            </div>

            {/* Register Footer Switch */}
            <div className="text-center text-xs font-mono text-muted-foreground pt-1">
              Don&apos;t have a local account?{" "}
              <Link href="/register" className="text-primary hover:underline font-semibold">
                Create Account
              </Link>
            </div>
          </div>
        </div>

        {/* Security & Local Policy Notice */}
        <div className="text-center text-[10px] font-mono text-muted-foreground max-w-md mx-auto">
          Local Security Policy: Passwords hashed with bcrypt (cost=12). Tokens signed locally via PyJWT.
        </div>
      </div>
    </div>
  );
}
