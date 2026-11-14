"use client";

import * as React from "react";
import { Check, Cpu, Moon, Save, Search, Shield, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [model, setModel] = React.useState("qwen3:8b");
  const [contextLen, setContextLen] = React.useState("4096");
  const [searchProvider, setSearchProvider] = React.useState("searxng");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Workspace configuration updated successfully");
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono text-[10px]">
            CONFIGURATION
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">Environment &amp; Hardware</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Workspace &amp; Model Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tune on-device inference parameters, search provider routing, and interface preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: LLM Inference Hardware */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" /> On-Device LLM Provider (Ollama)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Primary Reasoning Model
              </label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qwen3:8b">Qwen3:8B (Q4_K_M, 5.2GB) • Recommended</SelectItem>
                  <SelectItem value="llama3.2:3b">Llama3.2:3B (Q4_K_M, 2.0GB) • Ultralight</SelectItem>
                  <SelectItem value="mistral:7b">Mistral:7B (Q4_K_M, 4.4GB)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Runs entirely locally on your RTX 5060 Laptop GPU.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Context Window Token Ceiling (`num_ctx`)
              </label>
              <Select value={contextLen} onValueChange={setContextLen}>
                <SelectTrigger>
                  <SelectValue placeholder="Select context length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2048">2,048 tokens (Ultra-low VRAM)</SelectItem>
                  <SelectItem value="4096">4,096 tokens (Safe Default for 8GB GPU)</SelectItem>
                  <SelectItem value="8192">8,192 tokens (Warning: High VRAM risk)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                4,096 tokens fits comfortably within 5.5GB VRAM allocation.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Search Engine */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" /> Search Provider
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Metasearch Provider
              </label>
              <Select value={searchProvider} onValueChange={setSearchProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select search provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="searxng">SearXNG (Local Docker Container) • Zero Cost</SelectItem>
                  <SelectItem value="tavily" disabled>Tavily (API Key Required)</SelectItem>
                  <SelectItem value="brave" disabled>Brave Search (API Key Required)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                SearXNG Host Endpoint
              </label>
              <Input defaultValue="http://searxng:8080" readOnly className="font-mono text-xs bg-surface-raised" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Aggregates DuckDuckGo, Wikipedia, and Qwant without tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Interface Theme */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Appearance &amp; Accessibility
          </h3>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="gap-2"
            >
              <Moon className="h-3.5 w-3.5" /> Dark Theme (Default)
            </Button>
            <Button
              type="button"
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="gap-2"
            >
              <Sun className="h-3.5 w-3.5" /> Light Theme
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
