'use client';

import React from 'react';
import BlurText from '@/components/BlurText';
import AnimatedContent from '@/components/AnimatedContent';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingIndicatorProps {
  status?: string;
  statusHistory?: string[];
}

// Defined outside to keep a stable reference across renders (avoids remount flicker)
const StatusRow = React.memo(function StatusRow({
  item,
  staggerIndex = 0,
}: {
  item: string;
  staggerIndex?: number;
}) {
  return (
    <AnimatedContent
      distance={10}
      direction="vertical"
      reverse={false}
      duration={0.35}
      ease="power2.out"
      animateOpacity
      initialOpacity={0}
      threshold={0}
      delay={staggerIndex * 0.06}
      className=""
    >
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground/50 font-medium">
        <CheckCircle2 className="size-3 shrink-0 text-muted-foreground/30 mt-0.5" />
        <span>{item}</span>
      </div>
    </AnimatedContent>
  );
});

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  status,
  statusHistory = [],
}) => {
  const [messageIndex, setMessageIndex] = React.useState(0);
  const [expanded, setExpanded] = React.useState(false);

  const defaultMessages = [
    'AINGO is thinking...',
    'Searching through relevant documents...',
    'Analyzing context...',
    'Synthesizing information...',
    'Drafting a comprehensive response...',
  ];

  const isDefaultStatus = !status || status === 'initializing';

  React.useEffect(() => {
    if (isDefaultStatus) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % defaultMessages.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isDefaultStatus, defaultMessages.length]);

  const currentDisplayName = isDefaultStatus
    ? defaultMessages[messageIndex]
    : status!;

  // All history except the very latest (which is shown as the current status)
  const completedStatuses = statusHistory.slice(0, -1);
  const previewStatuses = completedStatuses.slice(-3); // last 3 always visible
  const hiddenStatuses = completedStatuses.slice(0, -3); // older ones behind toggle
  const hasHistory = completedStatuses.length > 0;
  const hasHidden = hiddenStatuses.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Current active status */}
      <div className="flex items-center gap-3 min-h-8">
        <div className="flex gap-1.5 items-center shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7C68FF] animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#B19EEF] animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF9FFC] animate-bounce" />
        </div>
        <BlurText
          key={currentDisplayName}
          text={currentDisplayName}
          delay={80}
          animateBy="words"
          stepDuration={0.4}
          className="m-0 select-none loading-gradient-text text-sm font-bold"
          animateInView={false}
          enableGradientFix={true}
          animationFrom={{ filter: 'blur(8px)', opacity: 0, y: -8 }}
          animationTo={[
            { filter: 'blur(3px)', opacity: 0.5, y: -3 },
            { filter: 'blur(0px)', opacity: 1, y: 0 },
          ]}
        />
      </div>

      {/* History section — fades in once it has content */}
      {hasHistory && (
        <div className="ml-1 flex flex-col gap-0.5 animate-in fade-in duration-200">
          {/* Older steps — hidden behind toggle */}
          {hasHidden && (
            <>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors duration-150 font-medium select-none mb-0.5"
              >
                <ChevronDown
                  className={cn(
                    'size-3 transition-transform duration-200',
                    expanded && 'rotate-180',
                  )}
                />
                {expanded
                  ? 'Hide older steps'
                  : `${hiddenStatuses.length} older step${hiddenStatuses.length > 1 ? 's' : ''}`}
              </button>

              <div
                className={cn(
                  'flex flex-col gap-0.5 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out',
                  expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
                )}
              >
                {hiddenStatuses.map((item, i) => (
                  <StatusRow key={item + i} item={item} staggerIndex={i} />
                ))}
              </div>
            </>
          )}

          {/* Last 3 completed — always visible, keyed by content so new items animate in */}
          {previewStatuses.map((item, i) => (
            <StatusRow key={item + i} item={item} staggerIndex={i} />
          ))}
        </div>
      )}
    </div>
  );
};
