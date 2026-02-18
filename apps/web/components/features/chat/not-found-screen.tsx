'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FuzzyText from '@/components/FuzzyText';
import { Button } from '@/components/ui/button';
import { MoveLeft, RotateCcw } from 'lucide-react';

interface NotFoundScreenProps {
  message?: string;
  redirectTo?: string;
  countdownSeconds?: number;
}

export function NotFoundScreen({
  message = "This chat doesn't exist or you don't have access to it.",
  redirectTo = "/",
  countdownSeconds = 5,
}: NotFoundScreenProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(countdownSeconds);

  useEffect(() => {
    if (countdown <= 0) {
      router.push(redirectTo);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router, redirectTo]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0c] text-white p-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="mb-2">
          <FuzzyText
            fontSize="clamp(6rem, 15vw, 12rem)"
            fontWeight={900}
            color="#ffffff"
            baseIntensity={0.2}
            hoverIntensity={0.5}
            enableHover={true}
          >
            404
          </FuzzyText>
        </div>

        <div className="mb-12">
          <FuzzyText
            fontSize="clamp(1.5rem, 4vw, 3rem)"
            fontWeight={400}
            color="#a19ad9"
            baseIntensity={0.1}
            hoverIntensity={0.3}
            enableHover={true}
          >
            not found
          </FuzzyText>
        </div>

        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <p className="text-purple-200/60 text-lg max-w-md mx-auto leading-relaxed">
            {message}
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 text-sm font-medium text-white/40 tracking-widest uppercase">
              <RotateCcw className="size-3 animate-spin duration-3000" />
              Redirecting in <span className="text-white tabular-nums">{countdown}</span> seconds
            </div>

            <Button
              onClick={() => router.push(redirectTo)}
              size="lg"
              className="bg-[#6b5ae0] hover:bg-[#5a48d1] text-white rounded-2xl px-12 h-14 font-semibold shadow-[0_10px_30px_rgba(107,90,224,0.3)] transition-all active:scale-[0.98] group"
            >
              <MoveLeft className="mr-2 size-5 transition-transform group-hover:-translate-x-1" />
              Go Back Home
            </Button>
          </div>
        </div>
      </div>

      {/* Subtle bottom text */}
      <div className="absolute bottom-8 text-[10px] text-white/10 tracking-[0.4em] uppercase">
        AINGO Neural Guard • Access Denied
      </div>
    </div>
  );
}
