'use client';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth/auth-context';
import { Toaster } from 'sonner';

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
      </AuthProvider>
    </ThemeProvider>
  );
}
