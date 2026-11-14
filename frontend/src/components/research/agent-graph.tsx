"use client";

import * as React from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AgentNode, AgentNodeData } from "@/components/research/agent-node";

const nodeTypes = {
  agentNode: AgentNode,
};

export interface AgentGraphProps {
  activeStep?: string;
  reviewIteration?: number;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export function AgentGraph({
  activeStep = "analysis",
  reviewIteration = 1,
  onNodeClick,
  className,
}: AgentGraphProps) {
  const initialNodes: Node<AgentNodeData>[] = [
    {
      id: "orchestrator",
      type: "agentNode",
      position: { x: 30, y: 80 },
      data: {
        label: "Orchestrator",
        role: "Decomposition & Planning",
        status: "completed",
        currentTask: "3 sub-hypotheses formulated and prioritized",
        duration: "0.4s",
        tool: "Internal Planner",
        tokens: { prompt: 210, completion: 85 },
      },
    },
    {
      id: "research",
      type: "agentNode",
      position: { x: 340, y: 80 },
      data: {
        label: "Research",
        role: "Evidence Retrieval",
        status: "completed",
        currentTask: "Ingested 14 sources via SearXNG & pgvector",
        duration: "1.6s",
        tool: "SearXNG (Container :8080)",
        tokens: { prompt: 580, completion: 320 },
      },
    },
    {
      id: "analysis",
      type: "agentNode",
      position: { x: 650, y: 80 },
      data: {
        label: "Analysis",
        role: "Contradiction Resolution",
        status: "running",
        currentTask: "Cross-referencing recall benchmarks vs memory footprints...",
        duration: "0.9s",
        tool: "Qwen3:8B Cross-Encoder",
        tokens: { prompt: 440, completion: 180 },
        retries: 0,
      },
    },
    {
      id: "writer",
      type: "agentNode",
      position: { x: 960, y: 80 },
      data: {
        label: "Writer",
        role: "Report Synthesis",
        status: "pending",
        currentTask: "Awaiting analyzed evidence payload",
        tool: "Markdown Compiler",
        iteration: reviewIteration,
        maxIterations: 3,
      },
    },
    {
      id: "reviewer",
      type: "agentNode",
      position: { x: 1270, y: 80 },
      data: {
        label: "Reviewer",
        role: "Adversarial Grounding Gate",
        status: "pending",
        currentTask: "Verifies text offset citations & rejects hallucinations",
        tool: "Citation Auditor",
      },
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: "e1",
      source: "orchestrator",
      target: "research",
      animated: true,
      style: { stroke: "#10b981", strokeWidth: 2 },
    },
    {
      id: "e2",
      source: "research",
      target: "analysis",
      animated: true,
      style: { stroke: "#10b981", strokeWidth: 2 },
    },
    {
      id: "e3",
      source: "analysis",
      target: "writer",
      animated: false,
      style: { stroke: "var(--border-strong)", strokeWidth: 1.5 },
    },
    {
      id: "e4",
      source: "writer",
      target: "reviewer",
      animated: false,
      style: { stroke: "var(--border-strong)", strokeWidth: 1.5 },
    },
    // Bounded Review Loop feedback edge from Reviewer back to Writer
    {
      id: "e-review-loop",
      source: "reviewer",
      target: "writer",
      label: "Revision Loop (Max 3)",
      animated: false,
      style: { stroke: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "4,4" },
      labelStyle: { fill: "#f59e0b", fontFamily: "monospace", fontSize: 10 },
    },
  ];

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className={`h-[340px] w-full rounded-xl border border-border bg-surface overflow-hidden relative ${className || ""}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--border-subtle)" />
        <Controls className="!bg-surface-raised !border-border !fill-foreground [&>button]:!border-border [&>button]:!bg-surface [&>button]:hover:!bg-surface-hover" />
      </ReactFlow>
    </div>
  );
}
