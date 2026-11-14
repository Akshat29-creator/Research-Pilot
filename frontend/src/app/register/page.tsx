"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Zap,
  AlertCircle,
  CheckCircle2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { authApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please provide a valid email address.");
      return;
    }

    if (!hasMinLength) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authApi.register(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
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
              <span>Isolated Local PostgreSQL Database</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Create your private autonomous research workspace.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your research profile, document collections, vector embeddings, and synthesis dossiers
              are persisted locally in your dedicated PostgreSQL instance with strict encryption and zero telemetry leaks.
            </p>
          </div>

          {/* Architecture Benefits */}
          <div className="rounded-xl border border-border bg-surface-raised p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/80">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                SYSTEM GUARANTEES
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                100% On-Device
              </Badge>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Zero cloud subscription fees or API meter charges</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Local GPU acceleration on host NVIDIA RTX 5060 (8GB VRAM)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Direct HNSW vector search via PostgreSQL 16 + pgvector</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Zero telemetry tracking. Your data belongs solely to your workstation.</span>
          </div>
        </div>

        {/* Bottom Platform Tag */}
        <div className="text-[11px] font-mono text-muted-foreground">
          ResearchPilot AI Platform • OpenTelemetry GenAI Semantic Conventions v1.28
        </div>
      </div>

      {/* Right Column: Registration Form */}
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
            LOCAL REGISTRATION
          </Badge>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="rounded-2xl border border-border bg-surface p-7 sm:p-9 shadow-xl space-y-6">
            {/* Form Header */}
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Create Local Account
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Initialize your local researcher profile and database workspace.
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

            {/* Register Form */}
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
                    placeholder="researcher@example.com"
                    className="pl-9 font-mono text-xs h-9 bg-surface-raised border-border"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="pl-9 pr-9 font-mono text-xs h-9 bg-surface-raised border-border"
                    autoComplete="new-password"
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

              <div>
                <label className="block text-xs font-mono font-medium text-foreground mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="pl-9 font-mono text-xs h-9 bg-surface-raised border-border"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="rounded-lg border border-border/80 bg-surface-raised/60 p-2.5 space-y-1 font-mono text-[11px]">
                <div className="flex items-center gap-1.5 text-xs">
                  {hasMinLength ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 inline-block" />
                  )}
                  <span className={hasMinLength ? "text-emerald-400" : "text-muted-foreground"}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {passwordsMatch ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 inline-block" />
                  )}
                  <span className={passwordsMatch ? "text-emerald-400" : "text-muted-foreground"}>
                    Passwords match
                  </span>
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
                    <span>Creating Workspace Account...</span>
                  </>
                ) : (
                  <span>Create Account &amp; Initialize</span>
                )}
              </Button>
            </form>

            {/* Login Footer Switch */}
            <div className="text-center text-xs font-mono text-muted-foreground pt-1 border-t border-border/80">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-semibold">
                Sign In
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
