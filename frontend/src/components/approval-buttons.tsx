'use client';

import { useState } from 'react';

interface ApprovalButtonsProps {
  onSubmit: (decision: string, note?: string) => void;
  currentDecision?: string;
  disabled?: boolean;
}

export function ApprovalButtons({ onSubmit, currentDecision, disabled }: ApprovalButtonsProps) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');

  function handleDecision(decision: string) {
    onSubmit(decision, note || undefined);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => handleDecision('APPROVED')}
          disabled={disabled}
          className={`px-3 py-1 text-xs font-medium ${
            currentDecision === 'APPROVED'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-black hover:text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Approve
        </button>
        <button
          onClick={() => handleDecision('REJECTED')}
          disabled={disabled}
          className={`px-3 py-1 text-xs font-medium ${
            currentDecision === 'REJECTED'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-black hover:text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Reject
        </button>
        <button
          onClick={() => handleDecision('MAYBE')}
          disabled={disabled}
          className={`px-3 py-1 text-xs font-medium ${
            currentDecision === 'MAYBE'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-black hover:text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Maybe
        </button>
        <button
          onClick={() => setShowNote(!showNote)}
          className="px-2 py-1 text-xs text-black hover:bg-black hover:text-white"
        >
          Add Note
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
