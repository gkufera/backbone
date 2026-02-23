'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { scriptsApi, type ScriptResponse } from '../../../../../../../lib/api';

export default function RevisionUploadPage() {
  const router = useRouter();
  const params = useParams();
  const productionId = params.id as string;
  const scriptId = params.scriptId as string;

  const [parentScript, setParentScript] = useState<ScriptResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    scriptsApi.get(productionId, scriptId).then(({ script }) => {
      setParentScript(script);
    });
  }, [productionId, scriptId]);

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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !parentScript) return;

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

      // Step 3: Create revision record
      const { script } = await scriptsApi.uploadRevision(productionId, scriptId, {
        title: parentScript.title,
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

  if (!parentScript) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-2xl font-bold">Upload New Draft</h1>
      <p className="mb-6 text-zinc-500">
        Uploading revision of: <strong>{parentScript.title}</strong>{' '}
        <span className="text-sm">v{parentScript.version}</span>
      </p>

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
          {isUploading ? 'Uploading...' : 'Upload New Draft'}
        </button>
      </form>
    </div>
  );
}
