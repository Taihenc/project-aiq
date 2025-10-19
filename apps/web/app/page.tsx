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
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { BookOpen } from 'lucide-react';
import { sendChatMessage } from '@/lib/api/chat';

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
  metadata?: {
    model_used?: string;
    processing_time_ms?: number;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
}

// Demo/Preview data
const DEMO_MESSAGES: Message[] = [
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
];

export default function Home() {
  // Check if demo mode is enabled from environment variable
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const [messages, setMessages] = useState<Message[]>(
    isDemoMode ? DEMO_MESSAGES : [],
  );
  const [citationsPanelOpen, setCitationsPanelOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState('1');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Demo mode - simulate response
    if (isDemoMode) {
      setTimeout(() => {
        const demoResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'This is a demo response. The system is in preview mode with sample data. To connect to the real backend, toggle the demo mode off using the button in the header.',
          sources: [
            {
              id: 'demo-1',
              title: 'Demo Document',
              platform: 'Preview',
              content: 'This is sample content for demonstration purposes.',
            },
          ],
        };
        setMessages((prev) => [...prev, demoResponse]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    // Real mode - connect to backend
    try {
      // Send message to backend
      const response = await sendChatMessage(content, sessionId);

      // Update session ID if it's a new session
      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
      }

      // Add AI response
      const aiMessage: Message = {
        id: response.chat_id,
        role: 'assistant',
        content: response.chat_box.message,
        metadata: {
          model_used: response.model_used,
          processing_time_ms: response.processing_time_ms,
          tokens: {
            prompt: response.prompt_tokens,
            completion: response.completion_tokens,
            total: response.total_tokens,
          },
        },
        // You can parse sources from context if available
        sources: response.chat_box.context?.sources,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'Sorry, I encountered an error processing your request. Please make sure the backend server is running and try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const showWelcomeScreen = messages.length === 0;

  return (
    <SidebarProvider className="bg-surface-purple">
      {/* Sidebar */}
      <Sidebar
        currentChatId={currentChatId}
        onChatSelect={setCurrentChatId}
        onNewChat={() => setMessages([])}
      />

      {/* Main Chat Area */}
      <SidebarInset className="relative flex h-screen flex-1 flex-col overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,104,255,0.08)_0%,transparent_55%)]" />

        {/* Header */}
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
            onClick={() => setCitationsPanelOpen(true)}
          >
            <BookOpen className="h-4 w-4" />
            View sources
          </Button>
        </div>

        {/* Messages Area */}
        <div className="relative z-0 flex flex-1 min-h-0 flex-col px-6 pt-2 sm:px-10 lg:px-12">
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
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={isLoading}
                  />
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white/70 via-white/40 to-transparent" />
          )}
        </div>

        {/* Input Area - only show when not on welcome screen */}
        {!showWelcomeScreen && (
          <div className="relative z-10 bg-white px-6 pb-2 sm:px-10 lg:px-12">
            <div className="pointer-events-none absolute inset-x-0 -top-3 h-3 bg-gradient-to-b from-transparent via-white/20 to-white/65" />
            <div className="relative z-10 mx-auto max-w-3xl">
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

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
      </SidebarInset>
    </SidebarProvider>
  );
}
