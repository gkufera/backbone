'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { productionsApi, type ProductionResponse } from '../../lib/api';

export default function ProductionsPage() {
  const [productions, setProductions] = useState<ProductionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    productionsApi
      .list()
      .then((data) => setProductions(data.productions))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productions</h1>
        <Link href="/productions/new" className="rounded bg-black px-4 py-2 text-white">
          New Production
        </Link>
      </div>

      {productions.length === 0 ? (
        <p className="text-zinc-500">No productions yet. Create your first one.</p>
      ) : (
        <ul className="space-y-3">
          {productions.map((p) => (
            <li key={p.id}>
              <Link
                href={`/productions/${p.id}`}
                className="block rounded border p-4 hover:bg-zinc-50"
              >
                <h2 className="font-semibold">{p.title}</h2>
                {p.description && <p className="mt-1 text-sm text-zinc-500">{p.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
