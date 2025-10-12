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
      <InputGroup className="h-auto rounded-full border-[#e2dcff] bg-white/95 px-2 py-1 shadow-[0_24px_70px_-38px_rgba(102,88,204,1)]">
        <InputGroupInput
          placeholder="Ask anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="min-h-[56px] rounded-full px-4 text-sm text-[#322b63] placeholder:text-[#b4aceb]"
        />

        <InputGroupAddon align="inline-start" className="gap-3 pl-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-9 w-9 rounded-full text-[#8175d4] hover:bg-[#f1eeff]"
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
                  className="h-9 w-9 rounded-full text-[#8175d4] hover:bg-[#f1eeff]"
                >
                  <Globe className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add source</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </InputGroupAddon>

        <InputGroupAddon align="inline-end" className="pr-4">
          <Button
            size="icon-sm"
            className="h-10 w-10 rounded-full bg-gradient-to-br from-[#9b88ff] to-[#6f5deb] text-white shadow-[0_20px_50px_-28px_rgba(111,93,235,1)] hover:from-[#8b77ff] hover:to-[#5f4fde]"
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </InputGroupAddon>
      </InputGroup>

      <p className="text-center text-xs text-[#b3abeb]">
        Press Enter to send, Shift + Enter for newline
      </p>
    </div>
  );
}
