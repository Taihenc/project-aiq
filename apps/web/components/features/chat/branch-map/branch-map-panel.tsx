'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { GitBranch, X, Minus, Minimize2, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UIMessage } from '@/types';
import { BranchMapFlow } from './branch-map-flow';

// ─── Props ───────────────────────────────────────────────────────────────────

interface BranchMapPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCollapse: () => void;
  messageTree: Map<string, UIMessage>;
  activePath: string[];
  onNavigate: (messageId: string) => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_W = 580;
const DEFAULT_H = 480;

// ─── Component ───────────────────────────────────────────────────────────────

export function BranchMapPanel({
  isOpen,
  onClose,
  onCollapse,
  messageTree,
  activePath,
  onNavigate,
}: BranchMapPanelProps) {
  const [minimized, setMinimized] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const totalBranches = Array.from(messageTree.values()).reduce(
    (max, m) => Math.max(max, m.branchIndex ?? 0),
    0,
  );

  const handleNavigate = useCallback(
    (messageId: string) => {
      onNavigate(messageId);
    },
    [onNavigate],
  );

  return (
    <>
      {/* Full-viewport drag constraint boundary (invisible) */}
      <div
        ref={constraintsRef}
        className="pointer-events-none fixed inset-0 z-200"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={constraintsRef}
            dragMomentum={false}
            dragElastic={0}
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={{
              width: DEFAULT_W,
              position: 'fixed',
              bottom: '5.5rem',
              right: '1.5rem',
              zIndex: 201,
            }}
            className="branch-map-panel flex flex-col overflow-hidden rounded-2xl border border-border bg-brand-card-purple shadow-[0_16px_48px_-16px_rgba(102,88,204,0.35),0_2px_8px_-2px_rgba(0,0,0,0.12)]"
          >
            {/* ── Title bar (drag handle) ─────────────────────────────── */}
            <div
              className="flex cursor-grab items-center gap-2.5 border-b border-border bg-brand-surface-light px-4 py-2.5 active:cursor-grabbing"
              onPointerDown={(e) => {
                // Only start drag from the bar background itself, not from the buttons
                if ((e.target as HTMLElement).closest('button')) return;
                dragControls.start(e);
              }}
            >
              {/* Grip icon */}
              <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-brand-fg-muted pointer-events-none" />

              {/* Brand icon + title */}
              <GitBranch className="h-4 w-4 shrink-0 text-brand-fg-light" />
              <span className="font-kiona flex-1 text-sm font-medium text-brand-fg-dark">
                Branch Map
              </span>

              {/* Branch count badge */}
              {totalBranches > 0 && (
                <span className="rounded-full bg-brand-new-chat-bg px-2 py-0.5 text-[10px] font-semibold text-brand-fg-accent">
                  {totalBranches + 1} branches
                </span>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Collapse back to popover */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-brand-surface-purple hover:text-brand-fg-light"
                      onClick={onCollapse}
                    >
                      <Minimize2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Back to popover
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-brand-surface-purple hover:text-brand-fg-light"
                  onClick={() => setMinimized((v) => !v)}
                  title={minimized ? 'Expand' : 'Minimize'}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={onClose}
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* ── Canvas area ────────────────────────────────────────── */}
            <AnimatePresence initial={false}>
              {!minimized && (
                <motion.div
                  key="canvas"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: DEFAULT_H, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  style={{ overflow: 'hidden' }}
                >
                  <BranchMapFlow
                    messageTree={messageTree}
                    activePath={activePath}
                    onNavigate={handleNavigate}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
