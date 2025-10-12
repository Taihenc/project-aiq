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
      <InputGroup className="border-purple-light rounded-pill h-auto bg-white/95 px-2 py-1 shadow-[0_24px_70px_-38px_rgba(102,88,204,1)]">
        <InputGroupInput
          placeholder="Ask anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="text-primary-dark placeholder:text-muted-purple rounded-pill min-h-[56px] px-4 text-sm"
        />

        <InputGroupAddon align="inline-start" className="gap-3 pl-4">
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
        </InputGroupAddon>

        <InputGroupAddon align="inline-end" className="pr-4">
          <Button
            size="icon-sm"
            className="animate-mesh-gradient rounded-pill h-10 w-10 text-white shadow-[0_20px_50px_-28px_rgba(111,93,235,1)] transition-transform hover:scale-105"
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </InputGroupAddon>
      </InputGroup>

      <p className="text-muted-purple text-center text-xs">
        Press Enter to send, Shift + Enter for newline
      </p>
    </div>
  );
}
