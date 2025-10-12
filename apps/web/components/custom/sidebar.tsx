'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, FileText, Sparkles, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHistoryItem {
  id: string;
  title: string;
  timestamp: string;
}

interface SidebarProps {
  chatHistory?: ChatHistoryItem[];
  currentChatId?: string;
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
}

export function Sidebar({
  chatHistory = [],
  currentChatId,
  onChatSelect,
  onNewChat,
}: SidebarProps) {
  const defaultHistory: ChatHistoryItem[] =
    chatHistory.length > 0
      ? chatHistory
      : [
          {
            id: '1',
            title: 'Product Roadmap Discuss...',
            timestamp: '2 seconds ago',
          },
          {
            id: '2',
            title: 'Market Research Insights',
            timestamp: '13 hours ago',
          },
          {
            id: '3',
            title: 'Competitive Analysis Report',
            timestamp: '2 days ago',
          },
        ];

  return (
    <div className="border-purple-lighter bg-gradient-sidebar flex h-screen w-[260px] flex-col border-r">
      {/* Logo/Brand */}
      <div className="flex items-center gap-3 px-6 pb-4 pt-6">
        <div className="bg-gradient-purple rounded-card flex h-10 w-10 items-center justify-center shadow-sm">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.2em] text-[#8c7ee1]">
            AIQ
          </span>
          <span className="text-primary-dark font-kiona text-lg font-semibold">
            XHIVE
          </span>
        </div>
      </div>

      <Separator className="border-purple-lighter" />

      {/* Navigation */}
      <div className="flex flex-col gap-2 px-6 py-5 text-sm">
        <Button
          variant="outline"
          className="text-primary-light rounded-card justify-start gap-2 border-transparent bg-[#efe9ff] shadow-none transition-colors hover:bg-[#e5dfff]"
          onClick={onNewChat}
        >
          <MessageSquare className="h-4 w-4" />
          New Chat
        </Button>

        <Button
          variant="ghost"
          className="text-accent-purple rounded-card justify-start gap-2 hover:bg-white/60"
        >
          <FileText className="h-4 w-4" />
          Source
        </Button>

        <Button
          variant="ghost"
          className="text-accent-purple rounded-card justify-start gap-2 hover:bg-white/60"
        >
          <Sparkles className="h-4 w-4" />
          Prompt Library
        </Button>
      </div>

      <Separator className="border-purple-lighter" />

      {/* Chat History */}
      <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#9a92d8]">
          Chat History
        </p>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2">
            {defaultHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onChatSelect?.(chat.id)}
                className={cn(
                  'rounded-card group relative flex flex-col items-start gap-1 border border-transparent px-4 py-3 text-left text-sm transition-all hover:border-[#dcd3ff] hover:bg-white/70',
                  currentChatId === chat.id &&
                    'shadow-elevated border-[#d4c9ff] bg-white',
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-primary-medium max-w-[140px] truncate font-medium">
                    {chat.title}
                  </span>
                  <MoreVertical className="h-4 w-4 text-[#b1a8e9] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <span className="text-xs text-[#a19ad9]">{chat.timestamp}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* User Profile */}
      <div className="border-purple-lighter flex-shrink-0 border-t px-6 py-5">
        <div className="shadow-profile rounded-card flex items-center gap-3 bg-white/70 p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-gradient-to-br from-[#9b88ff] to-[#6f5deb] text-white">
              XF
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#363161]">
              XunFlowerrr
            </span>
            <span className="text-xs text-[#a19ad9]">Tanit.Yad@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
