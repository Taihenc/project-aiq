'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Source {
  id: string;
  title: string;
  platform: string;
  content?: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp?: string;
}

export function ChatMessage({ role, content, sources = [] }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-4', isUser && 'justify-end')}>
      {!isUser && (
        <Avatar className="h-9 w-9">
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
          <div className="bg-gradient-purple-message shadow-message rounded-bubble max-w-sm rounded-tr-sm px-5 py-3 text-sm font-medium text-white">
            <p>{content}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Card className="shadow-card-md rounded-bubble border-[#e6e0ff] bg-white/95 p-5 text-sm leading-relaxed text-[#3d366b]">
              {content}
            </Card>

            {sources.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-pill border border-[#dcd3ff] bg-[#f3f1ff] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b5ae0]">
                    Sources
                  </Badge>
                </div>

                <div className="flex flex-col gap-2">
                  {sources.map((source) => (
                    <SourceCard key={source.id} source={source} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gray-200">U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="rounded-card overflow-hidden border-[#e8e2ff] bg-white/95 shadow-[0_20px_60px_-48px_rgba(102,88,204,1)]">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="rounded-card flex w-full items-center justify-between bg-transparent px-4 py-3 text-[#3f386e] hover:bg-[#f4f2ff]"
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
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-[#8175d4]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#8175d4]" />
            )}
          </Button>
        </CollapsibleTrigger>

        {source.content && (
          <CollapsibleContent>
            <div className="border-t border-[#eee9ff] px-4 py-3">
              <p className="text-sm leading-relaxed text-[#7c73b7]">
                {source.content}
              </p>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}
