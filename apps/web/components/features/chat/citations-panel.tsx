'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Copy, ExternalLink, FileText } from 'lucide-react';
import type { CitationsPanelProps, Citation } from '@/types';

export function CitationsPanel({
  open,
  onOpenChange,
  citations = [],
}: CitationsPanelProps) {
  // Only show actual citations, no default fallback
  const displayCitations: Citation[] = citations;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] border-l border-brand-border-soft bg-background dark:bg-[var(--brand-surface-purple)] p-6 sm:w-[560px]">
        <SheetHeader className="px-0">
          <SheetTitle className="text-primary-dark font-kiona">
            Sources & Citations
          </SheetTitle>
          <SheetDescription>
            <Badge className="bg-card-purple text-primary-light rounded-pill border-purple-light mt-2 border px-3 py-1 text-xs font-medium">
              {displayCitations.length} references found
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-fg-muted)]" />
            <Input
              placeholder="Search citation..."
              className="rounded-card border-brand-border-lighter bg-brand-surface-light pl-11 text-sm text-[var(--brand-code-text)] placeholder:text-[var(--brand-fg-muted)]"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-light text-primary-light rounded-pill gap-2 bg-background hover:bg-brand-source-hover-bg"
            >
              <FileText className="h-4 w-4" />
              All Sources
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-pill text-[var(--brand-blockquote-text)] hover:bg-brand-source-hover-bg"
            >
              Sort
            </Button>
          </div>

          <Separator className="border-purple-soft" />

          {/* Citations List */}
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="flex flex-col gap-4 pr-4">
              {displayCitations.length > 0 ? (
                displayCitations.map((citation) => (
                  <Card
                    key={citation.id}
                    className="shadow-card-lg rounded-card border-brand-border-soft bg-card dark:bg-[var(--brand-card-purple)] p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[var(--brand-source-icon)]" />
                          <h4 className="text-primary-medium text-sm font-semibold">
                            {citation.title}
                          </h4>
                        </div>
                        <p className="text-muted-purple mt-1 text-xs font-medium uppercase tracking-widest">
                          {citation.platform}
                        </p>
                      </div>
                    </div>

                    <Separator className="border-purple-soft my-4" />

                    <p className="text-sm leading-relaxed text-[var(--brand-content-text)]">
                      {citation.content || 'No content available'}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-light rounded-pill h-9 gap-2 hover:bg-brand-source-hover-bg"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-light rounded-pill h-9 gap-2 hover:bg-brand-source-hover-bg"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-brand-icon-purple-bg p-4 mb-4">
                    <FileText className="h-8 w-8 text-[var(--brand-source-icon)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--brand-code-text)] mb-2">
                    No Sources Available
                  </h3>
                  <p className="text-sm text-[var(--brand-content-text)] max-w-sm">
                    This conversation doesn&apos;t have any sources to display
                    yet.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
