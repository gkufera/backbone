'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { feedApi, type FeedElementResponse } from '../../../../lib/api';
import { FeedCard } from '../../../../components/feed-card';

export default function FeedPage() {
  const params = useParams();
  const productionId = params.id as string;

  const [elements, setElements] = useState<FeedElementResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    feedApi
      .list(productionId)
      .then((data) => setElements(data.elements))
      .catch(() => setError('Failed to load feed'))
      .finally(() => setIsLoading(false));
  }, [productionId]);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-black font-bold">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl">Review Feed</h1>

      {elements.length === 0 ? (
        <p className="text-black">No elements pending review.</p>
      ) : (
        <div className="divide-y divide-black">
          {elements.map((elem) => (
            <FeedCard
              key={elem.id}
              element={elem}
              productionId={productionId}
              scriptId={elem.scriptId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
