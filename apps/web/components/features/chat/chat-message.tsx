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
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { ChatMessageProps, Citation, FileRef } from '@/types';
import Image from 'next/image';
import { ThinkingIndicator } from './thinking-indicator';

export function ChatMessage({
  role,
  content,
  citations: rawCitations = [],
  status,
  onAddAttachment,
  onRemoveAttachment,
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

  const isThinking = role === 'assistant' && !content;

  // Delay citations appearance to avoid layout jitter
  useEffect(() => {
    if (citations.length > 0 && content) {
      const timer = setTimeout(() => setShowCitations(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowCitations(false);
    }
  }, [citations.length, content]);

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
              <ThinkingIndicator status={status} />
            ) : (
              <Card
                ref={cardRef}
                className="shadow-card-md rounded-bubble border-[var(--brand-code-border)] bg-card/95 p-5 text-sm leading-relaxed text-[var(--brand-code-text)]"
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

function SourceCard({
  source,
  onAddAttachment,
  onRemoveAttachment,
  attachments = [],
}: {
  source: Citation;
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  attachments?: FileRef[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isAttached = attachments.some(
    (a) => a.chunks[0]?.chunk_id === source.id,
  );

  const handleToggleAttach = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isAttached) {
      if (!onRemoveAttachment) return;
      const index = attachments.findIndex(
        (a) => a.chunks[0]?.chunk_id === source.id,
      );
      if (index !== -1) {
        onRemoveAttachment(index);
      }
      return;
    }

    if (!onAddAttachment) return;

    // Parse "file_path (Page N)" from title back to FileRef
    const pageMatch = source.title.match(/^(.+?)\s*\(Page\s+(\d+|\?)\)$/);
    const filePath = pageMatch ? pageMatch[1].trim() : source.title;
    const pageNumber =
      pageMatch && pageMatch[2] !== '?' ? parseInt(pageMatch[2], 10) : 1;

    onAddAttachment({
      file_path: filePath,
      chunks: [
        {
          chunk_id: source.id,
          page_number: pageNumber,
        },
      ],
      content: source.content,
    });
  };

  return (
    <Card
      className={cn(
        'rounded-card overflow-hidden transition-colors duration-200',
        isAttached
          ? 'border-[#c3e6cb] bg-[#f0faf3] shadow-[0_20px_60px_-48px_rgba(72,187,120,0.4)]'
          : 'border-[var(--brand-source-border)] bg-card/95 shadow-[0_20px_60px_-48px_rgba(102,88,204,0.6)]',
        !isOpen && !isAttached && 'hover:bg-[var(--brand-source-hover-bg)]',
        !isOpen && isAttached && 'hover:bg-[#e6f7ec]',
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="group rounded-card flex flex-1 items-center justify-between bg-transparent hover:bg-transparent px-4 py-3 text-[var(--brand-source-text)] transition-colors duration-200 "
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-[var(--brand-source-icon)]" />
                <div className="flex flex-col items-start">
                  <span className="text-primary-medium text-sm font-medium">
                    {source.title}
                  </span>
                  <span className="text-xs text-[var(--brand-source-time)]">
                    {source.platform}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-[var(--brand-source-icon)] transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          {onAddAttachment && (
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                'mr-2 h-7 w-7 shrink-0 rounded-full',
                isAttached
                  ? 'text-[#48bb78] hover:bg-[#e6f7ec] hover:text-[#38a169]'
                  : 'text-[var(--brand-source-icon)] hover:bg-[var(--brand-source-attach-bg)] hover:text-[var(--brand-link)]',
              )}
              onClick={handleToggleAttach}
              title={isAttached ? 'Remove attachment' : 'Add as attachment'}
            >
              {isAttached ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>

        {source.content && (
          <CollapsibleContent className="data-[state=closed]:animate-[collapse-up_0.2s_ease-in-out] data-[state=open]:animate-[collapse-down_0.2s_ease-in-out]">
            <div className="px-4 py-3">
              <div className="markdown-content text-sm leading-relaxed text-[var(--brand-content-text)]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--brand-link)] hover:underline"
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="my-3 overflow-x-auto rounded-md border border-[var(--brand-code-border)]">
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
                      <th className="border-b border-[var(--brand-code-border)] px-3 py-1.5 font-semibold">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border-b border-[var(--brand-table-row-border)] px-3 py-1.5 text-[var(--brand-table-row-text)]">
                        {children}
                      </td>
                    ),
                    hr: () => (
                      <hr className="my-4 border-t border-[var(--brand-code-border)]" />
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
                        className="my-3 max-w-full rounded-md border border-[var(--brand-code-border)]"
                      />
                    ),
                  }}
                >
                  {source.content}
                </ReactMarkdown>
              </div>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}
