'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { scriptsApi } from '../../../../../lib/api';

export default function ScriptUploadPage() {
  const router = useRouter();
  const params = useParams();
  const productionId = params.id as string;

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    setError('');

    if (!selected) return;

    if (selected.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      setFile(null);
      return;
    }

    setFile(selected);
    // Auto-fill title from filename without extension
    if (!title) {
      setTitle(selected.name.replace(/\.pdf$/i, ''));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setError('');
    setIsUploading(true);

    try {
      // Step 1: Get presigned URL
      const { uploadUrl, s3Key } = await scriptsApi.getUploadUrl(file.name, 'application/pdf');

      // Step 2: Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' },
      });

      // Step 3: Create script record
      const { script } = await scriptsApi.create(productionId, {
        title: title || file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        s3Key,
      });

      router.push(`/productions/${productionId}/scripts/${script.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl font-bold">Upload Script</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="pdf-file" className="block text-sm font-medium">
            PDF File
          </label>
          <input
            id="pdf-file"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="mt-1 w-full"
          />
          {file && <p className="mt-1 text-sm text-zinc-500">{file.name}</p>}
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        {error && (
          <div role="alert" className="text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || isUploading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload Script'}
        </button>
      </form>
    </div>
  );
}
