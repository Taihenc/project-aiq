import { Ripple } from '@/components/ui/ripple';

export function ChatLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Ambient glow layer */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(107,90,224,0.08)_0%,transparent_70%)] dark:opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_55%,rgba(161,143,255,0.06)_0%,transparent_65%)] dark:opacity-50" />
      </div>

      {/* Ripple — hero element, anchored to vertical center */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[900px] w-[900px]">
          <Ripple
            mainCircleSize={350}
            mainCircleOpacity={0.18}
            numCircles={7}
            className="[&>div]:border-[var(--brand-border-lighter)] [&>div]:bg-[var(--brand-fg-light)]/5 [mask-image:none]"
          />
        </div>
      </div>

      {/* Content — sits above the ripple */}
      <div className="relative z-10 flex flex-col items-center gap-8 select-none">
        {/* Logo mark */}
        <div className="relative flex items-center justify-center">
          {/* Soft halo ring */}
          <div className="absolute size-20 rounded-full bg-[var(--brand-fg-light)]/10 blur-xl" />
          {/* Icon container */}
          <div className="relative flex size-14 items-center justify-center rounded-2xl border border-[var(--brand-border-lighter)] bg-[var(--brand-surface-purple)] shadow-[0_0_32px_-4px_var(--brand-fg-light)] backdrop-blur-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-7 text-[var(--brand-fg-light)]"
              aria-hidden="true"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M2 17l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--brand-fg-dark)]">
            AINGO{' '}
            <span className="bg-gradient-to-r from-[var(--brand-fg-light)] to-[var(--brand-fg-secondary)] bg-clip-text text-transparent">
              FORGE
            </span>
          </h1>
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-[var(--brand-fg-muted)]">
            Initializing workspace
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative h-px w-48 overflow-hidden rounded-full bg-[var(--brand-border-lighter)]">
          <div className="animate-loading-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[var(--brand-fg-light)] to-transparent" />
        </div>
      </div>

      {/* Bottom vignette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <style>{`
        @keyframes loading-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(500%); }
        }
        .animate-loading-bar {
          animation: loading-bar 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
