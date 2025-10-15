'use client';

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/custom/sidebar';
import { ChatMessage } from '@/components/features/chat/chat-message';
import { ChatInput } from '@/components/features/chat/chat-input';
import { FeatureCards } from '@/components/features/chat/feature-cards';
import { CitationsPanel } from '@/components/features/chat/citations-panel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookOpen } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    id: string;
    title: string;
    platform: string;
    content?: string;
  }>;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: 'What is current Product Roadmap?',
    },
    {
      id: '2',
      role: 'assistant',
      content:
        "Based on your query about 'What is current Product Roadmap?', I found relevant information from your knowledge sources. The data shows significant growth trends in Q4 2024, with revenue increasing by 23% compared to the previous quarter. This growth was primarily driven by new product launches and expanded market presence in key demographics.",
      sources: [
        {
          id: '1',
          title: 'Q4 Financial Report 2024',
          platform: 'SharePoint',
          content:
            'Revenue increased by 23% compared to Q3, driven primarily by our new product launches and expanded market presence. Revenue increased by 23% compared to Q3, driven primarily by our new product launches and expanded market presence.',
        },
        {
          id: '2',
          title: 'New Product',
          platform: 'SharePoint',
          content:
            'Revenue increased by 23% compared to Q3, driven primarily by our new product launches and expanded market presence. Revenue increased by 23% compared to Q3, driven primarily by our new product launches and expanded market presence.',
        },
      ],
    },
  ]);

  const [citationsPanelOpen, setCitationsPanelOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState('1');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };
    setMessages([...messages, newMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm processing your request. This is a demo response.",
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const showWelcomeScreen = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-purple">
      {/* Sidebar */}
      <Sidebar
        currentChatId={currentChatId}
        onChatSelect={setCurrentChatId}
        onNewChat={() => setMessages([])}
      />

      {/* Main Chat Area */}
      <div className="bg-white relative flex flex-1 min-h-0 flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,104,255,0.08)_0%,transparent_55%)]" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-12 pb-6 pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
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
            onClick={() => setCitationsPanelOpen(true)}
          >
            <BookOpen className="h-4 w-4" />
            View sources
          </Button>
        </div>

        {/* Messages Area */}
        <div className="relative z-0 flex flex-1 min-h-0 flex-col px-12 pt-4">
          {showWelcomeScreen ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-baseline gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src="/images/backgrounds/ai-profile.png"
                        alt="AI Assistant"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-[#a18fff] to-[#6f5deb] text-base font-semibold uppercase text-white">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="text-primary-dark font-kiona text-4xl font-semibold">
                      WHAT CAN I HELP WITH?
                    </h2>
                  </div>
                  <p className="text-secondary text-base">
                    Ask Anything with your personal knowledge Manager
                  </p>
                </div>

                <FeatureCards />

                {/* Input Area - Moved here for welcome screen */}
                <div className="w-full max-w-3xl">
                  <ChatInput onSendMessage={handleSendMessage} />
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-3xl space-y-6 pb-28">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    sources={message.sources}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
          {/* Fade overlay above input - only show when not on welcome screen */}
          {!showWelcomeScreen && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/70 via-white/40 to-transparent" />
          )}
        </div>

        {/* Input Area - only show when not on welcome screen */}
        {!showWelcomeScreen && (
          <div className="relative z-10 bg-white px-12 pb-10">
            <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-b from-transparent via-white/20 to-white/65" />
            <div className="relative z-10 mx-auto max-w-3xl">
              <ChatInput onSendMessage={handleSendMessage} />
            </div>
          </div>
        )}
      </div>

      {/* Citations Panel */}
      <CitationsPanel
        open={citationsPanelOpen}
        onOpenChange={setCitationsPanelOpen}
        citations={messages
          .filter((m) => m.sources)
          .flatMap((m) => m.sources || [])
          .map((s) => ({
            id: s.id,
            title: s.title,
            platform: s.platform,
            content: s.content || '',
          }))}
      />
    </div>
  );
}
