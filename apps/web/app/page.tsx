'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { ChatHeader } from '@/components/features/chat/chat-header';
import { ChatWelcome } from '@/components/features/chat/chat-welcome';
import { ChatMessagesArea } from '@/components/features/chat/chat-messages-area';
import { ChatInputArea } from '@/components/features/chat/chat-input-area';
import { CitationsPanel } from '@/components/features/chat/citations-panel';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { extractCitations } from '@/lib/utils/citations';
import { DEMO_MESSAGES } from '@/constants/demo-data';

export default function Home() {
  // Check if demo mode is enabled from environment variable
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // Chat messages state and logic
  const { messages, isLoading, sendMessage, clearMessages } = useChatMessages({
    isDemoMode,
    initialMessages: isDemoMode ? DEMO_MESSAGES : [],
  });

  // UI state
  const [citationsPanelOpen, setCitationsPanelOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState('1');

  // Auto-scroll to bottom when messages change
  const messagesEndRef = useAutoScroll(messages);

  const showWelcomeScreen = messages.length === 0;

  return (
    <SidebarProvider className="bg-surface-purple">
      {/* Sidebar */}
      <Sidebar
        currentChatId={currentChatId}
        onChatSelect={setCurrentChatId}
        onNewChat={clearMessages}
      />

      {/* Main Chat Area */}
      <SidebarInset className="relative flex h-screen flex-1 flex-col overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,104,255,0.08)_0%,transparent_55%)]" />

        {/* Header */}
        <ChatHeader onViewSources={() => setCitationsPanelOpen(true)} />

        {/* Messages Area / Welcome Screen */}
        <div className="relative z-0 flex flex-1 min-h-0 flex-col px-6 pt-2 sm:px-10 lg:px-12">
          {showWelcomeScreen ? (
            <ChatWelcome
              onSendMessage={sendMessage}
              isLoading={isLoading}
            />
          ) : (
            <ChatMessagesArea
              messages={messages}
              messagesEndRef={messagesEndRef}
            />
          )}
          {/* Fade overlay above input - only show when not on welcome screen */}
          {!showWelcomeScreen && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white/70 via-white/40 to-transparent" />
          )}
        </div>

        {/* Input Area - only show when not on welcome screen */}
        {!showWelcomeScreen && (
          <ChatInputArea
            onSendMessage={sendMessage}
            isLoading={isLoading}
          />
        )}

        {/* Citations Panel */}
        <CitationsPanel
          open={citationsPanelOpen}
          onOpenChange={setCitationsPanelOpen}
          citations={extractCitations(messages)}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
