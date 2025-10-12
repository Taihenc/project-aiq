'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { FileText, Search, Lightbulb } from 'lucide-react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}

function FeatureCard({ icon, title, description, onClick }: FeatureCardProps) {
  return (
    <Card
      className="border-purple-soft shadow-card-sm rounded-card flex cursor-pointer flex-col gap-3 bg-white/90 p-6 transition-transform hover:-translate-y-1 hover:shadow-[0_28px_65px_-36px_rgba(102,88,204,0.45)]"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f4f1ff] to-white text-[#6f5deb]">
          {icon}
        </div>
        <h3 className="text-primary-medium text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-secondary text-sm leading-relaxed">{description}</p>
    </Card>
  );
}

export function FeatureCards() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
      <FeatureCard
        icon={<FileText className="h-4 w-4" />}
        title="Summarize Anything"
        description="Turn long docs into crisp takeaways with citations and next steps."
      />
      <FeatureCard
        icon={<Search className="h-4 w-4" />}
        title="Find the source reference"
        description="Pinpoint the exact doc, page and quote with live citations."
      />
      <FeatureCard
        icon={<Lightbulb className="h-4 w-4" />}
        title="Get an instant answer"
        description="Evidence-backed answers pulled from your knowledge base, with sources attached."
      />
    </div>
  );
}
