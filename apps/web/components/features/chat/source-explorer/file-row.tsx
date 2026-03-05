import { cn } from '@/lib/utils';
import { FileExtBadge } from '../attachment-pill';

export interface FileRowProps {
  filePath: string;
  name: string;
  ext?: string;
  citedCount: number;
  attachedCount: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function FileRow({
  name,
  ext,
  citedCount,
  attachedCount,
  isSelected,
  onSelect,
}: FileRowProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors',
        isSelected
          ? 'bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)]'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <FileExtBadge ext={ext ?? ''} />
      <span className="min-w-0 flex-1 truncate text-xs font-medium leading-tight">
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
      </div>
    </button>
  );
}
