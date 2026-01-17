'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BlurText from '@/components/BlurText';

export const ThinkingIndicator: React.FC = () => {
  const [messageIndex, setMessageIndex] = React.useState(0);

  const messages = [
    'AINGO is thinking...',
    'Searching through files...',
    'Generating response...',
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const currentMessage = messages[messageIndex];

  return (
    <div className="flex gap-4">
      <Avatar className="h-8 w-8">
        <AvatarImage
          src="/images/backgrounds/ai-profile.png"
          alt="AI Assistant"
        />
        <AvatarFallback className="bg-gradient-to-br from-[#a18fff] to-[#6f5deb] text-xs font-semibold uppercase text-white">
          AI
        </AvatarFallback>
      </Avatar>

      <div className="flex items-center gap-3 self-start transition-all duration-500 ease-in-out pt-1.5">
        <div className="flex gap-1.5 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7C68FF] animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#B19EEF] animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF9FFC] animate-bounce" />
        </div>
        <BlurText
          key={currentMessage}
          text={currentMessage}
          delay={50}
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
    </div>
  );
};
