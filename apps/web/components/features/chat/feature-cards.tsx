'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { FileText, Search, Lightbulb } from 'lucide-react';
import GradientText from '@/components/GradientText';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  iconColor: string;
  gradientColors: string[];
  onClick?: () => void;
}

function FeatureCard({
  icon,
  title,
  description,
  iconColor,
  gradientColors,
  onClick,
}: FeatureCardProps) {
  return (
    <Card
      className="group border-[#f0ecff] shadow-[0_8px_30px_-12px_rgba(102,88,204,0.15)] rounded-4xl flex cursor-pointer flex-col gap-3 bg-white/95 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(102,88,204,0.3)] hover:border-[#e5deff]"
      onClick={onClick}
    >
      {/* Top part - icon and title side by side */}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconColor} flex-shrink-0`}
        >
          {icon}
        </div>
        <h3 className="text-base font-semibold leading-tight overflow-visible">
          <GradientText
            colors={gradientColors}
            animationSpeed={8}
            className="inline-block !overflow-visible"
          >
            {title}
          </GradientText>
        </h3>
      </div>

      {/* Bottom part - description */}
      <p className="text-[#7c73b7] text-sm leading-relaxed">{description}</p>
    </Card>
  );
}

export function FeatureCards() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
      <FeatureCard
        icon={<FileText className="h-5 w-5" />}
        iconColor="bg-[#f4f1ff] text-[#a18fff]"
        gradientColors={['#a18fff', '#8b6dff', '#a18fff', '#8b6dff', '#a18fff']}
        title="Summarize Anything"
        description="Turn long docs into crisp takeaways with citations and next steps."
      />
      <FeatureCard
        icon={<Search className="h-5 w-5" />}
        iconColor="bg-[#e8f9f4] text-[#4ecca3]"
        gradientColors={['#4ecca3', '#36d4a0', '#4ecca3', '#36d4a0', '#4ecca3']}
        title="Find the source reference"
        description="Pinpoint the exact doc, page, and quote with live citations."
      />
      <FeatureCard
        icon={<Lightbulb className="h-5 w-5" />}
        iconColor="bg-[#ffe8f0] text-[#ff6b9d]"
        gradientColors={['#ff6b9d', '#ff4d8a', '#ff6b9d', '#ff4d8a', '#ff6b9d']}
        title="Get an instant answer"
        description="Evidence-backed answers pulled from your knowledge base, with sources attached."
      />
    </div>
  );
}
