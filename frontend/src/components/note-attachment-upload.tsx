'use client';

import { useRef } from 'react';
import { NOTE_MAX_ATTACHMENTS } from '@backbone/shared/constants';
import { OPTION_ALLOWED_CONTENT_TYPES } from '@backbone/shared/constants';

interface NoteAttachmentUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export function NoteAttachmentUpload({ files, onChange }: NoteAttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles = [...files];
    for (let i = 0; i < selected.length; i++) {
      if (newFiles.length >= NOTE_MAX_ATTACHMENTS) break;
      newFiles.push(selected[i]);
    }
    onChange(newFiles);

    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleRemove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  const atMax = files.length >= NOTE_MAX_ATTACHMENTS;

  return (
    <div>
      {files.length > 0 && (
        <div className="mb-1">
          <span className="text-xs font-mono">{files.length} / {NOTE_MAX_ATTACHMENTS}</span>
          <ul className="mt-1 space-y-1">
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`} data-testid="attachment-item" className="flex items-center gap-2 text-xs font-mono">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="btn-text text-xs"
                  aria-label={`Remove ${file.name}`}
                >
                  X
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!atMax && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={OPTION_ALLOWED_CONTENT_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-2 py-1 text-xs border-2 border-black hover:bg-black hover:text-white"
          >
            ATTACH
          </button>
        </>
      )}
    </div>
  );
}
