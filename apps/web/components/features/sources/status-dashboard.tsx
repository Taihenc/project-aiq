'use client';

import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileStack,
  Hourglass,
} from 'lucide-react';

export interface StatusCounts {
  total: number;
  ingested: number;
  processing: number;
  failed: number;
  pending: number;
}

interface StatusDashboardProps {
  counts: StatusCounts;
  isLoading?: boolean;
}

const cards = [
  {
    key: 'total' as const,
    label: 'Total Files',
    icon: FileStack,
    color: 'text-violet-400',
    border: 'border-violet-500/20',
    bg: 'bg-violet-500/8',
    pulse: false,
  },
  {
    key: 'ingested' as const,
    label: 'Indexed',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/8',
    pulse: false,
    glow: 'shadow-[0_0_16px_0_rgba(52,211,153,0.12)]',
  },
  {
    key: 'processing' as const,
    label: 'In Progress',
    icon: Clock,
    color: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/8',
    pulse: true,
  },
  {
    key: 'pending' as const,
    label: 'Queued',
    icon: Hourglass,
    color: 'text-yellow-400',
    border: 'border-yellow-500/20',
    bg: 'bg-yellow-500/8',
    pulse: false,
  },
  {
    key: 'failed' as const,
    label: 'Failed',
    icon: AlertCircle,
    color: 'text-red-400',
    border: 'border-red-500/20',
    bg: 'bg-red-500/8',
    pulse: false,
  },
] as const;

export function StatusDashboard({ counts, isLoading }: StatusDashboardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        const value = counts[card.key];
        const shouldPulse = card.pulse && value > 0;

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, ease: 'easeOut' }}
            className={`relative rounded-xl border ${card.border} ${card.bg} ${'glow' in card ? card.glow : ''} backdrop-blur-sm p-4 flex flex-col gap-2 group`}
          >
            <div className="flex items-center justify-between">
              <Icon
                className={`h-4 w-4 ${card.color} transition-transform group-hover:scale-110 ${shouldPulse ? 'animate-pulse' : ''}`}
              />
              {shouldPulse && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="h-9 w-14 rounded-lg bg-white/5 animate-pulse" />
            ) : (
              <span
                className={`text-3xl font-bold tabular-nums leading-none ${card.color}`}
              >
                {value}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              {card.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
