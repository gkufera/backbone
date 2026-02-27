'use client';

import { useState, useEffect } from 'react';
import { notesApi, optionsApi, type NoteResponse } from '../lib/api';
import { mediaTypeFromMime } from '@backbone/shared/constants';
import { NoteAttachmentDisplay } from './note-attachment-display';
import { NoteAttachmentUpload } from './note-attachment-upload';

interface OptionNotesProps {
  optionId: string;
  productionId: string;
  composerName?: string;
  composerDepartment?: string;
}

export function OptionNotes({ optionId, productionId, composerName, composerDepartment }: OptionNotesProps) {
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [content, setContent] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, [optionId]);

  async function loadNotes() {
    try {
      const { notes: fetched } = await notesApi.listForOption(optionId);
      setNotes(fetched);
    } catch {
      // silently fail — notes are supplementary
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed && attachmentFiles.length === 0) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Upload files to S3 first
      let attachmentRefs: Array<{ s3Key: string; fileName: string; mediaType: string }> | undefined;

      if (attachmentFiles.length > 0) {
        attachmentRefs = [];
        for (const file of attachmentFiles) {
          const { uploadUrl, s3Key, mediaType } = await optionsApi.getUploadUrl(
            file.name,
            file.type,
            productionId,
          );

          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed for ${file.name} (${uploadResponse.status})`);
          }

          attachmentRefs.push({
            s3Key,
            fileName: file.name,
            mediaType: mediaType || mediaTypeFromMime(file.type) || 'PDF',
          });
        }
      }

      await notesApi.createForOption(optionId, trimmed, attachmentRefs);
      setContent('');
      setAttachmentFiles([]);
      await loadNotes();
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = content.trim().length > 0 || attachmentFiles.length > 0;

  if (isLoading) {
    return <div className="p-3 text-sm font-mono">Loading notes...</div>;
  }

  return (
    <div className="border-t-2 border-black pt-3 mt-3">
      <h4 className="text-sm mb-2">Notes</h4>
      {notes.length === 0 ? (
        <p className="text-sm">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-black mb-3 max-h-60 overflow-y-auto">
          {notes.map((note) => (
            <li key={note.id} className="py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-mono font-bold">
                  {note.user?.name ?? 'Unknown'}
                  {note.department && (
                    <span className="font-mono font-normal"> ({note.department})</span>
                  )}
                </span>
                <span className="text-xs font-mono">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>
              {note.content && <p className="text-sm mt-1">{note.content}</p>}
              {note.attachments && note.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {note.attachments.map((att) => (
                    <NoteAttachmentDisplay
                      key={att.id}
                      s3Key={att.s3Key}
                      fileName={att.fileName}
                      mediaType={att.mediaType}
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {composerName && (
        <p className="text-xs font-mono mb-1">
          Posting as: <span className="font-bold">{composerName}</span>
          {composerDepartment && ` (${composerDepartment})`}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 p-2 text-sm"
          />
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="px-3 py-1 text-sm disabled:opacity-50"
            aria-label="Send"
          >
            {isSubmitting ? '...' : 'SEND'}
          </button>
        </div>
        <NoteAttachmentUpload
          files={attachmentFiles}
          onChange={setAttachmentFiles}
        />
      </form>
    </div>
  );
}
