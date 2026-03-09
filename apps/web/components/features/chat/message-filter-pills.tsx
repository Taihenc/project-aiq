'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { EyeOff, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  decodeForDisplay,
  getFileExtensionFromName,
  getPathDisplayName,
} from '@/lib/utils/file-identity';
import type { SearchFilter } from '@/types/api';
import { FileExtBadge } from './attachment-pill';

// ── ExcludeFilesCircle ────────────────────────────────────────────────────────

export function ExcludeFilesCircle({ exclude }: { exclude: string[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${exclude.length} file${exclude.length !== 1 ? 's' : ''} excluded from search`}
          className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-rose-200 bg-rose-100 text-rose-500 transition-colors hover:bg-rose-200 dark:border-rose-800/50 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/70"
        >
          <EyeOff className="h-3.5 w-3.5" />
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold leading-none text-white dark:bg-rose-400 dark:text-rose-950">
            {exclude.length}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-72 rounded-xl border-[var(--brand-source-border)] bg-card/98 dark:bg-card p-0 shadow-[0_16px_48px_-16px_rgba(244,63,94,0.25)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--brand-source-border)] px-3 pt-3 pb-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-100 dark:border-rose-800/50 dark:bg-rose-900/40">
            <EyeOff className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs font-semibold leading-tight text-[var(--brand-source-text)]">
              Excluded from search
            </span>
            <span className="text-[10px] text-[var(--brand-source-time)]">
              {exclude.length} file{exclude.length !== 1 ? 's' : ''} hidden from
              results
            </span>
          </div>
        </div>

        {/* File list */}
        <div className="flex max-h-52 flex-col gap-0 overflow-y-auto custom-scrollbar">
          {exclude.map((filePath, i) => {
            const filename = getPathDisplayName(filePath);
            const fullPath = decodeForDisplay(filePath);
            const ext = getFileExtensionFromName(filename, filePath);
            return (
              <div
                key={filePath}
                className={cn(
                  'flex items-center gap-2 px-3 py-2',
                  i < exclude.length - 1 &&
                    'border-b border-[var(--brand-source-border)]/40',
                )}
              >
                <FileExtBadge ext={ext} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[11px] font-medium leading-tight text-[var(--brand-source-text)]">
                    {filename}
                  </span>
                  {fullPath !== filename && (
                    <span className="truncate text-[9px] text-[var(--brand-source-time)]">
                      {fullPath}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── SearchFilterCircle ────────────────────────────────────────────────────────

const FILTER_LABELS: Record<string, string> = {
  file_name: 'File name',
  file_path: 'File path',
  file_type: 'File type',
  department: 'Department',
  team: 'Team',
  project: 'Project',
  tags: 'Tags',
};

export function SearchFilterCircle({
  filter,
}: {
  filter: Omit<SearchFilter, 'exclude'>;
}) {
  const activeEntries = Object.entries(filter).filter(
    ([, v]) =>
      v !== undefined &&
      v !== null &&
      (Array.isArray(v) ? v.length > 0 : String(v).trim() !== ''),
  );

  if (activeEntries.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${activeEntries.length} search filter${activeEntries.length !== 1 ? 's' : ''} active`}
          className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-violet-200 bg-violet-100 text-violet-500 transition-colors hover:bg-violet-200 dark:border-violet-700/50 dark:bg-violet-900/40 dark:text-violet-400 dark:hover:bg-violet-900/70"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-violet-500 px-0.5 text-[8px] font-bold leading-none text-white dark:bg-violet-400 dark:text-violet-950">
            {activeEntries.length}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-72 rounded-xl border-[var(--brand-source-border)] bg-card/98 dark:bg-card p-0 shadow-[0_16px_48px_-16px_rgba(102,88,204,0.4)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--brand-source-border)] px-3 pt-3 pb-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-100 dark:border-violet-700/50 dark:bg-violet-900/40">
            <SlidersHorizontal className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs font-semibold leading-tight text-[var(--brand-source-text)]">
              Search filters applied
            </span>
            <span className="text-[10px] text-[var(--brand-source-time)]">
              {activeEntries.length} filter
              {activeEntries.length !== 1 ? 's' : ''} active
            </span>
          </div>
        </div>

        {/* Filter entries */}
        <div className="flex max-h-52 flex-col gap-0 overflow-y-auto custom-scrollbar">
          {activeEntries.map(([key, value], i) => (
            <div
              key={key}
              className={cn(
                'flex items-start gap-2 px-3 py-2',
                i < activeEntries.length - 1 &&
                  'border-b border-[var(--brand-source-border)]/40',
              )}
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                {FILTER_LABELS[key] ?? key}
              </span>
              <span className="min-w-0 flex-1 break-all text-[11px] leading-relaxed text-[var(--brand-content-text)]">
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
