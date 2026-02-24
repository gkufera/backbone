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
        className="ml-1 inline-flex h-5 w-5 items-center justify-center border-2 border-black text-xs text-black hover:bg-black hover:text-white"
        aria-label="Permissions info"
      >
        i
      </button>
      {open && (
        <span className="absolute left-6 top-0 z-10 w-56 border-2 border-black bg-white p-2 text-xs font-mono text-black">
          {roleDescriptions[role] || roleDescriptions.MEMBER}
        </span>
      )}
    </span>
  );
}
