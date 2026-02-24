'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { productionsApi, type ProductionResponse } from '../../lib/api';

export default function ProductionsPage() {
  const [productions, setProductions] = useState<ProductionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    productionsApi
      .list()
      .then((data) => setProductions(data.productions))
      .catch(() => setError('Failed to load productions'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-black font-bold">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl">Productions</h1>
        <Link href="/productions/new" className="mac-btn-primary">
          New Production
        </Link>
      </div>

      {productions.length === 0 ? (
        <p className="font-mono text-black">No productions yet. Create your first one.</p>
      ) : (
        <ul className="divide-y divide-black">
          {productions.map((p) => (
            <li key={p.id}>
              <Link
                href={`/productions/${p.id}`}
                className="block px-3 py-4 hover:bg-black hover:text-white"
              >
                <h2>{p.title}</h2>
                {p.description && <p className="mt-1 text-sm font-mono">{p.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
