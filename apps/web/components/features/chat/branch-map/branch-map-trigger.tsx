'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GitBranchPlus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BranchMapTriggerProps {
  onClick: () => void;
  isOpen: boolean;
  branchCount: number;
}

export function BranchMapTrigger({
  onClick,
  isOpen,
  branchCount,
}: BranchMapTriggerProps) {
  const hasBranches = branchCount > 1;
  const prevCountRef = useRef(branchCount);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (branchCount > prevCountRef.current) {
      setPulsing(true);
      const timer = window.setTimeout(() => setPulsing(false), 700);
      prevCountRef.current = branchCount;
      return () => window.clearTimeout(timer);
    }
    prevCountRef.current = branchCount;
  }, [branchCount]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label="Open Branch Map"
          className={[
            'relative flex h-10 w-10 items-center justify-center rounded-full',
            'border shadow-button transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-btn-primary',
            isOpen
              ? 'border-brand-btn-primary bg-brand-btn-primary text-white shadow-[0_8px_20px_-6px_rgba(107,90,224,0.6)]'
              : 'border-(--brand-fg-muted)/40 bg-brand-card-purple text-brand-fg-light hover:border-brand-btn-primary hover:bg-brand-new-chat-bg hover:text-brand-btn-primary',
          ].join(' ')}
        >
          {/* Pulse ring — fires once briefly when a new branch is created */}
          {pulsing && !isOpen && (
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-btn-primary opacity-20" />
          )}

          <GitBranchPlus className="relative h-4.5 w-4.5" />

          {/* Branch count badge */}
          {hasBranches && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-btn-primary px-1 text-[9px] font-bold text-white ring-2 ring-background">
              {branchCount > 9 ? '9+' : branchCount}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        Branch Map
      </TooltipContent>
    </Tooltip>
  );
}
