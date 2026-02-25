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
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateFile(f: File): boolean {
    if (!mediaTypeFromMime(f.type)) {
      setError('Unsupported file type');
      return false;
    }
    return true;
  }

  function addFiles(newFiles: File[]) {
    const valid = newFiles.filter(validateFile);
    if (valid.length > 0) {
      setError(null);
      setFiles((prev) => [...prev, ...valid]);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'link') {
      if (!externalUrl.trim()) return;
      await submitLink();
    } else {
      if (files.length === 0) return;
      await submitFiles();
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

  async function submitFiles() {
    if (files.length === 0) return;

    // Validate all file sizes
    for (const f of files) {
      if (f.size > OPTION_MAX_FILE_SIZE_BYTES) {
        setError('File is too large. Maximum size is 200 MB.');
        return;
      }
    }

    setIsUploading(true);
    try {
      // Upload each file and collect asset metadata
      const assets: Array<{
        s3Key: string;
        fileName: string;
        thumbnailS3Key?: string;
        mediaType: string;
      }> = [];

      for (const file of files) {
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
        const uploadResult = await optionsApi.getUploadUrl(
          file.name,
          file.type,
          thumbnailFileName,
        );

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

        assets.push({
          s3Key: uploadResult.s3Key,
          fileName: file.name,
          thumbnailS3Key,
          mediaType: uploadResult.mediaType,
        });
      }

      // Determine overall option mediaType from first file
      const primaryMediaType = assets[0].mediaType;

      // Create the option record with all assets
      await optionsApi.create(elementId, {
        mediaType: primaryMediaType,
        description: description.trim() || undefined,
        assets,
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
    setFiles([]);
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
        <>
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
              const droppedFiles = Array.from(e.dataTransfer.files);
              if (droppedFiles.length > 0) {
                addFiles(droppedFiles);
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                if (picked.length > 0) {
                  addFiles(picked);
                }
              }}
              accept={OPTION_ALLOWED_CONTENT_TYPES.join(',')}
              className="hidden"
            />
            <span className="text-sm font-mono">
              {files.length === 0
                ? 'Drop file here or click to browse'
                : `${files.length} file${files.length > 1 ? 's' : ''} selected`}
            </span>
          </div>

          {files.length > 0 && (
            <ul className="mb-3 divide-y divide-black border-2 border-black">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-mono">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="btn-text text-xs"
                    aria-label={`Remove ${f.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
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
