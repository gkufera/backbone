'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { scriptsApi } from '../../../../../lib/api';
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

export default function ScriptUploadPage() {
  const router = useRouter();
  const params = useParams();
  const productionId = params.id as string;

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [extractElements, setExtractElements] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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
    // Auto-fill title from filename without extension
    if (!title) {
      setTitle(selected.name.replace(/\.(pdf|fdx)$/i, ''));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    // Validate episode fields: both or neither
    const hasEpNum = episodeNumber.trim() !== '';
    const hasEpTitle = episodeTitle.trim() !== '';
    if (hasEpNum !== hasEpTitle) {
      setError('Episode number and episode title must both be provided or both left empty');
      return;
    }
    if (hasEpNum) {
      const parsed = parseInt(episodeNumber, 10);
      if (isNaN(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
        setError('Episode number must be a positive integer');
        return;
      }
    }

    setError('');
    setIsUploading(true);

    try {
      const contentType = getContentType(file.name);

      // Step 1: Get presigned URL
      const { uploadUrl, s3Key } = await scriptsApi.getUploadUrl(file.name, contentType);

      // Step 2: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Step 3: Create script record
      const { script } = await scriptsApi.create(productionId, {
        title: title || file.name.replace(/\.(pdf|fdx)$/i, ''),
        fileName: file.name,
        s3Key,
        extractElements,
        ...(hasEpNum ? { episodeNumber: parseInt(episodeNumber, 10), episodeTitle: episodeTitle.trim() } : {}),
      });

      router.push(`/productions/${productionId}/scripts/${script.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  const isFdxFile = file && isFdx(file.name);

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-2xl">Upload Script</h1>

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
          {file && (
            <p className="mt-2 text-xs font-mono">
              Automatic element tagging on PDF import is beta and may produce false positives. FDX
              import extracts characters and locations directly from Final Draft&apos;s structure and
              tagger tags for much more accurate results.
            </p>
          )}
          {file && (
            <div className="mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={extractElements}
                  onChange={(e) => setExtractElements(e.target.checked)}
                  className="w-4 h-4"
                />
                Extract elements using AI
              </label>
              {extractElements && isFdxFile && (
                <p className="mt-1 text-xs font-mono font-bold">
                  Only check this if you haven&apos;t tagged elements using Final Draft&apos;s
                  Tagger feature, as it may create duplicate elements.
                </p>
              )}
            </div>
          )}
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

        <div className="flex gap-3">
          <div className="w-1/3">
            <label htmlFor="episode-number" className="block text-sm">
              Episode Number
            </label>
            <input
              id="episode-number"
              type="number"
              min="1"
              value={episodeNumber}
              onChange={(e) => setEpisodeNumber(e.target.value)}
              placeholder="#"
              className="mt-1 w-full border-2 border-black p-2"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="episode-title" className="block text-sm">
              Episode Title
            </label>
            <input
              id="episode-title"
              type="text"
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              placeholder="Optional"
              maxLength={200}
              className="mt-1 w-full border-2 border-black p-2"
            />
          </div>
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
