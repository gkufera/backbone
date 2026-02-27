import { request } from './client';

export interface DirectorNoteResponse {
  id: string;
  scriptId: string;
  sceneNumber: number;
  note: string;
  createdById: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
}

export const directorNotesApi = {
  list(scriptId: string): Promise<{ notes: DirectorNoteResponse[] }> {
    return request(`/api/scripts/${scriptId}/director-notes`);
  },

  create(
    scriptId: string,
    data: { sceneNumber: number; note: string },
  ): Promise<{ note: DirectorNoteResponse }> {
    return request(`/api/scripts/${scriptId}/director-notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(noteId: string, data: { note: string }): Promise<{ note: DirectorNoteResponse }> {
    return request(`/api/director-notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete(noteId: string): Promise<{ message: string }> {
    return request(`/api/director-notes/${noteId}`, {
      method: 'DELETE',
    });
  },
};
