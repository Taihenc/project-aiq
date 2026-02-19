'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { ChatMessageProps, Citation, ChunkMetadata, FileRef } from '@/types';
import Image from 'next/image';
import { ThinkingIndicator } from './thinking-indicator';

export function ChatMessage({
  role,
  content,
  citations: rawCitations = [],
  status,
  statusHistory,
  isEmpty,
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
                onClick={() => setIsUserMessageExpanded(!isUserMessageExpanded)}
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

// ─── Sub-components ─────────────────────────────────────────────────────────

function FileTypeIcon({ ext }: { ext: string | undefined }) {
  const colorMap: Record<string, string> = {
    pdf: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
    docx: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    doc: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    xlsx: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    xls: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    csv: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    pptx: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
    ppt: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
    txt: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  const label = (ext?.toUpperCase() ?? 'FILE').slice(0, 4);
  const color =
    colorMap[ext?.toLowerCase() ?? ''] ??
    'bg-[var(--brand-citation-bg)] text-[var(--brand-citation-text)]';
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[9px] font-bold leading-none border border-current/10',
        color,
      )}
    >
      {label}
    </div>
  );
}

function SourceCard({
  source,
  onAddAttachment,
  onRemoveAttachment,
  onRemoveChunk,
  attachments = [],
}: {
  source: Citation;
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
  attachments?: FileRef[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const filePath = source.id;
  const chunks: ChunkMetadata[] = source.chunks ?? [];
  const ext = filePath.split('.').pop()?.toLowerCase();

  // Current FileRef in attachments
  const currentAttachment = attachments.find((a) => a.file_path === filePath);

  const isChunkAttached = (chunkNumber: number) =>
    currentAttachment?.chunks.some((c) => c.chunk_number === chunkNumber) ??
    false;

  const isAllAttached =
    chunks.length > 0 && chunks.every((c) => isChunkAttached(c.chunk_number));

  const handleToggleChunk = (c: ChunkMetadata) => {
    if (isChunkAttached(c.chunk_number)) {
      onRemoveChunk?.(filePath, c.chunk_number);
    } else {
      onAddAttachment?.({
        file_path: filePath,
        chunks: [
          {
            chunk_number: c.chunk_number,
            page_number: c.page_number,
            content: c.content,
          },
        ],
      });
    }
  };

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAllAttached) {
      const index = attachments.findIndex((a) => a.file_path === filePath);
      if (index !== -1) onRemoveAttachment?.(index);
    } else {
      onAddAttachment?.({
        file_path: filePath,
        chunks: chunks.map((c) => ({
          chunk_number: c.chunk_number,
          page_number: c.page_number,
          content: c.content,
        })),
      });
    }
  };

  // Group source.chunks by page_number for the expanded view
  const pageMap = new Map<number, ChunkMetadata[]>();
  for (const chunk of chunks) {
    const pg = chunk.page_number ?? 0;
    if (!pageMap.has(pg)) pageMap.set(pg, []);
    pageMap.get(pg)!.push(chunk);
  }
  const groupedPages = Array.from(pageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([page_number, pageChunks]) => ({ page_number, chunks: pageChunks }));

  return (
    <Card
      className={cn(
        'rounded-card overflow-hidden transition-colors duration-200',
        isAllAttached
          ? 'border-brand-attached-border bg-brand-attached-bg shadow-[0_20px_60px_-48px_rgba(72,187,120,0.4)] dark:shadow-none'
          : 'border-[var(--brand-source-border)] bg-card/95 dark:bg-card shadow-[0_20px_60px_-48px_rgba(102,88,204,0.6)] dark:shadow-none',
        !isOpen && !isAllAttached && 'hover:bg-[var(--brand-source-hover-bg)]',
        !isOpen && isAllAttached && 'hover:bg-brand-attached-hover-bg',
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* ── Header row ── */}
        <div
          className="flex items-center"
          style={isOpen ? { marginBottom: '1rem' } : undefined}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="group rounded-card flex flex-1 items-center justify-between bg-transparent hover:bg-transparent px-4 py-3 text-[var(--brand-source-text)] transition-all duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileTypeIcon ext={ext} />
                <div className="flex flex-col items-start min-w-0">
                  <span className="truncate text-sm font-medium text-[var(--brand-source-text)] leading-tight">
                    {source.title}
                  </span>
                  <span className="text-[11px] text-[var(--brand-source-time)]">
                    {source.platform}
                    {chunks.length > 0 &&
                      ` · ${chunks.length} chunk${chunks.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-[var(--brand-source-icon)] transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>

          {/* Attach-all button */}
          {onAddAttachment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleAll}
              className={cn(
                'mr-2 h-7 shrink-0 rounded-full px-3 text-xs font-medium gap-1.5 transition-colors',
                isAllAttached
                  ? 'text-brand-attached-text hover:bg-brand-attached-hover-bg'
                  : 'text-[var(--brand-source-icon)] hover:bg-[var(--brand-source-attach-bg)] hover:text-[var(--brand-link)]',
              )}
              title={isAllAttached ? 'Remove all chunks' : 'Attach all chunks'}
            >
              {isAllAttached ? (
                <Check className="h-3 w-3" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              {isAllAttached ? 'Attached' : 'Attach all'}
            </Button>
          )}
        </div>

        {/* ── Expanded body: Pages → Chunks ── */}
        <CollapsibleContent className="data-[state=closed]:animate-[collapse-up_0.2s_ease-in-out] data-[state=open]:animate-[collapse-down_0.2s_ease-in-out]">
          {groupedPages.length > 0 ? (
            <div className="flex flex-col gap-0 border-t border-[var(--brand-source-border)] pt-3">
              {groupedPages.map((page) => (
                <div key={page.page_number} className="flex flex-col">
                  {/* Page header */}
                  {page.page_number > 0 && (
                    <div className="flex items-center gap-2 bg-[var(--brand-citation-bg)]/60 mx-4 mb-1 rounded-md px-3 py-1.5">
                      <Badge className="rounded-full border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                        Page {page.page_number}
                      </Badge>
                      <span className="text-[10px] text-[var(--brand-source-time)]">
                        {page.chunks.length} chunk
                        {page.chunks.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Chunk list */}
                  {page.chunks.map((chunk, ci) => {
                    const attached = isChunkAttached(chunk.chunk_number);
                    return (
                      <div
                        key={chunk.chunk_number || ci}
                        className={cn(
                          'group/chunk relative flex gap-3 px-4 py-3 transition-colors',
                          ci < page.chunks.length - 1 &&
                            'border-b border-[var(--brand-source-border)]/50',
                          attached
                            ? 'bg-brand-attached-bg/40'
                            : 'hover:bg-[var(--brand-source-hover-bg)]',
                        )}
                      >
                        {/* Chunk number pill */}
                        <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold leading-none',
                              attached
                                ? 'bg-brand-attached-border/20 text-brand-attached-text'
                                : 'bg-[var(--brand-citation-bg)] text-[var(--brand-citation-text)]',
                            )}
                          >
                            #{chunk.chunk_number || ci + 1}
                          </span>
                        </div>

                        {/* Chunk text */}
                        <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--brand-content-text)] whitespace-pre-wrap [overflow-wrap:anywhere]">
                          {chunk.content ?? 'No content available.'}
                        </p>

                        {/* Per-chunk attach button */}
                        {onAddAttachment && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleToggleChunk(chunk)}
                            className={cn(
                              'mt-0.5 h-6 w-6 shrink-0 rounded-full opacity-0 transition-opacity group-hover/chunk:opacity-100',
                              attached
                                ? 'text-brand-attached-text hover:bg-brand-attached-hover-bg opacity-100'
                                : 'text-[var(--brand-source-icon)] hover:bg-[var(--brand-source-attach-bg)] hover:text-[var(--brand-link)]',
                            )}
                            title={
                              attached
                                ? 'Remove this chunk'
                                : 'Attach this chunk'
                            }
                          >
                            {attached ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            /* No chunks */
            <div className="border-t border-[var(--brand-source-border)] px-4 py-3">
              <p className="text-xs leading-relaxed text-[var(--brand-content-text)]">
                No content available.
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
