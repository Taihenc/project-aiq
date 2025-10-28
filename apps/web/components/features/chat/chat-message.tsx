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
import { cn } from '@/lib/utils';
import type { ChatMessageProps, Citation } from '@/types';

export function ChatMessage({
  role,
  content,
  citations = [],
}: ChatMessageProps) {
  const isUser = role === 'user';
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSingleLine, setIsSingleLine] = useState(false);
  const [isUserMessageExpanded, setIsUserMessageExpanded] = useState(false);
  const userMsgRef = useRef<HTMLDivElement>(null);
  const [isLongUserMessage, setIsLongUserMessage] = useState(false);
  const [userMsgHeight, setUserMsgHeight] = useState<number>(0);

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
    if (!isUser && cardRef.current && citations.length === 0) {
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
  }, [content, isUser, citations.length]);

  return (
    <div
      className={cn(
        'flex gap-4',
        isUser && 'justify-end',
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
                {content}
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
            <Card
              ref={cardRef}
              className="shadow-card-md rounded-bubble border-[#e6e0ff] bg-white/95 p-5 text-sm leading-relaxed text-[#3d366b]"
            >
              <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
                {content}
              </p>
            </Card>

            {citations.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-pill border border-[#dcd3ff] bg-[#f3f1ff] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#6b5ae0]">
                    Citations
                  </Badge>
                </div>

                <div className="flex flex-col gap-2">
                  {citations.map((citation) => (
                    <SourceCard key={citation.id} source={citation} />
                  ))}
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
            <div className=" px-4 py-3">
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
