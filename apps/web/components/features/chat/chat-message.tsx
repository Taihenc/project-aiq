'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { ChatMessageProps } from '@/types';
import Image from 'next/image';
import { ThinkingIndicator } from './thinking-indicator';
import { SentAttachmentsPillRow } from './sent-citation-pill';
import { SourceCard } from './source-card';

export function ChatMessage({
  role,
  content,
  citations: rawCitations = [],
  status,
  statusHistory,
  isEmpty,
  sentAttachments,
  onAddAttachment,
  onRemoveAttachment,
  onRemoveChunk,
  attachments,
}: ChatMessageProps) {
  const citations = rawCitations || [];
  const isUser = role === 'user';
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSingleLine, setIsSingleLine] = useState(false);
  const [isUserMessageExpanded, setIsUserMessageExpanded] = useState(false);
  const userMsgRef = useRef<HTMLDivElement>(null);
  const [isLongUserMessage, setIsLongUserMessage] = useState(false);
  const [userMsgHeight, setUserMsgHeight] = useState<number>(0);
  const [showCitations, setShowCitations] = useState(false);

  const isThinking = role === 'assistant' && !content && !isEmpty;

  // Delay citations appearance to avoid layout jitter
  useEffect(() => {
    if (citations.length > 0 && (content || isEmpty)) {
      const timer = setTimeout(() => setShowCitations(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowCitations(false);
    }
  }, [citations.length, content, isEmpty]);

  useEffect(() => {
    if (isUser && userMsgRef.current) {
      const scrollHeight = userMsgRef.current.scrollHeight;
      // If content height exceeds 350px, it's long
      if (scrollHeight > 350) {
        setIsLongUserMessage(true);
        setUserMsgHeight(isUserMessageExpanded ? scrollHeight : 350);
      } else {
        setIsLongUserMessage(false);
        setUserMsgHeight(scrollHeight);
      }
    }
  }, [content, isUser, isUserMessageExpanded]);

  useEffect(() => {
    if (!isUser && cardRef.current && (citations?.length || 0) === 0) {
      // Wait a bit for the card to render fully
      const timer = setTimeout(() => {
        if (cardRef.current) {
          const height = cardRef.current.offsetHeight;
          // A single line of text (text-sm leading-relaxed) with p-5 padding should be around 50-60px
          setIsSingleLine(height <= 65);
        }
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setIsSingleLine(false);
    }
  }, [content, isUser, citations?.length]);

  return (
    <div
      className={cn(
        'flex gap-4',
        isUser ? 'justify-end' : 'items-start',
        !isUser && isSingleLine && 'items-center',
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage
            src="/images/backgrounds/ai-profile.png"
            alt="AI Assistant"
          />
          <AvatarFallback className="bg-gradient-to-br from-[#a18fff] to-[#6f5deb] text-xs font-semibold uppercase text-white">
            AI
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-3',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        {isUser ? (
          <>
            <div className="relative flex max-w-sm flex-col items-end gap-2">
              <div
                ref={userMsgRef}
                className="relative overflow-hidden bg-gradient-purple-message shadow-message rounded-bubble rounded-tr-sm px-5 py-3 text-sm font-medium text-white transition-all duration-300 ease-in-out"
                style={{
                  height: isLongUserMessage ? `${userMsgHeight}px` : 'auto',
                }}
              >
                <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {typeof content === 'string'
                    ? content
                    : JSON.stringify(content)}
                </p>
                {isLongUserMessage && !isUserMessageExpanded && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#7566d9] via-[#8a77eb]/60 to-transparent" />
                )}
              </div>
              {isLongUserMessage && (
                <button
                  onClick={() =>
                    setIsUserMessageExpanded(!isUserMessageExpanded)
                  }
                  className="flex items-center gap-1 text-xs font-medium text-[var(--brand-action-menu-hover)] hover:text-[var(--brand-fg-light)] transition-colors"
                >
                  {isUserMessageExpanded ? (
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
            </div>
            {/* Sent citation pills — shown below the bubble */}
            {sentAttachments && sentAttachments.length > 0 && (
              <SentAttachmentsPillRow attachments={sentAttachments} />
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {isThinking ? (
              <ThinkingIndicator
                status={status}
                statusHistory={statusHistory}
              />
            ) : isEmpty ? (
              <div className="flex items-center gap-2.5 rounded-bubble border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3 text-sm text-muted-foreground/60 italic">
                <AlertCircle className="size-4 shrink-0 text-muted-foreground/40" />
                <span>
                  The AI didn&apos;t return a response. Please try rephrasing
                  your question.
                </span>
              </div>
            ) : (
              <Card
                ref={cardRef}
                className="shadow-card-md rounded-bubble border-[var(--brand-code-border)] bg-card/95 dark:bg-card p-5 text-sm leading-relaxed text-[var(--brand-code-text)]"
              >
                <div className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-3 last:mb-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-3 ml-4 list-disc space-y-1">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-3 ml-4 list-decimal space-y-1">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="pl-1">{children}</li>
                      ),
                      h1: ({ children }) => (
                        <h1 className="mb-4 text-xl font-bold">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-3 text-lg font-bold">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-2 text-base font-bold">{children}</h3>
                      ),
                      code: ({
                        className,
                        children,
                        ...props
                      }: React.ComponentPropsWithoutRef<'code'>) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;
                        return !isInline ? (
                          <div className="my-3 overflow-hidden rounded-md border border-[var(--brand-code-border)]">
                            <div className="flex items-center justify-between bg-[var(--brand-code-header-bg)] px-4 py-1.5 text-[10px] font-medium text-[var(--brand-code-header-text)]">
                              <span>{match![1].toUpperCase()}</span>
                            </div>
                            <pre className="overflow-x-auto bg-[var(--brand-code-pre-bg)] p-4 text-xs leading-relaxed text-[var(--brand-code-text)]">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        ) : (
                          <code
                            className={cn(
                              'rounded bg-[var(--brand-inline-code-bg)] px-1.5 py-0.5 text-xs font-semibold text-[var(--brand-inline-code-text)]',
                              className,
                            )}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="mb-3 border-l-4 border-[var(--brand-blockquote-border)] pl-4 italic text-[var(--brand-blockquote-text)]">
                          {children}
                        </blockquote>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 font-medium text-[var(--brand-link)] hover:underline"
                        >
                          {children}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ),
                      table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-lg border border-[var(--brand-code-border)]">
                          <table className="w-full border-collapse text-left text-xs">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-[var(--brand-table-head-bg)] text-[var(--brand-table-head-text)]">
                          {children}
                        </thead>
                      ),
                      th: ({ children }) => (
                        <th className="border-b border-[var(--brand-code-border)] px-4 py-2 font-semibold">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border-b border-[var(--brand-table-row-border)] px-4 py-2 text-[var(--brand-table-row-text)]">
                          {children}
                        </td>
                      ),
                      hr: () => (
                        <hr className="my-6 border-t border-[var(--brand-code-border)]" />
                      ),
                      img: ({
                        src,
                        alt,
                      }: React.ComponentPropsWithoutRef<'img'>) => (
                        <Image
                          src={(src as string) || ''}
                          alt={alt || ''}
                          width={500}
                          height={300}
                          className="my-4 max-w-full rounded-lg border border-[var(--brand-code-border)] shadow-sm"
                        />
                      ),
                    }}
                  >
                    {typeof content === 'string'
                      ? content
                      : JSON.stringify(content)}
                  </ReactMarkdown>
                </div>
              </Card>
            )}

            {citations && citations.length > 0 && (
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
        )}
      </div>
    </div>
  );
}

