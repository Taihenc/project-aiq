'use client';

import { LayoutGrid } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSourceExplorerStore } from '@/hooks/useSourceExplorer';

interface SourceExplorerTriggerProps {
  /** Extra class names applied to the outer button */
  className?: string;
}

export function SourceExplorerTrigger({
  className,
}: SourceExplorerTriggerProps) {
  const { isOpen, toggle } = useSourceExplorerStore();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          aria-label="Open Source Explorer"
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-full',
            'border shadow-button transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-btn-primary)]',
            isOpen
              ? 'border-[var(--brand-btn-primary)] bg-[var(--brand-btn-primary)] text-white shadow-[0_8px_20px_-6px_rgba(107,90,224,0.6)]'
              : 'border-[var(--brand-fg-muted)]/40 bg-[var(--brand-card-purple)] text-[var(--brand-fg-light)] hover:border-[var(--brand-btn-primary)] hover:bg-[var(--brand-new-chat-bg)] hover:text-[var(--brand-btn-primary)]',
            className,
          )}
        >
          <LayoutGrid className="relative h-4.5 w-4.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Source Explorer
      </TooltipContent>
    </Tooltip>
  );
}
