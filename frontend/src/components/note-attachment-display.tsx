'use client';

import { useState, useEffect } from 'react';
import { notesApi } from '../lib/api';

interface NoteAttachmentDisplayProps {
  s3Key: string;
  fileName: string;
  mediaType: string;
}

export function NoteAttachmentDisplay({ s3Key, fileName, mediaType }: NoteAttachmentDisplayProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    notesApi
      .getNoteAttachmentDownloadUrl(s3Key)
      .then(({ downloadUrl }) => {
        if (!cancelled) setUrl(downloadUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [s3Key]);

  if (!url) {
    return <span className="font-mono text-xs">{fileName}</span>;
  }

  switch (mediaType) {
    case 'IMAGE':
      return (
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-48 border-2 border-black"
        />
      );
    case 'VIDEO':
      return (
        <video
          src={url}
          controls
          data-testid="note-attachment-video"
          className="max-w-full max-h-48 border-2 border-black"
        >
          <track kind="captions" />
        </video>
      );
    case 'AUDIO':
      return (
        <audio
          src={url}
          controls
          data-testid="note-attachment-audio"
          className="w-full"
        />
      );
    default:
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs underline"
        >
          {fileName}
        </a>
      );
  }
}
