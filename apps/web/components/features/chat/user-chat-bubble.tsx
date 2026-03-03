'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileRef } from '@/types/api';
import { SentAttachmentsPillRow } from './sent-citation-pill';

export function UserChatBubble({
  content,
  sentAttachments,
  messageId,
  branchIndex = 0,
  siblingCount = 1,
  onNavigateBranch,
  onEditMessage,
}: {
  content: unknown;
  sentAttachments?: FileRef[];
  messageId?: string;
  branchIndex?: number;
  siblingCount?: number;
  onNavigateBranch?: (messageId: string, direction: 'prev' | 'next') => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLong, setIsLong] = useState(false);
  const [height, setHeight] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const msgRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize textarea in edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    setEditValue(
      typeof content === 'string' ? content : JSON.stringify(content),
    );
    setIsEditing(true);
  }, [content]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
  }, []);

  const handleSubmitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed || !messageId || !onEditMessage) return;
    onEditMessage(messageId, trimmed);
    setIsEditing(false);
    setEditValue('');
  }, [editValue, messageId, onEditMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmitEdit();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSubmitEdit, handleCancelEdit],
  );

  const contentText =
    typeof content === 'string' ? content : JSON.stringify(content);

  return (
    <div
      className="flex max-w-[80%] flex-col items-end gap-3 -ml-9 pl-9"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex max-w-sm flex-col items-end gap-2">
        {/* Pencil edit button — outside bubble, appears on hover */}
        {!isEditing && messageId && onEditMessage && (
          <button
            onClick={handleStartEdit}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              'absolute -left-8 top-2 rounded-md p-1.5 text-[var(--brand-fg-secondary)] transition-all hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]',
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
            title="Edit message"
          >
            <Pencil className="size-3.5" />
          </button>
        )}

        {isEditing ? (
          /* Inline edit mode */
          <div className="flex w-full max-w-sm flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] w-full resize-none rounded-bubble rounded-tr-sm bg-gradient-purple-message px-5 py-3 text-sm font-medium text-white outline-none placeholder:text-white/50"
              placeholder="Edit your message…"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-[var(--brand-fg-secondary)] transition-colors hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
              >
                <X className="size-3" />
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                disabled={!editValue.trim()}
                className="flex items-center gap-1 rounded-md bg-[var(--brand-btn-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--brand-btn-primary-hover)] disabled:opacity-40"
              >
                <Send className="size-3" />
                Send
              </button>
            </div>
          </div>
        ) : (
          <>
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
                className="flex items-center gap-1 text-xs font-medium text-[var(--brand-action-menu-hover)] hover:text-[var(--brand-fg-light)] transition-colors"
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
          </>
        )}
      </div>

      {/* Branch navigation */}
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

      {sentAttachments && sentAttachments.length > 0 && (
        <SentAttachmentsPillRow attachments={sentAttachments} />
      )}
    </div>
  );
}
