'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/custom/sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useHistory } from '@/hooks/useHistory';
import { useAuth } from '@/lib/auth/auth-context';
import { Cookies } from '@/lib/utils/cookies';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { SourcesContent } from './sources-content';

export function SourcesLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { history } = useHistory();

  useEffect(() => {
    if (isAuthLoading) return;
    const hasToken = !!Cookies.get('auth_token');
    if (!isAuthenticated && !hasToken) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleNewChat = () => router.push('/');
  const handleChatSelect = (id: string) => router.push(`/c/${id}`);

  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-4 border-[var(--brand-border-lighter)] border-t-[var(--brand-fg-light)] rounded-full animate-spin" />
          <p className="text-sm font-medium text-brand-fg-light/60 animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="bg-surface-purple">
      <Sidebar
        chatHistory={history}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
      />
      <SidebarInset className="relative flex h-screen flex-1 flex-col overflow-hidden bg-background">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,104,255,0.08)_0%,transparent_55%)]" />

        <SourcesContent />

        <div className="fixed bottom-6 right-6 z-[100]">
          <ThemeToggle className="h-10 w-10 rounded-full border border-purple-light shadow-button bg-background hover:bg-surface-light" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
