'use client';

import React from 'react';
import { GitBranch, PictureInPicture2, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UIMessage } from '@/types';
import { BranchMapFlow } from './branch-map-flow';

// ─── Props ───────────────────────────────────────────────────────────────────

interface BranchMapPopoverContentProps {
  messageTree: Map<string, UIMessage>;
  activePath: string[];
  branchCount: number;
  onNavigate: (messageId: string) => void;
  onDetach: () => void;
  onFullscreen: () => void;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BranchMapPopoverContent({
  messageTree,
  activePath,
  branchCount,
  onNavigate,
  onDetach,
  onFullscreen,
  onClose,
}: BranchMapPopoverContentProps) {
  return (
    <div className="flex flex-col" style={{ width: 520, height: 440 }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-brand-surface-light px-4 py-2.5">
        <GitBranch className="h-4 w-4 shrink-0 text-brand-fg-light" />

        <span className="font-kiona flex-1 text-sm font-medium text-brand-fg-dark">
          Branch Map
        </span>

        {branchCount > 1 && (
          <span className="rounded-full bg-brand-new-chat-bg px-2 py-0.5 text-[10px] font-semibold text-brand-fg-accent">
            {branchCount} branches
          </span>
        )}

        <div className="flex items-center gap-1">
          {/* Detach → floating panel */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-brand-surface-purple hover:text-brand-fg-light"
                onClick={onDetach}
              >
                <PictureInPicture2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Detach to floating panel
            </TooltipContent>
          </Tooltip>

          {/* Full screen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-brand-surface-purple hover:text-brand-fg-light"
                onClick={onFullscreen}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Fullscreen
            </TooltipContent>
          </Tooltip>

          {/* Close */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── Canvas ─────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1">
        <BranchMapFlow
          messageTree={messageTree}
          activePath={activePath}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
