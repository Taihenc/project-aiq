'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, X, PictureInPicture2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSourceExplorerStore } from '@/hooks/useSourceExplorer';
import { useSourceExplorerBody } from './useSourceExplorerBody';
import { SourceExplorerBodyView } from './source-explorer-body';
import type { Citation, FileRef } from '@/types/api';

interface SourceExplorerFullscreenProps {
  attachments: FileRef[];
  availableCitations: Citation[];
  onAddAttachment: (att: FileRef) => void;
  onRemoveChunk: (filePath: string, chunkNumber: number) => void;
}

export function SourceExplorerFullscreen({
  attachments,
  availableCitations,
  onAddAttachment,
  onRemoveChunk,
}: SourceExplorerFullscreenProps) {
  const { mode, isOpen, close, collapse, detach } = useSourceExplorerStore();

  const body = useSourceExplorerBody({
    attachments,
    availableCitations,
    onAddAttachment,
    onRemoveChunk,
  });

  useEffect(() => {
    if (isOpen && mode === 'fullscreen') body.loadFileList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  return (
    <AnimatePresence>
      {isOpen && mode === 'fullscreen' && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[210] bg-background/80 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed inset-4 z-[211] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_64px_-16px_rgba(102,88,204,0.4)]"
          >
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[var(--brand-surface-light)] px-5 py-3">
              <LayoutGrid className="h-4 w-4 shrink-0 text-[var(--brand-fg-light)]" />
              <span className="font-kiona flex-1 text-sm font-semibold text-[var(--brand-fg-dark)]">
                Source Explorer
              </span>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                      onClick={detach}
                    >
                      <PictureInPicture2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Detach to floating panel
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                      onClick={collapse}
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Back to popover
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={close}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <SourceExplorerBodyView
              {...body}
              sidebarWidth={260}
              readerWidth="50%"
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
