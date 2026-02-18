"use client"

import { useState } from "react"
import { Sparkles, ArrowRight, Palette } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import WhiteVeil from "@/components/WhiteVeil"

export default function LoginPage() {
  const { login, register } = useAuth()
  const router = useRouter()
  const [hue] = useState(170)

  const handleMockLogin = async () => {
    try {
      await login('demo@example.com', 'password');
      router.push('/');
    } catch {
      // If login fails, try registering
      try {
        await register('demo@example.com', 'password', 'Demo User');
        router.push('/');
      } catch (e2) {
        console.error('Login/Register failed', e2);
        alert('Failed to login/register demo user');
      }
    }
  }

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-[#f8f9ff] flex items-center justify-center p-6">
      {/* Full-screen WhiteVeil Background */}
      <div className="absolute inset-0 z-0">
        <WhiteVeil
          speed={3}
          noiseIntensity={0.02}
          scanlineIntensity={0.05}
          warpAmount={0.08}
          hueShift={hue}
        />
        {/* Soft Overlays for depth */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-white/40 to-white/60" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-white/80 to-transparent" />
      </div>

      {/* Login Content */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-1000">
        <div className="flex flex-col gap-10 text-center">
          {/* Logo & Brand */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-[#6b5ae0] text-white flex size-16 items-center justify-center rounded-2xl shadow-[0_20px_50px_rgba(107,90,224,0.3)]">
              <Sparkles className="size-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter text-[#3f386e] font-kiona lg:text-5xl">
              AINGO
            </h1>
          </div>

          {/* Tagline */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-[#3f386e]">
              Your Knowledge, Elevated.
            </h2>
            <p className="text-[#6b5ae0]/70 font-medium">
              The next generation of document intelligence and personal knowledge management.
            </p>
          </div>

          {/* Action Area (Glass Card) */}
          <div className="bg-white/70 backdrop-blur-2xl border border-white p-8 rounded-[32px] space-y-6 shadow-[0_30px_60px_-15px_rgba(107,90,224,0.15)]">
            <div className="space-y-6">
              <Button
                onClick={handleMockLogin}
                className="w-full h-16 text-lg font-bold bg-[#6b5ae0] hover:bg-[#5a48d1] text-white rounded-2xl shadow-[0_10px_30px_rgba(107,90,224,0.3)] transition-all active:scale-[0.98] group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-2">
                  Sign in with SSO
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>

              <p className="text-xs text-[#6b5ae0]/60 uppercase tracking-widest font-bold">
                Securely access your workspace
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-center gap-6 text-xs text-[#3f386e]/30 font-bold tracking-wide">
            <a href="#" className="hover:text-[#6b5ae0] transition-colors">PRIVACY</a>
            <span>•</span>
            <a href="#" className="hover:text-[#6b5ae0] transition-colors">TERMS</a>
            <span>•</span>
            <a href="#" className="hover:text-[#6b5ae0] transition-colors">SUPPORT</a>
          </div>
        </div>
      </div>
    </div>
  )
}
