'use client';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth/auth-context';
import { Toaster } from 'sonner';
import { CommandPalette } from '@/components/features/command/command-palette';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        {children}
        <Toaster />
        <CommandPalette />
      </AuthProvider>
    </ThemeProvider>
  );
}
