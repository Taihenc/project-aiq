'use client';

import { Button } from '@/components/ui/button';
import { Paperclip, Globe, ArrowUp } from 'lucide-react';
import { useState, useRef } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ChatInputProps } from '@/types';
import { AttachmentPill } from './attachment-pill';

export function ChatInput({
  onSendMessage,
  disabled = false,
  attachments = [],
  onRemoveAttachment,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isExpanded = isFocused || message.length > 0 || attachments.length > 0;

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage?.(message);
      setMessage('');
      textAreaRef.current?.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'flex items-center gap-3 border-purple-light rounded-[32px] bg-background/95 dark:bg-card shadow-[0_24px_70px_-38px_rgba(102,88,204,1)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] transition-all duration-300 ease-[cubic-bezier(0.68,0.02,0.21,1.67)]',
          isExpanded ? 'p-4' : 'p-3',
        )}
      >
        {/* Left part - contains attachments, textarea (upper) and tools (lower) */}
        <div className="flex flex-1 flex-col gap-3">
          {/* Attachment badges */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-2">
              {attachments.map((att, index) => (
                <AttachmentPill
                  key={att.file_path || `att-${index}`}
                  att={att}
                  index={index}
                  onRemove={onRemoveAttachment}
                />
              ))}
            </div>
          )}
          {/* Upper part - textarea */}
          <textarea
            ref={textAreaRef}
            placeholder="Ask anything..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            style={{
              height: isExpanded ? '72px' : '24px',
            }}
            className={cn(
              'w-full resize-none border-0 bg-transparent px-2 text-sm text-primary-dark placeholder:text-muted-purple focus:outline-none focus:ring-0 transition-all duration-300 ease-in-out',
              !isExpanded && 'overflow-hidden',
            )}
          />

          {/* Lower part - tools icons */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-pill h-9 w-9 text-[var(--brand-source-icon)] hover:bg-[var(--brand-new-chat-bg)]"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-pill h-9 w-9 text-[var(--brand-source-icon)] hover:bg-[var(--brand-new-chat-bg)]"
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add source</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Right part - send button */}
        <div className="flex items-center">
          <Button
            size="icon-sm"
            className={cn(
              'animate-mesh-gradient rounded-pill text-white shadow-[0_20px_50px_-28px_rgba(111,93,235,1)] transition-all duration-300 ease-in-out hover:scale-105',
              isExpanded ? 'h-12 w-12' : 'h-10 w-10',
            )}
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
          >
            <ArrowUp className="size-5" />
          </Button>
        </div>
      </div>

      <p className="text-muted-purple text-center text-xs">
        Press Enter to send, Shift + Enter for newline
      </p>
    </div>
  );
}
