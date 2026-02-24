'use client';

import { useState } from 'react';

interface PermissionsTooltipProps {
  role: string;
}

const roleDescriptions: Record<string, string> = {
  DECIDER: 'Your approvals are official and final.',
  ADMIN:
    'Your approvals are tentative. A Decider must confirm them to make them official.',
  MEMBER:
    'Your approvals are tentative. A Decider must confirm them to make them official.',
};

export function PermissionsTooltip({ role }: PermissionsTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs text-zinc-500 hover:text-zinc-700"
        aria-label="Permissions info"
      >
        i
      </button>
      {open && (
        <span className="absolute left-6 top-0 z-10 w-56 rounded border bg-white p-2 text-xs text-zinc-700 shadow-md">
          {roleDescriptions[role] || roleDescriptions.MEMBER}
        </span>
      )}
    </span>
  );
}
