'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Citation, FileRef } from '@/types/api';
import { ThinkingIndicator } from './thinking-indicator';
import { MarkdownContent } from './markdown-content';
import { SourceCard } from './source-card';

export function AssistantChatBubble({
  content,
  status,
  statusHistory,
  isEmpty,
  isStreaming = false,
  citations: rawCitations = [],
  onAddAttachment,
  onRemoveAttachment,
  onRemoveChunk,
  attachments,
  messageId,
  branchIndex = 0,
  siblingCount = 1,
  onNavigateBranch,
  onRegenerate,
}: {
  content: unknown;
  status?: string;
  statusHistory?: string[];
  isEmpty?: boolean;
  isStreaming?: boolean;
  citations?: Citation[];
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
  attachments?: FileRef[];
  messageId?: string;
  branchIndex?: number;
  siblingCount?: number;
  onNavigateBranch?: (messageId: string, direction: 'prev' | 'next') => void;
  onRegenerate?: (assistantMessageId: string) => void;
}) {
  const citations = rawCitations || [];
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSingleLine, setIsSingleLine] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const [isHovered, setIsHovered] = useState(false);

  // Show ThinkingIndicator only before the very first token arrives.
  // Once streaming has started, never flash the ThinkingIndicator back — content
  // may briefly be empty during the token→result state transition.
  const isThinking = !content && !isEmpty && !isStreaming;

  // Delay citations appearance to avoid layout jitter.
  // Only reset showCitations when not streaming — during token streaming
  // citations.length is 0 every render, and allowing the else branch to fire
  // would restart the timer on the first result render if there were any race.
  useEffect(() => {
    if (citations.length > 0 && (content || isEmpty)) {
      const timer = setTimeout(() => setShowCitations(true), 500);
      return () => clearTimeout(timer);
    } else if (!isStreaming) {
      setShowCitations(false);
    }
  }, [citations.length, content, isEmpty, isStreaming]);

  // Detect single-line cards to vertically centre the avatar
  useEffect(() => {
    if (cardRef.current && citations.length === 0) {
      const timer = setTimeout(() => {
        if (cardRef.current) {
          setIsSingleLine(cardRef.current.offsetHeight <= 65);
        }
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setIsSingleLine(false);
    }
  }, [content, citations.length]);

  return (
    <div
      className={cn('flex gap-4 items-start', isSingleLine && 'items-center')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage
          src="/images/backgrounds/ai-profile.png"
          alt="AI Assistant"
        />
        <AvatarFallback className="bg-gradient-to-br from-[#a18fff] to-[#6f5deb] text-xs font-semibold uppercase text-white">
          AI
        </AvatarFallback>
      </Avatar>

      <div className="flex max-w-[80%] flex-col items-start gap-3">
        <div className="flex flex-col gap-3">
          {isThinking ? (
            <ThinkingIndicator status={status} statusHistory={statusHistory} />
          ) : isEmpty ? (
            <div className="flex items-center gap-2.5 rounded-bubble border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3 text-sm text-muted-foreground/60 italic">
              <AlertCircle className="size-4 shrink-0 text-muted-foreground/40" />
              <span>
                The AI didn&apos;t return a response. Please try rephrasing your
                question.
              </span>
            </div>
          ) : (
            <MarkdownContent
              content={
                typeof content === 'string' ? content : JSON.stringify(content)
              }
              cardRef={cardRef}
            />
          )}

          <AnimatePresence>
            {showCitations && citations.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-2 pt-1"
              >
                <div className="flex items-center gap-2">
                  <Badge className="rounded-pill border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                    Citations
                  </Badge>
                </div>

                {/* perspective container so rotateX has depth */}
                <div
                  className="flex flex-col gap-2"
                  style={{ perspective: '900px' }}
                >
                  {citations.map((citation, index) => (
                    <motion.div
                      key={citation.id || `citation-${index}`}
                      initial={{ opacity: 0, y: 22, rotateX: 7, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                      transition={{
                        delay: index * 0.07,
                        type: 'spring',
                        stiffness: 280,
                        damping: 26,
                      }}
                      style={{ transformOrigin: 'top center' }}
                    >
                      <SourceCard
                        source={citation}
                        onAddAttachment={onAddAttachment}
                        onRemoveAttachment={onRemoveAttachment}
                        onRemoveChunk={onRemoveChunk}
                        attachments={attachments}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Regenerate + branch nav row — only visible when fully settled */}
        {!isStreaming &&
          !isThinking &&
          (content || isEmpty) &&
          (messageId || siblingCount > 1) && (
            <div
              className={cn(
                'flex items-center gap-2 transition-opacity duration-150',
                isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none',
              )}
            >
              {messageId && onRegenerate && (
                <button
                  onClick={() => onRegenerate(messageId)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--brand-fg-secondary)] transition-colors hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                  title="Regenerate response"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Regenerate</span>
                </button>
              )}

              {siblingCount > 1 && messageId && onNavigateBranch && (
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
          )}
      </div>
    </div>
  );
}
