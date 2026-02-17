'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BlurText from '@/components/BlurText';

interface ThinkingIndicatorProps {
  status?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  status,
}) => {
  console.log('ThinkingIndicator Status Prop:', status);
  const [messageIndex, setMessageIndex] = React.useState(0);
  const [history, setHistory] = React.useState<string[]>([]);
  const lastStatusRef = React.useRef<string | undefined>(undefined);

  const defaultMessages = [
    'AINGO is thinking...',
    'Searching through relevant documents...',
    'Analyzing context...',
    'Synthesizing information...',
    'Drafting a comprehensive response...',
  ];

  const isDefaultStatus = !status || status === 'initializing';

  React.useEffect(() => {
    if (isDefaultStatus) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % defaultMessages.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isDefaultStatus, defaultMessages.length]);

  React.useEffect(() => {
    if (status && !isDefaultStatus && status !== lastStatusRef.current) {
      setHistory((prev) => {
        // Only add if it's different from the last one in history
        if (prev[0] === status) return prev;
        return [status, ...prev].slice(0, 3);
      });
      lastStatusRef.current = status;
    }
  }, [status, isDefaultStatus]);

  const currentDisplayName = isDefaultStatus ? defaultMessages[messageIndex] : status;

  return (
    <div className="flex flex-col gap-2 transition-all duration-500 ease-in-out">
      <div className="flex items-center gap-3 h-8">
        <div className="flex gap-1.5 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7C68FF] animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#B19EEF] animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF9FFC] animate-bounce" />
        </div>
        <BlurText
          key={currentDisplayName}
          text={currentDisplayName}
          delay={30}
          animateBy="words"
          className="m-0 select-none loading-gradient-text text-sm font-bold"
          animateInView={false}
          enableGradientFix={true}
          animationFrom={{ filter: 'blur(4px)', opacity: 0, scale: 0.95 }}
          animationTo={[
            { filter: 'blur(2px)', opacity: 0.5, scale: 1.02 },
            { filter: 'blur(0px)', opacity: 1, scale: 1 },
          ]}
        />
      </div>

      {history.length > 1 && (
        <div className="flex flex-col gap-1 ml-9 overflow-hidden">
          {history.slice(1).map((item, i) => (
            <div
              key={`${item}-${i}`}
              className="text-[10px] text-muted-foreground/60 font-medium animate-in fade-in slide-in-from-left-2 duration-500"
            >
              <span className="opacity-50 mr-2">✓</span>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
