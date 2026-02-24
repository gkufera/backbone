'use client';

import Link from 'next/link';
import type { FeedElementResponse } from '../lib/api';

interface FeedCardProps {
  element: FeedElementResponse;
  productionId: string;
  scriptId: string;
}

const WORKFLOW_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'badge badge-default',
  },
  OUTSTANDING: {
    label: 'Outstanding',
    className: 'badge badge-outstanding',
  },
  APPROVED: {
    label: 'Approved',
    className: 'badge badge-approved',
  },
};

export function FeedCard({ element, productionId, scriptId }: FeedCardProps) {
  const optionCount = element.options.length;
  const optionLabel = optionCount === 1 ? '1 option' : `${optionCount} options`;

  const badge = WORKFLOW_BADGE[element.workflowState] ?? null;

  return (
    <Link
      href={`/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`}
      className="block py-4 hover:bg-black hover:text-white"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{element.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="badge badge-default uppercase">{element.type}</span>
            <span className="text-xs font-mono">Pages: {element.pageNumbers.join(', ')}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-mono">{optionLabel}</span>
          {badge && (
            <span className={`ml-2 ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
