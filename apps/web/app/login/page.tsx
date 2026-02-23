'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Palette } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import DarkVeil from '@/components/DarkVeil';
import WhiteVeil from '@/components/WhiteVeil';

export default function LoginPage() {
  const { login, register, isAuthenticated } = useAuth();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [whiteHue] = useState(170);
  const [darkHue] = useState(338);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('[LoginPage] Authenticated! Redirecting to /');
      window.location.href = '/';
    }
  }, [isAuthenticated]);

  const handleMockLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    let success = false;
    try {
      console.log('[LoginPage] Attempting login...');
      await login('demo@example.com', 'password');
      success = true;
      console.log('[LoginPage] Login persisted. Waiting for redirect...');
    } catch {
      try {
        console.log('[LoginPage] Login failed, attempting register...');
        await register('demo@example.com', 'password', 'Demo User');
        success = true;
        console.log('[LoginPage] Register persisted. Waiting for redirect...');
      } catch (e2) {
        console.error('[LoginPage] Login/Register failed', e2);
        setIsLoading(false);
      }
    } finally {
      if (success) {
        setTimeout(() => {
          if (mounted) setIsLoading(false);
        }, 5000);
      }
    }
  };

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-brand-surface-light flex items-center justify-center p-6">
      {/* Full-screen Veil Background */}
      <div className="absolute inset-0 z-0">
        {!mounted || resolvedTheme === 'dark' ? (
          <DarkVeil
            speed={3}
            noiseIntensity={0.02}
            scanlineIntensity={0.05}
            warpAmount={0.08}
            hueShift={darkHue}
          />
        ) : (
          <WhiteVeil
            speed={3}
            noiseIntensity={0.02}
            scanlineIntensity={0.05}
            warpAmount={0.08}
            hueShift={whiteHue}
          />
        )}
        {/* Soft Overlays for depth */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-background/40 to-background/60" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Login Content */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-1000">
        <div className="flex flex-col gap-10 text-center">
          {/* Logo & Brand */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-brand-btn-primary text-white flex size-16 items-center justify-center rounded-2xl shadow-[0_20px_50px_rgba(107,90,224,0.3)]">
              <Sparkles className="size-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter text-brand-fg-dark font-kiona lg:text-5xl">
              AINGO
            </h1>
          </div>

          {/* Tagline */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-brand-fg-dark">
              Your Knowledge, Elevated.
            </h2>
            <p className="text-brand-btn-primary/70 font-medium">
              The next generation of document intelligence and personal
              knowledge management.
            </p>
          </div>

          {/* Action Area (Glass Card) */}
          <div className="bg-background/70 backdrop-blur-2xl border border-border p-8 rounded-[32px] space-y-6 shadow-[0_30px_60px_-15px_rgba(107,90,224,0.15)]">
            <div className="space-y-6">
              <Button
                onClick={handleMockLogin}
                disabled={isLoading}
                className="w-full h-16 text-lg font-bold bg-brand-btn-primary hover:bg-brand-btn-primary-hover text-white rounded-2xl shadow-[0_10px_30px_rgba(107,90,224,0.3)] transition-all active:scale-[0.98] group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    <>
                      Sign in with SSO
                      <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </Button>

              <p className="text-xs text-brand-btn-primary/60 uppercase tracking-widest font-bold">
                Securely access your workspace
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-center gap-6 text-xs text-brand-fg-medium/30 font-bold tracking-wide">
            <a
              href="#"
              className="hover:text-brand-btn-primary transition-colors"
            >
              PRIVACY
            </a>
            <span>•</span>
            <a
              href="#"
              className="hover:text-brand-btn-primary transition-colors"
            >
              TERMS
            </a>
            <span>•</span>
            <a
              href="#"
              className="hover:text-brand-btn-primary transition-colors"
            >
              SUPPORT
            </a>
          </div>
        </div>
      </div>
      <div className="fixed bottom-6 right-6 z-[100]">
        <ThemeToggle className="h-10 w-10 rounded-full border border-purple-light shadow-button bg-background hover:bg-surface-light" />
      </div>
    </div>
  );
}
