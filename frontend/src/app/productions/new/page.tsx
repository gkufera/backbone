'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { productionsApi } from '../../../lib/api';

export default function NewProductionPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await productionsApi.create({ title });
      router.push(`/productions/${result.production.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create production');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl">New Production</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border-2 border-black p-2"
            required
          />
        </div>

        {error && (
          <div role="alert" className="text-sm text-black font-bold">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mac-btn-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Production'}
        </button>
      </form>
    </div>
  );
}
