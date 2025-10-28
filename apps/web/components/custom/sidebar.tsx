'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import { MessageSquare, FileText, Sparkles, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SidebarProps, ChatHistoryItem } from '@/types';

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
    <SidebarPrimitive
      collapsible="offcanvas"
      className="border-purple-lighter bg-[#fcfcfc] border-r"
    >
      <SidebarHeader className="gap-0 px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
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
      </SidebarHeader>

      <SidebarContent className="gap-6 px-4 py-6 text-sm">
        <SidebarGroup className="gap-3">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Start a new chat"
                  onClick={onNewChat}
                  className="text-primary-light rounded-card flex h-12 w-full items-center justify-start gap-2 border border-transparent bg-[#efe9ff] px-4 py-3 shadow-none transition-colors hover:bg-[#e5dfff]"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Browse sources"
                  className="text-accent-purple rounded-card flex h-12 w-full items-center justify-start gap-2 px-4 py-3 hover:bg-white/60"
                >
                  <FileText className="h-4 w-4" />
                  <span>Source</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Open prompt library"
                  className="text-accent-purple rounded-card flex h-12 w-full items-center justify-start gap-2 px-4 py-3 hover:bg-white/60"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Prompt Library</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="gap-3">
          <SidebarGroupLabel className="text-[#9a92d8]">
            Chat History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {defaultHistory.map((chat) => {
                const isActive = currentChatId === chat.id;
                return (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      tooltip={chat.title}
                      isActive={isActive}
                      onClick={() => onChatSelect?.(chat.id)}
                      className={cn(
                        'rounded-card relative flex h-12 w-full items-center justify-start gap-3 border border-transparent px-4 py-3 text-left text-sm transition-all hover:border-[#dcd3ff] hover:bg-white/70',
                        isActive &&
                          'shadow-elevated border-[#d4c9ff] bg-white text-primary-medium',
                      )}
                    >
                      <MessageSquare className="h-4 w-4 text-[#8175d4]" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-primary-medium truncate font-medium">
                          {chat.title}
                        </span>
                        <span className="text-xs text-[#a19ad9]">
                          {chat.timestamp}
                        </span>
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      className="text-[#b1a8e9] hover:text-[#8a77eb]"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-6 pb-6">
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
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
