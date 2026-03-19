'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Send, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileRef, Citation } from '@/types/api';
import type { ChunkMetadata } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CitationPicker } from './citation-picker';
import { FileExtBadge } from './attachment-pill';

// ── EditAttachmentPill ────────────────────────────────────────────────────────
// Pill with preview popover (same as SentCitationPill) + floating × remove.

function EditAttachmentPill({
  att,
  onRemove,
}: {
  att: FileRef;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const filename = att.file_path.split('/').pop() || att.file_path;
  const ext = att.file_path.split('.').pop()?.toLowerCase();

  const pageMap = new Map<number, ChunkMetadata[]>();
  for (const chunk of att.chunks) {
    const pg = chunk.page_number ?? 0;
    if (!pageMap.has(pg)) pageMap.set(pg, []);
    pageMap.get(pg)!.push(chunk);
  }
  const groupedPages = Array.from(pageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([page_number, chunks]) => ({ page_number, chunks }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.14 }}
      className="group relative flex w-fit max-w-[160px] items-center overflow-visible"
    >
      <Popover>
        <PopoverTrigger asChild>
          {/* Pill — mirrors SentCitationPill trigger exactly */}
          <div className="flex w-fit max-w-[160px] cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-2.5 py-1 text-[var(--brand-fg-medium)] backdrop-blur-sm transition-colors hover:bg-[var(--brand-card-purple)] hover:text-[var(--brand-fg-dark)]">
            <FileExtBadge ext={ext} />
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-none">
              {filename}
            </span>
            <span className="shrink-0 rounded-full bg-[var(--brand-border-light)] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[var(--brand-fg-accent)]">
              {att.chunks.length}
            </span>
          </div>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-72 rounded-xl border-[var(--brand-source-border)] bg-card/98 dark:bg-card p-0 shadow-[0_16px_48px_-16px_rgba(102,88,204,0.4)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[var(--brand-source-border)] px-3 pt-3 pb-2">
            <FileExtBadge ext={ext} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-semibold leading-tight text-[var(--brand-source-text)]">
                {filename}
              </span>
              <span className="text-[10px] text-[var(--brand-source-time)]">
                {att.chunks.length} chunk{att.chunks.length !== 1 ? 's' : ''} ·
                attached
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="shrink-0 rounded-md p-1 text-[var(--brand-source-time)] transition-colors hover:bg-[var(--brand-source-hover-bg)] hover:text-[var(--brand-source-text)]"
              title={expanded ? 'Collapse' : 'Expand all chunks'}
            >
              {expanded ? (
                <ChevronsDownUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronsUpDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Pages → Chunks */}
          <div
            className={cn(
              'custom-scrollbar flex flex-col gap-0 overflow-y-auto transition-[max-height] duration-300 ease-in-out',
              expanded ? 'max-h-[60vh]' : 'max-h-52',
            )}
          >
            {groupedPages.map((page) => (
              <div key={page.page_number} className="flex flex-col">
                {page.page_number > 0 && (
                  <div className="mx-3 mt-2 mb-1 flex items-center gap-2 rounded-md bg-[var(--brand-citation-bg)]/60 px-2 py-1">
                    <Badge className="h-auto w-fit shrink-0 rounded-full border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                      Page {page.page_number}
                    </Badge>
                    <span className="text-[10px] text-[var(--brand-source-time)]">
                      {page.chunks.length} chunk
                      {page.chunks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {page.chunks.map((chunk, ci) => (
                  <div
                    key={chunk.chunk_number ?? ci}
                    className={cn(
                      'flex gap-2 px-3 py-2',
                      ci < page.chunks.length - 1 &&
                        'border-b border-[var(--brand-source-border)]/40',
                    )}
                  >
                    <span className="mt-0.5 shrink-0 self-start rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                      #{chunk.chunk_number ?? ci + 1}
                    </span>
                    <p className="min-w-0 flex-1 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--brand-content-text)] [overflow-wrap:anywhere]">
                      {chunk.content ?? (
                        <span className="italic text-[var(--brand-source-time)]">
                          No preview
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* × remove button — floats top-right, appears on group hover */}
      <button
        onClick={onRemove}
        title="Remove attachment"
        className={cn(
          'absolute -top-1.5 -right-1.5 z-10 flex h-4 w-4 items-center justify-center',
          'rounded-full border border-[var(--brand-border-light)] bg-background shadow-sm',
          'text-[var(--brand-fg-muted)] transition-all',
          'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100',
          'hover:bg-destructive hover:text-white hover:border-destructive',
        )}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </motion.div>
  );
}

// ── EditMessageCard ───────────────────────────────────────────────────────────

export interface EditMessageCardProps {
  value: string;
  attachments: FileRef[];
  availableCitations: Citation[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onRemoveAttachment: (index: number) => void;
  onRemoveChunk: (filePath: string, chunkNumber: number) => void;
  onAddAttachment: (attachment: FileRef) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function EditMessageCard({
  value,
  attachments,
  availableCitations,
  textareaRef,
  onChange,
  onKeyDown,
  onRemoveAttachment,
  onRemoveChunk,
  onAddAttachment,
  onCancel,
  onSubmit,
}: EditMessageCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full min-w-[280px] overflow-hidden rounded-2xl border border-[var(--brand-border-light)] bg-background shadow-sm"
    >
      {/* Brand accent bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[var(--brand-btn-primary)]/40 via-[var(--brand-btn-primary)] to-[var(--brand-btn-primary)]/40" />

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        rows={1}
        className={cn(
          'custom-scrollbar w-full resize-none bg-transparent px-4 pt-3 pb-2',
          'min-h-[52px] text-sm leading-relaxed text-foreground',
          'placeholder:text-[var(--brand-fg-muted)] outline-none',
          'transition-colors duration-150',
        )}
        placeholder="Edit your message…"
      />

      {/* Attachment pills */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2.5">
          {attachments.map((att, i) => (
            <EditAttachmentPill
              key={att.file_path}
              att={att}
              onRemove={() => onRemoveAttachment(i)}
            />
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="mx-4 h-px bg-[var(--brand-border-lighter)]" />

      {/* Footer */}
      <div className="flex items-center justify-between px-2 py-1.5">
        <CitationPicker
          availableCitations={availableCitations}
          attachments={attachments}
          onAddAttachment={onAddAttachment}
          onRemoveAttachment={onRemoveAttachment}
          onRemoveChunk={onRemoveChunk}
        />

        <div className="flex shrink-0 items-center gap-0.5">
          <span className="mr-2 hidden shrink-0 items-center gap-1 text-[10px] text-[var(--brand-fg-muted)] sm:flex">
            <kbd className="rounded border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-1 py-0.5 font-sans text-[9px] text-[var(--brand-fg-secondary)]">
              ⌘↵
            </kbd>
          </span>

          <button
            onClick={onCancel}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs text-[var(--brand-fg-secondary)] transition-colors hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
          >
            Cancel
          </button>

          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--brand-btn-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--brand-btn-primary-hover)] disabled:opacity-35"
          >
            <Send className="size-3" />
            Send
          </button>
        </div>
      </div>
    </motion.div>
  );
}
