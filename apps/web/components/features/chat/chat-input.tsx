'use client';

import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from '@/components/ui/input-group';
import { Paperclip, Globe, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage?.(message);
      setMessage('');
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
      <div className="flex items-center gap-3 border-purple-light rounded-[32px] bg-white/95 shadow-[0_24px_70px_-38px_rgba(102,88,204,1)] p-4">
        {/* Left part - contains textarea (upper) and tools (lower) */}
        <div className="flex flex-1 flex-col gap-3">
          {/* Upper part - textarea */}
          <textarea
            placeholder="Ask anything..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={3}
            className="w-full resize-none border-0 bg-transparent px-2 text-sm text-primary-dark placeholder:text-muted-purple focus:outline-none focus:ring-0"
          />

          {/* Lower part - tools icons */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-pill h-9 w-9 text-[#8175d4] hover:bg-[#f1eeff]"
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
                    className="rounded-pill h-9 w-9 text-[#8175d4] hover:bg-[#f1eeff]"
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
            className="animate-mesh-gradient rounded-pill h-12 w-12 text-white shadow-[0_20px_50px_-28px_rgba(111,93,235,1)] transition-transform hover:scale-105"
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
