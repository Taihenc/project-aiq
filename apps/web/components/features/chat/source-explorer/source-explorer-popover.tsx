'use client';

import { useEffect, useState } from 'react';
import {
  LayoutGrid,
  X,
  PictureInPicture2,
  Maximize2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSourceExplorerStore } from '@/hooks/useSourceExplorer';
import { useSourceExplorerBody } from './useSourceExplorerBody';
import { SourceExplorerBodyView } from './source-explorer-body';
import type { Citation, FileRef } from '@/types/api';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SourceExplorerPopoverContentProps {
  attachments: FileRef[];
  availableCitations: Citation[];
  onAddAttachment: (att: FileRef) => void;
  onRemoveChunk: (filePath: string, chunkNumber: number) => void;
}

// ─── Dimensions ──────────────────────────────────────────────────────────────

const POPOVER_H = 480;

// ─── Component ───────────────────────────────────────────────────────────────

export function SourceExplorerPopoverContent({
  attachments,
  availableCitations,
  onAddAttachment,
  onRemoveChunk,
}: SourceExplorerPopoverContentProps) {
  const { close, detach, enterFullscreen } = useSourceExplorerStore();
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  const body = useSourceExplorerBody({
    attachments,
    availableCitations,
    onAddAttachment,
    onRemoveChunk,
  });

  // Load file list when popover opens
  useEffect(() => {
    body.loadFileList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: POPOVER_H }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[var(--brand-surface-light)] px-4 py-2.5">
        <LayoutGrid className="h-4 w-4 shrink-0 text-[var(--brand-fg-light)]" />
        <span className="font-kiona flex-1 text-sm font-medium text-[var(--brand-fg-dark)]">
          Source Explorer
        </span>

        <div className="flex items-center gap-1">
          {/* Global search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  'h-6 w-6 rounded-lg',
                  globalSearchOpen
                    ? 'bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)]'
                    : 'text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]',
                )}
                onClick={() => setGlobalSearchOpen((v) => !v)}
              >
                <Search className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Search all files
            </TooltipContent>
          </Tooltip>
          {/* Detach → floating draggable panel */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                onClick={detach}
              >
                <PictureInPicture2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Detach to floating panel
            </TooltipContent>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                onClick={enterFullscreen}
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
            onClick={close}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <SourceExplorerBodyView
        {...body}
        sidebarWidth={180}
        readerWidth={340}
        globalSearchOpen={globalSearchOpen}
        onGlobalSearchChange={setGlobalSearchOpen}
      />
    </div>
  );
}
