'use client';

import Link from 'next/link';

interface VersionItem {
  id: string;
  title: string;
  version: number;
  status: string;
  pageCount: number | null;
  createdAt: string;
  parentScriptId: string | null;
}

interface VersionHistoryProps {
  versions: VersionItem[];
  currentScriptId: string;
  productionId: string;
}

export function VersionHistory({ versions, currentScriptId, productionId }: VersionHistoryProps) {
  return (
    <div className="space-y-3">
      {versions.map((version) => {
        const isCurrent = version.id === currentScriptId;
        return (
          <div
            key={version.id}
            className={`flex items-center justify-between rounded border p-4 ${
              isCurrent ? 'border-blue-300 bg-blue-50' : 'border-zinc-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">v{version.version}</span>
                <span className="text-sm text-zinc-500">{version.title}</span>
                {isCurrent && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-1 flex gap-3 text-sm text-zinc-400">
                <span className="uppercase">{version.status}</span>
                {version.pageCount && <span>{version.pageCount} pages</span>}
                <span>{new Date(version.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            {!isCurrent && (
              <Link
                href={`/productions/${productionId}/scripts/${version.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                View
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
