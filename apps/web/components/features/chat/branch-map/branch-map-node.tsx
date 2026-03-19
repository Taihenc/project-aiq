'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { User, Bot, GitBranch } from 'lucide-react';
import type { BranchMapNode } from './branch-map-utils';

type BranchMapNodeProps = NodeProps<BranchMapNode>;

export const BranchMapNodeComponent = memo(function BranchMapNodeComponent({
  data,
  selected,
}: BranchMapNodeProps) {
  const {
    messageId,
    role,
    content,
    siblingCount,
    branchIndex,
    childCount,
    isActive,
    isOnPath,
    onNavigate,
  } = data;

  const preview = content?.trim().slice(0, 72) || '…';
  const truncated = (content?.trim().length ?? 0) > 72;

  // Visual state hierarchy: active > onPath > idle
  const stateClasses = isActive
    ? 'border-brand-btn-primary bg-gradient-to-br from-brand-surface-purple to-brand-card-purple shadow-[0_0_0_2px_var(--brand-btn-primary),0_8px_24px_-8px_rgba(107,90,224,0.55)]'
    : isOnPath
      ? 'border-brand-fg-accent bg-brand-card-purple shadow-[0_4px_16px_-6px_rgba(107,90,224,0.3)]'
      : 'border-border bg-brand-surface-light hover:border-brand-fg-muted hover:bg-brand-card-purple opacity-75 hover:opacity-100';

  const roleColor =
    role === 'user'
      ? 'bg-gradient-to-br from-brand-btn-primary to-[#5a48d1] text-white'
      : 'bg-brand-surface-purple text-brand-fg-light border border-(--brand-fg-muted)/30';

  return (
    <>
      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={{
          background: 'var(--brand-fg-muted)',
          border: 'none',
          width: 6,
          height: 6,
        }}
      />

      <button
        onClick={() => onNavigate(messageId)}
        className={[
          'group relative flex w-[230px] cursor-pointer flex-col gap-2 rounded-2xl border p-3 text-left',
          'transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-btn-primary',
          stateClasses,
          selected ? 'ring-2 ring-(--brand-btn-primary)/50' : '',
        ].join(' ')}
      >
        {/* Header row */}
        <div className="flex items-center gap-2">
          {/* Role avatar */}
          <span
            className={[
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]',
              roleColor,
            ].join(' ')}
          >
            {role === 'user' ? (
              <User className="h-3 w-3" />
            ) : (
              <Bot className="h-3 w-3" />
            )}
          </span>

          {/* Role label */}
          <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {role === 'user' ? 'You' : 'AI'}
          </span>

          {/* Branch badge — shown on fork nodes and when there are siblings */}
          {siblingCount > 1 && (
            <span className="flex items-center gap-1 rounded-full bg-brand-surface-purple px-2 py-0.5 text-[10px] font-semibold text-brand-fg-medium">
              <GitBranch className="h-2.5 w-2.5" />
              {branchIndex + 1}/{siblingCount}
            </span>
          )}

          {/* Fork indicator */}
          {childCount >= 2 && (
            <span className="rounded-full bg-brand-new-chat-bg px-1.5 py-0.5 text-[10px] font-bold text-brand-fg-accent">
              ×{childCount}
            </span>
          )}
        </div>

        {/* Message preview */}
        <p className="line-clamp-2 text-[12px] leading-[1.45] text-foreground opacity-80">
          {preview}
          {truncated && <span className="text-brand-fg-muted">…</span>}
        </p>

        {/* Active pip */}
        {isActive && (
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-brand-btn-primary ring-2 ring-background" />
        )}
      </button>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        style={{
          background: 'var(--brand-fg-muted)',
          border: 'none',
          width: 6,
          height: 6,
        }}
      />
    </>
  );
});

BranchMapNodeComponent.displayName = 'BranchMapNode';
