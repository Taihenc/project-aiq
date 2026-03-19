'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileRef, ChunkMetadata, SearchFilter } from '@/types';
import {
  getAttachmentDisplayName,
  getFileExtensionFromName,
} from '@/lib/utils/file-identity';
import { FileExtBadge } from './attachment-pill';
import { ExcludeFilesCircle, SearchFilterCircle } from './message-filter-pills';

import { PILL_VISIBLE_DEFAULT } from '@/constants/chat';

// ── SentAttachmentsPillRow ────────────────────────────────────────────────────

export function SentAttachmentsPillRow({
  attachments,
  searchFilter,
}: {
  attachments: FileRef[];
  searchFilter?: SearchFilter;
}) {
  const [showAll, setShowAll] = useState(false);
  const hidden = attachments.length - PILL_VISIBLE_DEFAULT;
  const always = attachments.slice(0, PILL_VISIBLE_DEFAULT);
  const extra = attachments.slice(PILL_VISIBLE_DEFAULT);

  const {
    exclude: excludeList,
    exclude_file_ids: _excludeFileIds,
    ...filterOnly
  } = searchFilter ?? {};
  const hasFilter = Object.values(filterOnly).some(
    (v) =>
      v !== undefined &&
      v !== null &&
      (Array.isArray(v) ? v.length > 0 : String(v).trim() !== ''),
  );

  const pillVariants = {
    hidden: { opacity: 0, scale: 0.75, y: 4 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.75, y: 4 },
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {/* Filter circles — always first */}
      {excludeList && excludeList.length > 0 && (
        <ExcludeFilesCircle exclude={excludeList} />
      )}
      {hasFilter && <SearchFilterCircle filter={filterOnly} />}

      {/* Attachment pills */}
      {always.map((att) => (
        <SentCitationPill key={att.file_path} att={att} />
      ))}

      <AnimatePresence initial={false}>
        {showAll &&
          extra.map((att, i) => (
            <motion.div
              key={att.file_path}
              variants={pillVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.18, delay: i * 0.04, ease: 'easeOut' }}
            >
              <SentCitationPill att={att} />
            </motion.div>
          ))}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {!showAll && hidden > 0 ? (
          <motion.button
            key="show-more"
            type="button"
            onClick={() => setShowAll(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex cursor-pointer items-center gap-1 rounded-full border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-fg-accent)] transition-colors hover:bg-[var(--brand-card-purple)] hover:text-[var(--brand-fg-dark)]"
          >
            +{hidden} more
          </motion.button>
        ) : showAll && attachments.length > PILL_VISIBLE_DEFAULT ? (
          <motion.button
            key="show-less"
            type="button"
            onClick={() => setShowAll(false)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex cursor-pointer items-center gap-1 rounded-full border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-fg-muted)] transition-colors hover:bg-[var(--brand-card-purple)] hover:text-[var(--brand-fg-dark)]"
          >
            show less
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── SentCitationPill ──────────────────────────────────────────────────────────

export function SentCitationPill({ att }: { att: FileRef }) {
  const [expanded, setExpanded] = useState(false);
  const filename = getAttachmentDisplayName(att);
  const ext = getFileExtensionFromName(filename, att.file_path);

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
    <Popover>
      <PopoverTrigger asChild>
        {/* Pill trigger */}
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
              sent with message
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

        {/* Pages → Chunks (read-only) */}
        <div
          className={cn(
            'flex flex-col gap-0 overflow-y-auto custom-scrollbar transition-[max-height] duration-300 ease-in-out',
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
                  <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-[var(--brand-content-text)] whitespace-pre-wrap [overflow-wrap:anywhere]">
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
  );
}
