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
    <div className="flex h-screen w-[260px] flex-col border-r border-[#e3defc] bg-gradient-to-b from-[#ede7ff] via-[#f6f3ff] to-white">
      {/* Logo/Brand */}
      <div className="flex items-center gap-3 px-6 pb-4 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a586ff] to-[#7c68ff] shadow-sm">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.2em] text-[#8c7ee1]">
            AIQ
          </span>
          <span className="font-kiona text-lg font-semibold text-[#342e5c]">
            XHIVE
          </span>
        </div>
      </div>

      <Separator className="border-[#e5e1fb]" />

      {/* Navigation */}
      <div className="flex flex-col gap-2 px-6 py-5 text-sm">
        <Button
          variant="outline"
          className="justify-start gap-2 rounded-2xl border-transparent bg-[#efe9ff] text-[#5d4bd1] shadow-none transition-colors hover:bg-[#e5dfff]"
          onClick={onNewChat}
        >
          <MessageSquare className="h-4 w-4" />
          New Chat
        </Button>

        <Button
          variant="ghost"
          className="justify-start gap-2 rounded-2xl text-[#6658cc] hover:bg-white/60"
        >
          <FileText className="h-4 w-4" />
          Source
        </Button>

        <Button
          variant="ghost"
          className="justify-start gap-2 rounded-2xl text-[#6658cc] hover:bg-white/60"
        >
          <Sparkles className="h-4 w-4" />
          Prompt Library
        </Button>
      </div>

      <Separator className="border-[#e5e1fb]" />

      {/* Chat History */}
      <div className="flex-1 px-6 py-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#9a92d8]">
          Chat History
        </p>
        <ScrollArea className="h-[calc(100vh-360px)]">
          <div className="flex flex-col gap-2">
            {defaultHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onChatSelect?.(chat.id)}
                className={cn(
                  'group relative flex flex-col items-start gap-1 rounded-2xl border border-transparent px-4 py-3 text-left text-sm transition-all hover:border-[#dcd3ff] hover:bg-white/70',
                  currentChatId === chat.id &&
                    'border-[#d4c9ff] bg-white shadow-[0_12px_30px_-22px_rgba(102,88,204,0.65)]',
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="max-w-[140px] truncate font-medium text-[#3b3568]">
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
      <div className="border-t border-[#e5e1fb] px-6 py-5">
        <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3 shadow-[0_14px_40px_-28px_rgba(102,88,204,0.9)]">
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
