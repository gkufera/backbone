'use client';

import { useState, useRef } from 'react';
import { optionsApi } from '../lib/api';
import { generateImageThumbnail, generateVideoThumbnail } from '../lib/thumbnail';
import {
  OPTION_ALLOWED_CONTENT_TYPES,
  OPTION_MAX_FILE_SIZE_BYTES,
  mediaTypeFromMime,
} from '@backbone/shared/constants';
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (file.size > OPTION_MAX_FILE_SIZE_BYTES) {
      setError('File is too large. Maximum size is 200 MB.');
      return;
    }

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
      const uploadResponse = await fetch(uploadResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Upload thumbnail if generated
      let thumbnailS3Key: string | undefined;
      if (thumbnailBlob && uploadResult.thumbnailUploadUrl && uploadResult.thumbnailS3Key) {
        const thumbResponse = await fetch(uploadResult.thumbnailUploadUrl, {
          method: 'PUT',
          body: thumbnailBlob,
          headers: { 'Content-Type': 'image/jpeg' },
        });
        if (thumbResponse.ok) {
          thumbnailS3Key = uploadResult.thumbnailS3Key;
        }
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
    <form onSubmit={handleSubmit} className="border-2 border-black p-4">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`px-3 py-1 text-sm ${
            mode === 'file' ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          File
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`px-3 py-1 text-sm ${
            mode === 'link' ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          Link
        </button>
      </div>

      {mode === 'file' ? (
        <div
          className={`mb-3 border-2 border-dashed border-black p-6 text-center cursor-pointer ${
            isDragging ? 'bg-black text-white' : 'bg-white text-black'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) {
              if (!mediaTypeFromMime(droppedFile.type)) {
                setError('Unsupported file type');
                return;
              }
              setError(null);
              setFile(droppedFile);
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              if (picked && !mediaTypeFromMime(picked.type)) {
                setError('Unsupported file type');
                return;
              }
              setError(null);
              setFile(picked);
            }}
            accept={OPTION_ALLOWED_CONTENT_TYPES.join(',')}
            className="hidden"
          />
          <span className="text-sm font-mono">
            {file ? file.name : 'Drop file here or click to browse'}
          </span>
        </div>
      ) : (
        <input
          type="url"
          placeholder="Enter URL"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          className="mb-3 w-full border-2 border-black p-2 text-sm"
        />
      )}

      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-3 w-full border-2 border-black p-2 text-sm"
        maxLength={500}
      />

      {error && <p className="mb-3 text-sm text-black font-bold">{error}</p>}

      <button
        type="submit"
        disabled={isUploading}
        className="mac-btn-primary disabled:opacity-50"
      >
        {isUploading ? 'Uploading...' : 'Add Option'}
      </button>
    </form>
  );
}
