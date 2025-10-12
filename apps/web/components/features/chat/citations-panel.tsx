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

interface Citation {
  id: string;
  title: string;
  platform: string;
  content: string;
}

interface CitationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citations?: Citation[];
}

export function CitationsPanel({
  open,
  onOpenChange,
  citations = [],
}: CitationsPanelProps) {
  const defaultCitations: Citation[] =
    citations.length > 0
      ? citations
      : [
          {
            id: '1',
            title: 'Q4 Financial Report 2024',
            platform: 'SharePoint',
            content:
              'Revenue increased by 23% compared to Q3, driven primarily by our new product launches and expanded market presence.',
          },
          {
            id: '2',
            title: 'Market Analysis - Tech Sector',
            platform: 'OneNote',
            content:
              'The technology sector showed remarkable resilience with consistent growth patterns across all major segments.',
          },
        ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] border-l border-[#e4dfff] bg-white/96 sm:w-[560px]">
        <SheetHeader>
          <SheetTitle className="text-primary-dark font-kiona">
            Sources & Citations
          </SheetTitle>
          <SheetDescription>
            <Badge className="bg-card-purple text-primary-light rounded-pill border-purple-light mt-2 border px-3 py-1 text-xs font-medium">
              {defaultCitations.length} references found
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b0a7e7]" />
            <Input
              placeholder="Search citation..."
              className="rounded-card border-[#e5e0ff] bg-[#f9f8ff] pl-11 text-sm text-[#3d366b] placeholder:text-[#b7afea]"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-light text-primary-light rounded-pill gap-2 bg-white hover:bg-[#f4f2ff]"
            >
              <FileText className="h-4 w-4" />
              All Sources
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-pill text-[#7c72c9] hover:bg-[#f4f2ff]"
            >
              Sort
            </Button>
          </div>

          <Separator className="border-purple-soft" />

          {/* Citations List */}
          <ScrollArea className="h-[calc(100vh-320px)] pr-3">
            <div className="flex flex-col gap-4">
              {defaultCitations.map((citation) => (
                <Card
                  key={citation.id}
                  className="shadow-card-lg rounded-card border-[#e5dffb] bg-white/95 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#7e74d4]" />
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

                  <p className="text-sm leading-relaxed text-[#7c73b7]">
                    {citation.content}
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary-light rounded-pill h-9 gap-2 hover:bg-[#f4f2ff]"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary-light rounded-pill h-9 gap-2 hover:bg-[#f4f2ff]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
