'use client';

import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

export function MarkdownContent({
  content,
  cardRef,
}: {
  content: string;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
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
              <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="pl-1">{children}</li>,
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
            img: ({ src, alt }: React.ComponentPropsWithoutRef<'img'>) => (
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
          {content}
        </ReactMarkdown>
      </div>
    </Card>
  );
}
