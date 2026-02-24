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
    <div className="divide-y divide-black">
      {versions.map((version) => {
        const isCurrent = version.id === currentScriptId;
        return (
          <div
            key={version.id}
            className={`flex items-center justify-between py-4 ${
              isCurrent ? 'border-l-4 border-black pl-3' : ''
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">v{version.version}</span>
                <span className="text-sm font-mono text-black">{version.title}</span>
                {isCurrent && (
                  <span className="badge badge-approved">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-1 flex gap-3 text-sm font-mono text-black">
                <span className="uppercase">{version.status}</span>
                {version.pageCount && <span>{version.pageCount} pages</span>}
                <span>{new Date(version.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            {!isCurrent && (
              <Link
                href={`/productions/${productionId}/scripts/${version.id}`}
                className="text-sm underline"
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
