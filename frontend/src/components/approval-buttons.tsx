'use client';

import { useState } from 'react';

interface ApprovalButtonsProps {
  onSubmit: (decision: string, note?: string) => void;
  currentDecision?: string;
  disabled?: boolean;
}

export function ApprovalButtons({ onSubmit, disabled }: ApprovalButtonsProps) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');

  function handleDecision(decision: string) {
    onSubmit(decision, note || undefined);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <button
          onClick={() => handleDecision('APPROVED')}
          disabled={disabled}
          className="approval-btn-approved px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Y
        </button>
        <button
          onClick={() => handleDecision('MAYBE')}
          disabled={disabled}
          className="approval-btn-maybe px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          M
        </button>
        <button
          onClick={() => handleDecision('REJECTED')}
          disabled={disabled}
          className="approval-btn-rejected px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          N
        </button>
        <button
          onClick={() => setShowNote(!showNote)}
          className="px-2 py-1 text-xs"
        >
          + Note
        </button>
      </div>

      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note..."
          className="w-full border-2 border-black p-2 text-sm"
          rows={2}
        />
      )}
    </div>
  );
}
