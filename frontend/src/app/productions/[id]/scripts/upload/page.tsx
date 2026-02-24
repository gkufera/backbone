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
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' },
      });
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

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
      <h1 className="mb-6 text-2xl">Upload Script</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="pdf-file" className="block text-sm">
            PDF File
          </label>
          <input
            id="pdf-file"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="mt-1 w-full"
          />
          {file && <p className="mt-1 text-sm text-black">{file.name}</p>}
        </div>

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
          />
        </div>

        {error && (
          <div role="alert" className="text-sm text-black font-bold">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || isUploading}
          className="mac-btn-primary disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload Script'}
        </button>
      </form>
    </div>
  );
}
