'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { scriptsApi, type ScriptResponse } from '../../../../../../../lib/api';
import { SkeletonCard } from '../../../../../../../components/skeleton';
import { SCRIPT_ALLOWED_EXTENSIONS } from '@backbone/shared/constants';

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.substring(dot).toLowerCase() : '';
}

function isAllowedExtension(fileName: string): boolean {
  const ext = getExtension(fileName);
  return (SCRIPT_ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

function isFdx(fileName: string): boolean {
  return getExtension(fileName) === '.fdx';
}

function getContentType(fileName: string): string {
  return isFdx(fileName) ? 'application/xml' : 'application/pdf';
}

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

    if (!isAllowedExtension(selected.name)) {
      setError('Only PDF and FDX files are allowed');
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
      const contentType = getContentType(file.name);

      // Step 1: Get presigned URL
      const { uploadUrl, s3Key } = await scriptsApi.getUploadUrl(file.name, contentType, productionId);

      // Step 2: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

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
    return <div className="p-6"><SkeletonCard /></div>;
  }

  const isFdxFile = file && isFdx(file.name);

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-2xl">Upload New Draft</h1>
      <p className="mb-6 text-black">
        Uploading revision of: <strong>{parentScript.title}</strong>{' '}
        <span className="text-sm">v{parentScript.version}</span>
      </p>
      {parentScript.episodeNumber != null && (
        <p className="mb-4 font-mono text-sm">
          Episode {parentScript.episodeNumber}: {parentScript.episodeTitle}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="script-file" className="block text-sm">
            Script File (PDF or FDX)
          </label>
          <input
            id="script-file"
            type="file"
            accept=".pdf,.fdx"
            onChange={handleFileChange}
            className="mt-1 w-full"
          />
          {file && <p className="mt-1 text-sm text-black">{file.name}</p>}
          {isFdxFile && (
            <p className="mt-2 text-xs font-mono">
              FDX import detects elements directly from Final Draft&apos;s paragraph types and
              tagger tags. This is significantly more accurate than PDF text extraction, which uses
              pattern matching and may miss or misidentify elements.
            </p>
          )}
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
          {isUploading ? 'Uploading...' : 'Upload New Draft'}
        </button>
      </form>
    </div>
  );
}
