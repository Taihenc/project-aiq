'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, Minimize2, PictureInPicture2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UIMessage } from '@/types';
import { BranchMapFlow } from './branch-map-flow';

interface BranchMapFullscreenProps {
  isOpen: boolean;
  messageTree: Map<string, UIMessage>;
  activePath: string[];
  branchCount: number;
  onNavigate: (messageId: string) => void;
  onClose: () => void;
  onCollapse: () => void;
  onDetach: () => void;
}

export function BranchMapFullscreen({
  isOpen,
  messageTree,
  activePath,
  branchCount,
  onNavigate,
  onClose,
  onCollapse,
  onDetach,
}: BranchMapFullscreenProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[210] bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed inset-4 z-[211] flex flex-col overflow-hidden rounded-2xl border border-border bg-brand-card-purple shadow-[0_24px_64px_-16px_rgba(102,88,204,0.4)]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-brand-surface-light px-5 py-3">
              <GitBranch className="h-4 w-4 shrink-0 text-brand-fg-light" />
              <span className="font-kiona flex-1 text-sm font-semibold text-brand-fg-dark">
                Branch Map
              </span>

              {branchCount > 1 && (
                <span className="rounded-full bg-brand-new-chat-bg px-2 py-0.5 text-[10px] font-semibold text-brand-fg-accent">
                  {branchCount} branches
                </span>
              )}

              <div className="flex items-center gap-1">
                {/* Detach to floating */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-brand-surface-purple hover:text-brand-fg-light"
                      onClick={onDetach}
                    >
                      <PictureInPicture2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Detach to floating panel
                  </TooltipContent>
                </Tooltip>

                {/* Collapse back to popover */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-brand-surface-purple hover:text-brand-fg-light"
                      onClick={onCollapse}
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Back to popover
                  </TooltipContent>
                </Tooltip>

                {/* Close */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={onClose}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div className="min-h-0 flex-1">
              <BranchMapFlow
                messageTree={messageTree}
                activePath={activePath}
                onNavigate={onNavigate}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
