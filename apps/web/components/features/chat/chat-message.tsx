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
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { ChatMessageProps, Citation } from '@/types';
import Image from 'next/image';
import { ThinkingIndicator } from './thinking-indicator';

export function ChatMessage({
  role,
  content,
  citations: rawCitations = [],
  status,
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
                className="flex items-center gap-1 text-xs font-medium text-[#8a77eb] hover:text-[#7566d9] transition-colors"
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
                className="shadow-card-md rounded-bubble border-[#e6e0ff] bg-white/95 p-5 text-sm leading-relaxed text-[#3d366b]"
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
                          <div className="my-3 overflow-hidden rounded-md border border-[#e6e0ff]">
                            <div className="flex items-center justify-between bg-[#f8f7ff] px-4 py-1.5 text-[10px] font-medium text-[#8a77eb]">
                              <span>{match![1].toUpperCase()}</span>
                            </div>
                            <pre className="overflow-x-auto bg-[#fafaff] p-4 text-xs leading-relaxed text-[#3d366b]">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        ) : (
                          <code
                            className={cn(
                              'rounded bg-[#f0efff] px-1.5 py-0.5 text-xs font-semibold text-[#6b5ae0]',
                              className,
                            )}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="mb-3 border-l-4 border-[#dcd3ff] pl-4 italic text-[#7c73b7]">
                          {children}
                        </blockquote>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 font-medium text-[#6b5ae0] hover:underline"
                        >
                          {children}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ),
                      table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-lg border border-[#e6e0ff]">
                          <table className="w-full border-collapse text-left text-xs">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-[#f8f7ff] text-[#8a77eb]">
                          {children}
                        </thead>
                      ),
                      th: ({ children }) => (
                        <th className="border-b border-[#e6e0ff] px-4 py-2 font-semibold">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border-b border-[#f0edff] px-4 py-2 text-[#5a528f]">
                          {children}
                        </td>
                      ),
                      hr: () => (
                        <hr className="my-6 border-t border-[#e6e0ff]" />
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
                          className="my-4 max-w-full rounded-lg border border-[#e6e0ff] shadow-sm"
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
                      <Badge className="rounded-pill border border-[#dcd3ff] bg-[#f3f1ff] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b5ae0]">
                        Citations
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2">
                      {citations.map((citation, index) => (
                        <div
                          key={citation.id}
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
                          <SourceCard source={citation} />
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

function SourceCard({ source }: { source: Citation }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card
      className={cn(
        'rounded-card overflow-hidden border-[#e8e2ff] bg-white/95 shadow-[0_20px_60px_-48px_rgba(102,88,204,1)] transition-colors duration-200',
        !isOpen && 'hover:bg-[#f4f2ff]',
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="group rounded-card flex w-full items-center justify-between bg-transparent hover:bg-transparent px-4 py-3 text-[#3f386e] transition-colors duration-200 "
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-[#8175d4]" />
              <div className="flex flex-col items-start">
                <span className="text-primary-medium text-sm font-medium">
                  {source.title}
                </span>
                <span className="text-xs text-[#aba3e3]">
                  {source.platform}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-[#8175d4] transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>

        {source.content && (
          <CollapsibleContent className="data-[state=closed]:animate-[collapse-up_0.2s_ease-in-out] data-[state=open]:animate-[collapse-down_0.2s_ease-in-out]">
            <div className="px-4 py-3">
              <div className="markdown-content text-sm leading-relaxed text-[#7c73b7]">
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
                        className="text-[#6b5ae0] hover:underline"
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="my-3 overflow-x-auto rounded-md border border-[#e6e0ff]">
                        <table className="w-full border-collapse text-left text-xs">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-[#f8f7ff] text-[#8a77eb]">
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => (
                      <th className="border-b border-[#e6e0ff] px-3 py-1.5 font-semibold">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border-b border-[#f0edff] px-3 py-1.5 text-[#5a528f]">
                        {children}
                      </td>
                    ),
                    hr: () => <hr className="my-4 border-t border-[#e6e0ff]" />,
                    img: ({ src, alt }: React.ComponentPropsWithoutRef<'img'>) => (
                      <Image
                        src={src as string || ''}
                        alt={alt || ''}
                        width={500}
                        height={300}
                        className="my-3 max-w-full rounded-md border border-[#e6e0ff]"
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
