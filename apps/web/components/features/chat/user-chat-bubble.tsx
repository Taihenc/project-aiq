'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { FileRef } from '@/types/api';
import { SentAttachmentsPillRow } from './sent-citation-pill';

export function UserChatBubble({
  content,
  sentAttachments,
}: {
  content: unknown;
  sentAttachments?: FileRef[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLong, setIsLong] = useState(false);
  const [height, setHeight] = useState<number>(0);
  const msgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgRef.current) {
      const scrollHeight = msgRef.current.scrollHeight;
      if (scrollHeight > 350) {
        setIsLong(true);
        setHeight(isExpanded ? scrollHeight : 350);
      } else {
        setIsLong(false);
        setHeight(scrollHeight);
      }
    }
  }, [content, isExpanded]);

  return (
    <div className="flex max-w-[80%] flex-col items-end gap-3">
      <div className="relative flex max-w-sm flex-col items-end gap-2">
        <div
          ref={msgRef}
          className="relative overflow-hidden bg-gradient-purple-message shadow-message rounded-bubble rounded-tr-sm px-5 py-3 text-sm font-medium text-white transition-all duration-300 ease-in-out"
          style={{ height: isLong ? `${height}px` : 'auto' }}
        >
          <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
            {typeof content === 'string' ? content : JSON.stringify(content)}
          </p>
          {isLong && !isExpanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#7566d9] via-[#8a77eb]/60 to-transparent" />
          )}
        </div>

        {isLong && (
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--brand-action-menu-hover)] hover:text-[var(--brand-fg-light)] transition-colors"
          >
            {isExpanded ? (
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

      {sentAttachments && sentAttachments.length > 0 && (
        <SentAttachmentsPillRow attachments={sentAttachments} />
      )}
    </div>
  );
}
