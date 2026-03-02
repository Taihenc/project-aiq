'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
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
  citations: rawCitations = [],
  onAddAttachment,
  onRemoveAttachment,
  onRemoveChunk,
  attachments,
}: {
  content: unknown;
  status?: string;
  statusHistory?: string[];
  isEmpty?: boolean;
  citations?: Citation[];
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
  attachments?: FileRef[];
}) {
  const citations = rawCitations || [];
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSingleLine, setIsSingleLine] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const isThinking = !content && !isEmpty;

  // Delay citations appearance to avoid layout jitter
  useEffect(() => {
    if (citations.length > 0 && (content || isEmpty)) {
      const timer = setTimeout(() => setShowCitations(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowCitations(false);
    }
  }, [citations.length, content, isEmpty]);

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

          {citations.length > 0 && (
            <div
              className="grid transition-[grid-template-rows,opacity] duration-500 ease-out"
              style={{
                gridTemplateRows: showCitations ? '1fr' : '0fr',
                opacity: showCitations ? 1 : 0,
              }}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-pill border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                      Citations
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-2">
                    {citations.map((citation, index) => (
                      <div
                        key={citation.id || `citation-${index}`}
                        className="transition-all duration-300 ease-out"
                        style={{
                          opacity: showCitations ? 1 : 0,
                          transform: showCitations
                            ? 'translateY(0)'
                            : 'translateY(8px)',
                          transitionDelay: showCitations
                            ? `${200 + index * 100}ms`
                            : '0ms',
                        }}
                      >
                        <SourceCard
                          source={citation}
                          onAddAttachment={onAddAttachment}
                          onRemoveAttachment={onRemoveAttachment}
                          onRemoveChunk={onRemoveChunk}
                          attachments={attachments}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
