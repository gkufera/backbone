'use client';

import { useState, useEffect } from 'react';
import { notesApi, type NoteResponse } from '../lib/api';

interface OptionNotesProps {
  optionId: string;
}

export function OptionNotes({ optionId }: OptionNotesProps) {
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [content, setContent] = useState('');
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
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await notesApi.createForOption(optionId, content.trim());
      setContent('');
      await loadNotes();
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="p-3 text-sm font-mono">Loading notes...</div>;
  }

  return (
    <div className="border-t-2 border-black pt-3 mt-3">
      <h4 className="text-sm mb-2">Notes</h4>
      {notes.length === 0 ? (
        <p className="text-sm">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-black mb-3 max-h-40 overflow-y-auto">
          {notes.map((note) => (
            <li key={note.id} className="py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold">
                  {note.user?.name ?? 'Unknown'}
                  {note.department && (
                    <span className="font-mono font-normal"> ({note.department})</span>
                  )}
                </span>
                <span className="text-xs font-mono">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm mt-1">{note.content}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 p-2 text-sm"
        />
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="px-3 py-1 text-sm"
          aria-label="Send"
        >
          SEND
        </button>
      </form>
    </div>
  );
}
