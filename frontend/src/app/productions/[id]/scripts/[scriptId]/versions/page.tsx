'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { scriptsApi } from '../../../../../../lib/api';
import { VersionHistory } from '../../../../../../components/version-history';

interface VersionItem {
  id: string;
  title: string;
  version: number;
  status: string;
  pageCount: number | null;
  createdAt: string;
  parentScriptId: string | null;
}

export default function VersionHistoryPage() {
  const params = useParams();
  const productionId = params.id as string;
  const scriptId = params.scriptId as string;

  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    scriptsApi
      .getVersions(productionId, scriptId)
      .then(({ versions: data }) => {
        setVersions(data);
      })
      .catch(() => {
        setError('Failed to load version history');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productionId, scriptId]);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-black font-bold">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Version History</h1>
      <VersionHistory versions={versions} currentScriptId={scriptId} productionId={productionId} />
    </div>
  );
}
