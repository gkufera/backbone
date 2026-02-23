'use client';

import { useState } from 'react';

interface ApprovalButtonsProps {
  onSubmit: (decision: string, note?: string) => void;
  currentDecision?: string;
}

export function ApprovalButtons({ onSubmit, currentDecision }: ApprovalButtonsProps) {
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
          className={`rounded px-3 py-1 text-xs font-medium ${
            currentDecision === 'APPROVED'
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          Approve
        </button>
        <button
          onClick={() => handleDecision('REJECTED')}
          className={`rounded px-3 py-1 text-xs font-medium ${
            currentDecision === 'REJECTED'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          Reject
        </button>
        <button
          onClick={() => handleDecision('MAYBE')}
          className={`rounded px-3 py-1 text-xs font-medium ${
            currentDecision === 'MAYBE'
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          Maybe
        </button>
        <button
          onClick={() => setShowNote(!showNote)}
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700"
        >
          Add Note
        </button>
      </div>

      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note..."
          className="w-full rounded border p-2 text-sm"
          rows={2}
        />
      )}
    </div>
  );
}
