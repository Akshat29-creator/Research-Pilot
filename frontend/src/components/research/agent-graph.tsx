"use client";

import * as React from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AgentNode, AgentNodeData, AgentNodeStatus } from "@/components/research/agent-node";

const nodeTypes = {
  agentNode: AgentNode,
};

export interface AgentNodeRuntimeState {
  status?: AgentNodeStatus;
  currentTask?: string;
  duration?: string;
  tool?: string;
  tokens?: { prompt: number; completion: number };
  retries?: number;
  iteration?: number;
  maxIterations?: number;
}

export interface AgentGraphProps {
  activeStep?: string;
  reviewIteration?: number;
  maxIterations?: number;
  nodeStates?: Record<string, Partial<AgentNodeRuntimeState>>;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

const AGENT_ORDER = ["orchestrator", "researcher", "analyst", "writer", "reviewer"];

function normalizeNodeId(id?: string): string {
  if (!id) return "orchestrator";
  const lower = id.toLowerCase();
  if (lower === "research") return "researcher";
  if (lower === "analysis") return "analyst";
  return lower;
}

export function AgentGraph({
  activeStep = "orchestrator",
  reviewIteration = 1,
  maxIterations = 3,
  nodeStates = {},
  onNodeClick,
  className,
}: AgentGraphProps) {
  const normActive = normalizeNodeId(activeStep);
  const isFinalComplete = normActive === "final_report" || normActive === "completed";

  const getComputedNodes = React.useCallback((): Node<AgentNodeData>[] => {
    const activeIdx = AGENT_ORDER.indexOf(normActive);

    const agentConfigs = [
      {
        id: "orchestrator",
        aliases: ["orchestrator"],
        label: "Orchestrator",
        role: "Decomposition & Planning",
        defaultTool: "Internal Planner",
        x: 30,
        runningTask: "Formulating research plan and decomposition queries...",
        completedTask: "Research methodology and verification vectors formulated",
        pendingTask: "Awaiting inquiry decomposition...",
      },
      {
        id: "researcher",
        aliases: ["researcher", "research"],
        label: "Research",
        role: "Evidence Retrieval",
        defaultTool: "SearXNG & Vector RAG",
        x: 340,
        runningTask: "Querying search engines and local vector store...",
        completedTask: "Retrieved empirical evidence and verified citations",
        pendingTask: "Awaiting research vectors...",
      },
      {
        id: "analyst",
        aliases: ["analyst", "analysis"],
        label: "Analysis",
        role: "Contradiction Resolution",
        defaultTool: "qwen2.5:3b (Cross-Encoder)",
        x: 650,
        runningTask: "Cross-referencing evidence and synthesizing claims...",
        completedTask: "Resolved contradictions and synthesized findings",
        pendingTask: "Awaiting retrieved evidence payload...",
      },
      {
        id: "writer",
        aliases: ["writer"],
        label: "Writer",
        role: "Report Synthesis",
        defaultTool: "Markdown Compiler",
        x: 960,
        runningTask: `Synthesizing report draft (Iteration ${reviewIteration}/${maxIterations})...`,
        completedTask: "Compiled comprehensive academic report draft",
        pendingTask: "Awaiting analyzed evidence payload...",
      },
      {
        id: "reviewer",
        aliases: ["reviewer"],
        label: "Reviewer",
        role: "Adversarial Grounding Gate",
        defaultTool: "Citation Auditor",
        x: 1270,
        runningTask: "Auditing citation density and fact verification...",
        completedTask: "Verified citation grounding and passed audit",
        pendingTask: "Awaiting draft report for adversarial gate...",
      },
    ];

    return agentConfigs.map((cfg, idx) => {
      // Find any state overrides by id or aliases
      let customState: Partial<AgentNodeRuntimeState> | undefined = nodeStates[cfg.id];
      if (!customState) {
        for (const alias of cfg.aliases) {
          if (nodeStates[alias]) {
            customState = nodeStates[alias];
            break;
          }
        }
      }

      let status: AgentNodeStatus;
      if (customState?.status) {
        status = customState.status;
      } else if (isFinalComplete) {
        status = "completed";
      } else if (activeIdx >= 0) {
        if (idx < activeIdx) {
          status = "completed";
        } else if (idx === activeIdx) {
          status = "running";
        } else {
          status = "pending";
        }
      } else {
        status = idx === 0 ? "running" : "pending";
      }

      let currentTask: string;
      if (customState?.currentTask) {
        currentTask = customState.currentTask;
      } else if (status === "running") {
        currentTask = cfg.runningTask;
      } else if (status === "completed") {
        currentTask = cfg.completedTask;
      } else {
        currentTask = cfg.pendingTask;
      }

      return {
        id: cfg.id,
        type: "agentNode",
        position: { x: cfg.x, y: 80 },
        data: {
          label: cfg.label,
          role: cfg.role,
          status,
          currentTask,
          duration: customState?.duration,
          tool: customState?.tool || cfg.defaultTool,
          tokens: customState?.tokens,
          iteration: cfg.id === "writer" ? (customState?.iteration ?? reviewIteration) : undefined,
          maxIterations: cfg.id === "writer" ? (customState?.maxIterations ?? maxIterations) : undefined,
        },
      };
    });
  }, [normActive, isFinalComplete, nodeStates, reviewIteration, maxIterations]);

  const getComputedEdges = React.useCallback((): Edge[] => {
    const activeIdx = AGENT_ORDER.indexOf(normActive);

    const edgeDefs = [
      { id: "e1", source: "orchestrator", target: "researcher", sourceIdx: 0, targetIdx: 1 },
      { id: "e2", source: "researcher", target: "analyst", sourceIdx: 1, targetIdx: 2 },
      { id: "e3", source: "analyst", target: "writer", sourceIdx: 2, targetIdx: 3 },
      { id: "e4", source: "writer", target: "reviewer", sourceIdx: 3, targetIdx: 4 },
    ];

    const edges: Edge[] = edgeDefs.map((def) => {
      const isPast = isFinalComplete || (activeIdx > def.sourceIdx);
      const isCurrentTransition = activeIdx === def.targetIdx;

      return {
        id: def.id,
        source: def.source,
        target: def.target,
        animated: isCurrentTransition,
        style: {
          stroke: isPast ? "#10b981" : "var(--border-strong)",
          strokeWidth: isPast ? 2 : 1.5,
        },
      };
    });

    // Bounded Review Loop feedback edge from Reviewer back to Writer
    const inReviewLoop = reviewIteration > 1 && (normActive === "writer" || normActive === "reviewer");
    edges.push({
      id: "e-review-loop",
      source: "reviewer",
      target: "writer",
      label: `Revision Loop (${reviewIteration}/${maxIterations})`,
      animated: inReviewLoop,
      style: {
        stroke: inReviewLoop ? "#f59e0b" : "#71717a",
        strokeWidth: 1.5,
        strokeDasharray: "4,4",
      },
      labelStyle: {
        fill: inReviewLoop ? "#f59e0b" : "#71717a",
        fontFamily: "monospace",
        fontSize: 10,
      },
    });

    return edges;
  }, [normActive, isFinalComplete, reviewIteration, maxIterations]);

  const [nodes, setNodes, onNodesChange] = useNodesState(getComputedNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(getComputedEdges());

  // Dynamically synchronize ReactFlow nodes and edges whenever runtime props change
  React.useEffect(() => {
    setNodes(getComputedNodes());
    setEdges(getComputedEdges());
  }, [getComputedNodes, getComputedEdges, setNodes, setEdges]);

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
