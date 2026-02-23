'use client';

import type { OptionResponse } from '../lib/api';
import { OptionCard } from './option-card';

interface OptionGalleryProps {
  options: OptionResponse[];
  onToggleReady: (optionId: string) => void;
  onArchive: (optionId: string) => void;
  optionApprovals?: Record<string, { latestDecision?: string }>;
  onApprove?: (optionId: string, decision: string, note?: string) => void;
}

export function OptionGallery({
  options,
  onToggleReady,
  onArchive,
  optionApprovals,
  onApprove,
}: OptionGalleryProps) {
  if (options.length === 0) {
    return <p className="text-zinc-500">No options yet. Add an option to get started.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((opt) => (
        <OptionCard
          key={opt.id}
          option={opt}
          onToggleReady={onToggleReady}
          onArchive={onArchive}
          latestDecision={optionApprovals?.[opt.id]?.latestDecision}
          onApprove={onApprove}
        />
      ))}
    </div>
  );
}
