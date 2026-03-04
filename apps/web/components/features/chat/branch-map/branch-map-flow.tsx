'use client';

import React, { useMemo, useCallback } from 'react';
import { GitFork } from 'lucide-react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { UIMessage } from '@/types';
import { buildBranchMapGraph, type BranchMapNode } from './branch-map-utils';
import { BranchMapNodeComponent } from './branch-map-node';

// ─── Node Types ──────────────────────────────────────────────────────────────

const nodeTypes = { branchPoint: BranchMapNodeComponent };

// ─── Props ───────────────────────────────────────────────────────────────────

interface BranchMapFlowProps {
  messageTree: Map<string, UIMessage>;
  activePath: string[];
  onNavigate: (messageId: string) => void;
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface-purple">
        <GitFork className="h-6 w-6 text-brand-fg-muted" />
      </div>
      <p className="text-sm font-medium text-brand-fg-medium">
        No branches yet
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Edit a message or regenerate a response to create alternative
        conversation branches.
      </p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BranchMapFlow({
  messageTree,
  activePath,
  onNavigate,
}: BranchMapFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildBranchMapGraph(messageTree, activePath, onNavigate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messageTree, activePath],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Re-sync when messageTree / activePath change
  const syncedNodes = useMemo(
    () => buildBranchMapGraph(messageTree, activePath, onNavigate).nodes,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messageTree, activePath],
  );
  const syncedEdges = useMemo(
    () => buildBranchMapGraph(messageTree, activePath, onNavigate).edges,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messageTree, activePath],
  );

  const handleNodeClick = useCallback<NodeMouseHandler<BranchMapNode>>(
    (_event, node) => {
      node.data.onNavigate(node.data.messageId);
    },
    [],
  );

  const hasBranches = Array.from(messageTree.values()).some(
    (m) =>
      m.parentId &&
      (messageTree.get(m.parentId)?.parentId !== null || true) &&
      Array.from(messageTree.values()).filter((x) => x.parentId === m.parentId)
        .length > 1,
  );

  if (messageTree.size === 0 || !hasBranches) {
    return <EmptyState />;
  }

  return (
    <div className="branch-map-canvas h-full w-full">
      <ReactFlow
        nodes={syncedNodes}
        edges={syncedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="branch-map-rf"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.2}
          color="var(--brand-fg-muted)"
          style={{ opacity: 0.25 }}
        />

        <Controls
          showInteractive={false}
          style={{
            background: 'var(--brand-card-purple)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 4px 16px -6px rgba(102,88,204,0.25)',
            overflow: 'hidden',
          }}
        />
      </ReactFlow>

      {/* Scoped styles injected once */}
      <style>{`
        .branch-map-rf .react-flow__controls-button {
          background: transparent;
          border-color: var(--border);
          color: var(--brand-fg-medium);
        }
        .branch-map-rf .react-flow__controls-button:hover {
          background: var(--brand-surface-purple);
        }
        .branch-map-rf .react-flow__edge-path {
          transition: stroke 0.2s;
        }
      `}</style>
    </div>
  );
}
