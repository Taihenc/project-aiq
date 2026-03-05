'use client';

import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FeatureCards } from '@/components/features/chat/feature-cards';
import { ChatInput } from '@/components/features/chat/chat-input';
import { AuroraText } from '@/components/ui/aurora-text';
import React from 'react';
import type { ChatWelcomeProps } from '@/types';

// ── Entrance animation variants ────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  onSendMessage,
  isLoading,
  attachments,
  onRemoveAttachment,
  onRemoveChunk,
  onAddAttachment,
  availableCitations,
}) => (
  <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
    {/* ── Ambient atmospheric orbs ─────────────────────────────────────── */}
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Primary — brand purple */}
      <motion.div
        className="absolute left-[12%] top-[8%] h-[520px] w-[520px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(107,90,224,0.18) 0%, transparent 68%)',
          filter: 'blur(64px)',
        }}
        animate={{
          scale: [1, 1.08, 0.95, 1.05, 1],
          x: [0, 30, -20, 14, 0],
          y: [0, -18, 24, -8, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Secondary — brand teal */}
      <motion.div
        className="absolute right-[10%] bottom-[12%] h-[440px] w-[440px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(78,204,163,0.12) 0%, transparent 68%)',
          filter: 'blur(64px)',
        }}
        animate={{
          scale: [1, 0.92, 1.1, 0.96, 1],
          x: [0, -24, 18, -12, 0],
          y: [0, 22, -16, 10, 0],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />
      {/* Tertiary — pink accent */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,107,157,0.07) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }}
        animate={{ scale: [1, 1.12, 0.92, 1] }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 9,
        }}
      />
    </div>

    {/* ── Main content ────────────────────────────────────────────────── */}
    <motion.div
      className="relative z-10 flex w-full flex-col items-center gap-10 px-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Eyebrow — avatar + label */}
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-8 w-8 ring-2 ring-brand-border-light">
            <AvatarImage
              src="/images/backgrounds/ai-profile.png"
              alt="AI Assistant"
            />
            <AvatarFallback className="bg-linear-to-br from-[#a18fff] to-[#6f5deb] text-sm font-semibold uppercase text-white">
              AI
            </AvatarFallback>
          </Avatar>
        </div>
        <span className="text-[11px] font-medium tracking-[0.22em] uppercase text-brand-content-text">
          Personal Knowledge Manager
        </span>
      </motion.div>

      {/* Hero headline + descriptor */}
      <motion.div
        variants={item}
        className="flex flex-col items-center gap-4 text-center"
      >
        <h1
          className="font-kiona leading-[1.06] tracking-tight"
          style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4.75rem)' }}
        >
          <span className="block text-foreground">WHAT CAN I</span>
          <AuroraText
            colors={['#6B5AE0', '#A18FFF', '#4ECCA3', '#A18FFF', '#6B5AE0']}
            speed={0.6}
            className="font-kiona"
          >
            HELP WITH?
          </AuroraText>
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-brand-content-text sm:max-w-sm">
          Ask anything — your documents, sources, and knowledge, instantly
          reachable.
        </p>
      </motion.div>

      {/* Feature capability cards */}
      <motion.div variants={item} className="w-full max-w-4xl"></motion.div>

      {/* Signature chat input */}
      <motion.div variants={item} className="w-full max-w-3xl">
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={isLoading}
          attachments={attachments}
          onRemoveAttachment={onRemoveAttachment}
          onRemoveChunk={onRemoveChunk}
          onAddAttachment={onAddAttachment}
          availableCitations={availableCitations}
        />
      </motion.div>
    </motion.div>
  </div>
);
