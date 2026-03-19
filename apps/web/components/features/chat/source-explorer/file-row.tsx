import { cn } from '@/lib/utils';
import { EyeOff } from 'lucide-react';
import { FileExtBadge } from '../attachment-pill';

export interface FileRowProps {
  filePath: string;
  name: string;
  ext?: string;
  citedCount: number;
  attachedCount: number;
  isSelected: boolean;
  onSelect: () => void;
  /** Whether this file is in the global exclude list */
  isExcluded?: boolean;
  /** Called when the exclude toggle is clicked. Not rendered if undefined. */
  onToggleExclude?: (e: React.MouseEvent) => void;
}

export function FileRow({
  name,
  ext,
  citedCount,
  attachedCount,
  isSelected,
  onSelect,
  isExcluded = false,
  onToggleExclude,
}: FileRowProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors',
        isSelected
          ? 'bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)]'
          : isExcluded
            ? 'bg-rose-50/60 text-rose-600/70 dark:bg-rose-950/15 dark:text-rose-400/70'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <FileExtBadge ext={ext ?? ''} />
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-xs font-medium leading-tight',
          isExcluded && 'line-through opacity-60',
        )}
      >
        {name}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        {citedCount > 0 && (
          <span className="rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-fg-accent)]">
            {citedCount}
          </span>
        )}
        {attachedCount > 0 && (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            {attachedCount}
          </span>
        )}
        {/* Exclude toggle — only shown when the callback is provided */}
        {onToggleExclude && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExclude(e);
            }}
            disabled={attachedCount > 0}
            title={
              attachedCount > 0
                ? 'Cannot exclude an attached file'
                : isExcluded
                  ? 'Remove exclusion'
                  : 'Exclude from search'
            }
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded transition-all',
              attachedCount > 0
                ? 'cursor-not-allowed opacity-30'
                : isExcluded
                  ? 'bg-rose-100 text-rose-500 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30',
            )}
          >
            <EyeOff className="h-3 w-3" />
          </button>
        )}
      </div>
    </button>
  );
}
