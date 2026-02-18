import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import React from 'react';
import { ChatHeaderProps } from '@/types';
import SplitText from '@/components/SplitText';

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onViewSources, title }) => (
  <div className="relative z-10 flex items-center justify-between px-6 pb-3 pt-4 sm:px-10 lg:px-12">
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="border-purple-light text-primary-light shadow-button hover:bg-surface-light rounded-pill border bg-white h-9 w-9 sm:h-10 sm:w-10" />
        <SplitText
          tag="h1"
          splitType="words"
          text={title || 'AI Assistant'}
          className="text-primary-dark text-2xl font-semibold"
          textAlign="left"
          delay={30}
          duration={0.8}
          from={{ opacity: 0, y: 20 }}
          to={{ opacity: 1, y: 0 }}
        />
      </div>
    </div>
    <Button
      variant="outline"
      size="sm"
      className="border-purple-light text-primary-light shadow-button hover:bg-surface-light rounded-pill relative gap-2 bg-white px-5 py-2"
      onClick={onViewSources}
    >
      <BookOpen className="h-4 w-4" />
      View sources
    </Button>
  </div>
);
