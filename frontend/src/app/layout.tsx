import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchPilot AI — Local-First Autonomous Research",
  description: "Multi-agent automated research platform powered by LangGraph, Ollama, and pgvector.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
