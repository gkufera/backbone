'use client';

import Link from 'next/link';
import type { FeedElementResponse } from '../lib/api';

interface FeedCardProps {
  element: FeedElementResponse;
  productionId: string;
  scriptId: string;
}

export function FeedCard({ element, productionId, scriptId }: FeedCardProps) {
  const optionCount = element.options.length;
  const optionLabel = optionCount === 1 ? '1 option' : `${optionCount} options`;

  const hasApproved = element.options.some(
    (opt) => opt.approvals.length > 0 && opt.approvals[0].decision === 'APPROVED',
  );

  return (
    <Link
      href={`/productions/${productionId}/scripts/${scriptId}/elements/${element.id}`}
      className="block rounded border p-4 hover:bg-zinc-50"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{element.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium uppercase">
              {element.type}
            </span>
            <span className="text-xs text-zinc-500">Pages: {element.pageNumbers.join(', ')}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm text-zinc-600">{optionLabel}</span>
          {hasApproved && (
            <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Approved
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
