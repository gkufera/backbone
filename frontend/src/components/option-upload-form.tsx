'use client';

import { useState } from 'react';
import { optionsApi } from '../lib/api';
import { generateImageThumbnail, generateVideoThumbnail } from '../lib/thumbnail';
import { OPTION_ALLOWED_CONTENT_TYPES, mediaTypeFromMime } from '@backbone/shared/constants';
import { MediaType } from '@backbone/shared/types';

interface OptionUploadFormProps {
  elementId: string;
  onOptionCreated: () => void;
}

type Mode = 'file' | 'link';

export function OptionUploadForm({ elementId, onOptionCreated }: OptionUploadFormProps) {
  const [mode, setMode] = useState<Mode>('file');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'link') {
      if (!externalUrl.trim()) return;
      await submitLink();
    } else {
      if (!file) return;
      await submitFile();
    }
  }

  async function submitLink() {
    setIsUploading(true);
    try {
      await optionsApi.create(elementId, {
        mediaType: MediaType.LINK,
        description: description.trim() || undefined,
        externalUrl: externalUrl.trim(),
      });
      onOptionCreated();
      resetForm();
    } catch {
      setError('Failed to create option');
    } finally {
      setIsUploading(false);
    }
  }

  async function submitFile() {
    if (!file) return;
    setIsUploading(true);
    try {
      const mediaType = mediaTypeFromMime(file.type);
      if (!mediaType) {
        setError('Unsupported file type');
        setIsUploading(false);
        return;
      }

      // Generate thumbnail for images and videos (non-blocking)
      let thumbnailFileName: string | undefined;
      let thumbnailBlob: Blob | undefined;
      try {
        if (mediaType === MediaType.IMAGE) {
          thumbnailBlob = await generateImageThumbnail(file);
          thumbnailFileName = `thumb_${file.name}`;
        } else if (mediaType === MediaType.VIDEO) {
          thumbnailBlob = await generateVideoThumbnail(file);
          thumbnailFileName = `thumb_${file.name}.jpg`;
        }
      } catch {
        // Thumbnail generation failed — proceed without thumbnail
      }

      // Get presigned upload URL
      const uploadResult = await optionsApi.getUploadUrl(file.name, file.type, thumbnailFileName);

      // Upload file to S3
      await fetch(uploadResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // Upload thumbnail if generated
      let thumbnailS3Key: string | undefined;
      if (thumbnailBlob && uploadResult.thumbnailUploadUrl && uploadResult.thumbnailS3Key) {
        await fetch(uploadResult.thumbnailUploadUrl, {
          method: 'PUT',
          body: thumbnailBlob,
          headers: { 'Content-Type': 'image/jpeg' },
        });
        thumbnailS3Key = uploadResult.thumbnailS3Key;
      }

      // Create the option record
      await optionsApi.create(elementId, {
        mediaType: uploadResult.mediaType,
        description: description.trim() || undefined,
        s3Key: uploadResult.s3Key,
        fileName: file.name,
        thumbnailS3Key,
      });

      onOptionCreated();
      resetForm();
    } catch {
      setError('Failed to upload option');
    } finally {
      setIsUploading(false);
    }
  }

  function resetForm() {
    setDescription('');
    setExternalUrl('');
    setFile(null);
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded border p-4">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`rounded px-3 py-1 text-sm ${
            mode === 'file' ? 'bg-black text-white' : 'bg-zinc-100'
          }`}
        >
          File
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`rounded px-3 py-1 text-sm ${
            mode === 'link' ? 'bg-black text-white' : 'bg-zinc-100'
          }`}
        >
          Link
        </button>
      </div>

      {mode === 'file' ? (
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          accept={OPTION_ALLOWED_CONTENT_TYPES.join(',')}
          className="mb-3 block w-full text-sm"
        />
      ) : (
        <input
          type="url"
          placeholder="Enter URL"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          className="mb-3 w-full rounded border p-2 text-sm"
        />
      )}

      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-3 w-full rounded border p-2 text-sm"
        maxLength={500}
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isUploading}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {isUploading ? 'Uploading...' : 'Add Option'}
      </button>
    </form>
  );
}
