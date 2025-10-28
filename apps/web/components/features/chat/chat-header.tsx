import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import React from 'react';
import type { ChatHeaderProps } from '@/types';

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onViewSources }) => (
  <div className="relative z-10 flex items-center justify-between px-6 pb-3 pt-4 sm:px-10 lg:px-12">
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="border-purple-light text-primary-light shadow-button hover:bg-surface-light rounded-pill border bg-white h-9 w-9 sm:h-10 sm:w-10" />
        <h1 className="text-primary-dark text-2xl font-semibold">
          AI Assistant
        </h1>
        <Badge className="border-purple-light bg-card-purple text-primary-light rounded-pill gap-2 border px-4 py-1 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-[#4ade80]" /> 2 Sources
          Active
        </Badge>
      </div>
      <p className="text-secondary text-sm">
        Ask anything with your personal knowledge manager
      </p>
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
