import type { UIMessage } from '@/types';
import type { Node, Edge } from '@xyflow/react';

// ─── Data Types ──────────────────────────────────────────────────────────────

export interface BranchNodeData {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  branchIndex: number;
  siblingCount: number;
  childCount: number;
  /** This node is the active tip (current chat end) */
  isActive: boolean;
  /** This node lies on the currently displayed path */
  isOnPath: boolean;
  /** Messages compressed away between this node and its compressed parent */
  skippedAbove: number;
  onNavigate: (messageId: string) => void;
  // React Flow requires index signature for custom node data
  [key: string]: unknown;
}

export type BranchMapNode = Node<BranchNodeData, 'branchPoint'>;
export type BranchMapEdge = Edge;

// ─── Layout Constants ────────────────────────────────────────────────────────

const NODE_W = 230;
const NODE_H = 76;
const H_GAP = 48;
const V_GAP = 88;

// ─── Main Builder ────────────────────────────────────────────────────────────

/**
 * Compress the full message tree into a React Flow graph, keeping only
 * nodes that are meaningful navigation landmarks:
 *   • root nodes
 *   • fork nodes (≥ 2 children)
 *   • direct children of fork nodes (the actual branch tips)
 *   • leaf nodes
 *
 * Chains of pass-through single-child nodes are collapsed into a single edge
 * labelled "N msgs".
 */
export function buildBranchMapGraph(
  tree: Map<string, UIMessage>,
  activePath: string[],
  onNavigate: (messageId: string) => void,
): { nodes: BranchMapNode[]; edges: BranchMapEdge[] } {
  if (tree.size === 0) return { nodes: [], edges: [] };

  // ── Index: children of each node ─────────────────────────────────────────
  const byParent = new Map<string | null, UIMessage[]>();
  for (const m of tree.values()) {
    const key = m.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(m);
  }
  for (const g of byParent.values()) {
    g.sort((a, b) => {
      const diff = (a.branchIndex ?? 0) - (b.branchIndex ?? 0);
      return diff !== 0 ? diff : (a.created ?? 0) - (b.created ?? 0);
    });
  }

  // ── Determine the "keep" set ──────────────────────────────────────────────
  const keepSet = new Set<string>();
  for (const m of tree.values()) {
    const children = byParent.get(m.id) ?? [];
    const isRoot = !m.parentId;
    const isFork = children.length >= 2;
    const isLeaf = children.length === 0;
    const parentChildren = byParent.get(m.parentId ?? null) ?? [];
    const isChildOfFork = parentChildren.length >= 2;

    if (isRoot || isFork || isChildOfFork || isLeaf) {
      keepSet.add(m.id);
    }
  }

  // ── Compressed parent map (walk up to nearest kept ancestor) ─────────────
  const compressedParent = new Map<
    string,
    { parentId: string | null; skipped: number }
  >();
  for (const id of keepSet) {
    const msg = tree.get(id)!;
    if (!msg.parentId) {
      compressedParent.set(id, { parentId: null, skipped: 0 });
      continue;
    }
    let curr = tree.get(msg.parentId);
    let skipped = 0;
    const visited = new Set<string>();
    while (curr && !keepSet.has(curr.id)) {
      if (visited.has(curr.id)) break;
      visited.add(curr.id);
      skipped++;
      curr = curr.parentId ? tree.get(curr.parentId) : undefined;
    }
    compressedParent.set(id, { parentId: curr?.id ?? null, skipped });
  }

  // ── Layout: subtree-width BFS ─────────────────────────────────────────────
  const compressedByParent = new Map<string | null, string[]>();
  for (const [id, { parentId }] of compressedParent.entries()) {
    if (!compressedByParent.has(parentId)) compressedByParent.set(parentId, []);
    compressedByParent.get(parentId)!.push(id);
  }
  for (const g of compressedByParent.values()) {
    g.sort(
      (a, b) =>
        (tree.get(a)?.branchIndex ?? 0) - (tree.get(b)?.branchIndex ?? 0),
    );
  }

  function subtreeWidth(id: string): number {
    const children = compressedByParent.get(id) ?? [];
    if (children.length === 0) return NODE_W + H_GAP;
    return children.reduce((s, c) => s + subtreeWidth(c), 0);
  }

  const positions = new Map<string, { x: number; y: number }>();

  function assignPositions(id: string, xOffset: number, depth: number) {
    const children = compressedByParent.get(id) ?? [];
    const totalW = subtreeWidth(id);
    positions.set(id, {
      x: xOffset + totalW / 2 - NODE_W / 2,
      y: depth * (NODE_H + V_GAP),
    });
    let childX = xOffset;
    for (const c of children) {
      assignPositions(c, childX, depth + 1);
      childX += subtreeWidth(c);
    }
  }

  const roots = compressedByParent.get(null) ?? [];
  roots.sort(
    (a, b) =>
      (tree.get(a)?.branchIndex ?? 0) - (tree.get(b)?.branchIndex ?? 0),
  );
  let xOffset = 0;
  for (const r of roots) {
    assignPositions(r, xOffset, 0);
    xOffset += subtreeWidth(r);
  }

  // ── Build React Flow nodes & edges ────────────────────────────────────────
  const activeSet = new Set(activePath);
  const activeTip = activePath[activePath.length - 1];

  const nodes: BranchMapNode[] = [];
  const edges: BranchMapEdge[] = [];

  for (const id of keepSet) {
    const msg = tree.get(id)!;
    const pos = positions.get(id) ?? { x: 0, y: 0 };
    const parentSiblings = byParent.get(msg.parentId ?? null) ?? [];

    nodes.push({
      id,
      type: 'branchPoint',
      position: pos,
      draggable: false,
      data: {
        messageId: id,
        role: msg.role,
        content: msg.content,
        branchIndex: msg.branchIndex ?? 0,
        siblingCount: parentSiblings.length,
        childCount: (byParent.get(id) ?? []).length,
        isActive: id === activeTip,
        isOnPath: activeSet.has(id),
        skippedAbove: compressedParent.get(id)?.skipped ?? 0,
        onNavigate,
      },
    });
  }

  for (const [id, { parentId, skipped }] of compressedParent.entries()) {
    if (!parentId) continue;
    const isActiveEdge = activeSet.has(parentId) && activeSet.has(id);

    edges.push({
      id: `e-${parentId}-${id}`,
      source: parentId,
      target: id,
      animated: isActiveEdge,
      type: 'smoothstep',
      label: skipped > 0 ? `${skipped} msg${skipped !== 1 ? 's' : ''}` : undefined,
      style: {
        stroke: isActiveEdge
          ? 'var(--brand-btn-primary)'
          : 'var(--brand-fg-muted)',
        strokeWidth: isActiveEdge ? 2.5 : 1.5,
        strokeDasharray: isActiveEdge ? undefined : '6 4',
        opacity: isActiveEdge ? 1 : 0.45,
      },
      labelStyle: {
        fontSize: 10,
        fontWeight: 500,
        fill: 'var(--brand-fg-muted)',
      },
      labelBgStyle: {
        fill: 'var(--brand-surface-purple)',
        fillOpacity: 0.9,
        borderRadius: 6,
      },
      labelBgPadding: [4, 6] as [number, number],
    });
  }

  return { nodes, edges };
}
