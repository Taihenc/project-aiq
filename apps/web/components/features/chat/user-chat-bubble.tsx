'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileRef, Citation, SearchFilter } from '@/types/api';
import { SentAttachmentsPillRow } from './sent-citation-pill';
import { EditMessageCard } from './edit-message-card';
import { useEditMessage } from '@/hooks/useEditMessage';

export function UserChatBubble({
  content,
  sentAttachments,
  searchFilter,
  messageId,
  branchIndex = 0,
  siblingCount = 1,
  onNavigateBranch,
  onEditMessage,
  availableCitations = [],
  isLoading = false,
}: {
  content: unknown;
  sentAttachments?: FileRef[];
  searchFilter?: SearchFilter;
  messageId?: string;
  branchIndex?: number;
  siblingCount?: number;
  onNavigateBranch?: (messageId: string, direction: 'prev' | 'next') => void;
  onEditMessage?: (
    messageId: string,
    newContent: string,
    attachments?: FileRef[],
  ) => void;
  availableCitations?: Citation[];
  isLoading?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLong, setIsLong] = useState(false);
  const [height, setHeight] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const msgRef = useRef<HTMLDivElement>(null);

  const {
    isEditing,
    editValue,
    setEditValue,
    editAttachments,
    textareaRef,
    handleStartEdit,
    handleCancelEdit,
    handleSubmitEdit,
    handleKeyDown,
    handleAddAttachment,
    handleRemoveAttachment,
    handleRemoveChunk,
  } = useEditMessage({
    content,
    sentAttachments,
    messageId,
    isLoading,
    onEditMessage,
  });

  useEffect(() => {
    if (msgRef.current) {
      const scrollHeight = msgRef.current.scrollHeight;
      if (scrollHeight > 350) {
        setIsLong(true);
        setHeight(isExpanded ? scrollHeight : 350);
      } else {
        setIsLong(false);
        setHeight(scrollHeight);
      }
    }
  }, [content, isExpanded]);

  const contentText =
    typeof content === 'string' ? content : JSON.stringify(content);

  return (
    <div className="flex max-w-[80%] flex-col items-end gap-3">
      {/* Row: pencil + bubble/edit-card */}
      <div
        className="flex items-start gap-1.5"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Pencil button — slides in on hover, aligned to top of bubble */}
        <motion.button
          onClick={handleStartEdit}
          initial={false}
          animate={
            isHovered && !isEditing && messageId && onEditMessage
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: 6 }
          }
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className={cn(
            'mt-2 shrink-0 rounded-md p-1.5 text-[var(--brand-fg-secondary)]',
            'transition-colors hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]',
            !(isHovered && !isEditing && messageId && onEditMessage) &&
              'pointer-events-none',
          )}
          title="Edit message"
        >
          <Pencil className="size-3.5" />
        </motion.button>

        {/* Bubble / edit card */}
        <div className="flex w-full max-w-sm flex-col items-end gap-2">
          <AnimatePresence mode="wait" initial={false}>
            {isEditing ? (
              <EditMessageCard
                key="edit-card"
                value={editValue}
                attachments={editAttachments}
                availableCitations={availableCitations}
                textareaRef={textareaRef}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={handleKeyDown}
                onRemoveAttachment={handleRemoveAttachment}
                onRemoveChunk={handleRemoveChunk}
                onAddAttachment={handleAddAttachment}
                onCancel={handleCancelEdit}
                onSubmit={handleSubmitEdit}
              />
            ) : (
              /* ── Message bubble ──────────────────────────────────────── */
              <motion.div
                key="bubble"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex w-full flex-col items-end gap-2"
              >
                <div
                  ref={msgRef}
                  className="relative overflow-hidden bg-gradient-purple-message shadow-message rounded-bubble rounded-tr-sm px-5 py-3 text-sm font-medium text-white transition-all duration-300 ease-in-out"
                  style={{ height: isLong ? `${height}px` : 'auto' }}
                >
                  <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {contentText}
                  </p>
                  {isLong && !isExpanded && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#7566d9] via-[#8a77eb]/60 to-transparent" />
                  )}
                </div>

                {isLong && (
                  <button
                    onClick={() => setIsExpanded((v) => !v)}
                    className="flex items-center gap-1 text-xs font-medium text-[var(--brand-action-menu-hover)] transition-colors hover:text-[var(--brand-fg-light)]"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Show more
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* end bubble column */}
      </div>
      {/* end pencil+bubble row */}

      {/* Sent attachments + filter circles — hidden while editing */}
      {!isEditing && (sentAttachments?.length || searchFilter) && (
        <SentAttachmentsPillRow
          attachments={sentAttachments ?? []}
          searchFilter={searchFilter}
        />
      )}

      {/* Branch navigation — hidden while editing */}
      {!isEditing && siblingCount > 1 && messageId && onNavigateBranch && (
        <div className="flex items-center gap-0.5 text-xs text-[var(--brand-fg-secondary)]">
          <button
            onClick={() => onNavigateBranch(messageId, 'prev')}
            disabled={branchIndex === 0}
            className="rounded p-0.5 transition-colors hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)] disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="min-w-[2.5rem] text-center font-medium">
            {branchIndex + 1}/{siblingCount}
          </span>
          <button
            onClick={() => onNavigateBranch(messageId, 'next')}
            disabled={branchIndex === siblingCount - 1}
            className="rounded p-0.5 transition-colors hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)] disabled:opacity-30"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
