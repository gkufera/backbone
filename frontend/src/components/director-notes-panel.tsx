'use client';

import { useState, useEffect } from 'react';
import { directorNotesApi, type DirectorNoteResponse } from '../lib/api';
import type { SceneInfo } from '@backbone/shared/types';

interface DirectorNotesPanelProps {
  scriptId: string;
  sceneData: SceneInfo[];
  userRole: string;
  userId: string;
}

export function DirectorNotesPanel({
  scriptId,
  sceneData,
  userRole,
  userId,
}: DirectorNotesPanelProps) {
  const [notes, setNotes] = useState<DirectorNoteResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingForScene, setAddingForScene] = useState<number | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  const isDecider = userRole === 'DECIDER';

  useEffect(() => {
    directorNotesApi
      .list(scriptId)
      .then((data) => setNotes(data.notes))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [scriptId]);

  // Group notes by scene number
  const notesByScene = new Map<number, DirectorNoteResponse[]>();
  for (const note of notes) {
    const existing = notesByScene.get(note.sceneNumber) || [];
    existing.push(note);
    notesByScene.set(note.sceneNumber, existing);
  }

  async function handleCreate(sceneNumber: number) {
    if (!newNoteText.trim()) return;

    try {
      const { note: created } = await directorNotesApi.create(scriptId, {
        sceneNumber,
        note: newNoteText.trim(),
      });
      setNotes((prev) => [...prev, created]);
      setNewNoteText('');
      setAddingForScene(null);
    } catch {
      // Error handling omitted for simplicity
    }
  }

  async function handleUpdate(noteId: string) {
    if (!editNoteText.trim()) return;

    try {
      const { note: updated } = await directorNotesApi.update(noteId, {
        note: editNoteText.trim(),
      });
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, note: updated.note } : n)));
      setEditingNoteId(null);
      setEditNoteText('');
    } catch {
      // Error handling omitted for simplicity
    }
  }

  async function handleDelete(noteId: string) {
    try {
      await directorNotesApi.delete(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      // Error handling omitted for simplicity
    }
  }

  if (isLoading) {
    return <div className="p-4">Loading notes...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Director&apos;s Notes</h2>

      <ul className="divide-y divide-black">
        {sceneData.map((scene) => {
          const sceneNotes = notesByScene.get(scene.sceneNumber) || [];

          return (
            <li key={scene.sceneNumber} className="py-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm">
                  Scene {scene.sceneNumber}: {scene.location}
                </h3>
                {isDecider && (
                  <button
                    onClick={() => {
                      setAddingForScene(scene.sceneNumber);
                      setNewNoteText('');
                    }}
                    className="text-xs underline"
                    aria-label={`Add note for scene ${scene.sceneNumber}`}
                  >
                    Add Note
                  </button>
                )}
              </div>

              {sceneNotes.length > 0 && (
                <ul className="ml-4 space-y-2">
                  {sceneNotes.map((note) => (
                    <li key={note.id} className="border-l-2 border-black pl-3">
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            className="w-full border-2 border-black p-2 text-sm"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(note.id)}
                              className="mac-btn-primary px-2 py-1 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="mac-btn-secondary px-2 py-1 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-mono text-sm">{note.note}</p>
                          <span className="font-mono text-xs">
                            — {note.createdBy?.name ?? 'Unknown'}
                          </span>
                          {note.createdById === userId && (
                            <span className="ml-2">
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditNoteText(note.note);
                                }}
                                className="btn-text text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(note.id)}
                                className="btn-text text-xs ml-2"
                              >
                                Delete
                              </button>
                            </span>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {addingForScene === scene.sceneNumber && (
                <div className="mt-2 ml-4 space-y-2">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Director's note..."
                    className="w-full border-2 border-black p-2 text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCreate(scene.sceneNumber)}
                      className="mac-btn-primary px-2 py-1 text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setAddingForScene(null)}
                      className="mac-btn-secondary px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
