import { request } from './client';

export type NoteAttachmentResponse = {
  id: string;
  noteId: string;
  s3Key: string;
  fileName: string;
  mediaType: string;
  createdAt: string;
};

export type NoteResponse = {
  id: string;
  content: string;
  userId: string;
  elementId: string | null;
  optionId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string };
  department?: string | null;
  attachments?: NoteAttachmentResponse[];
};

export const notesApi = {
  listForElement(elementId: string): Promise<{ notes: NoteResponse[] }> {
    return request(`/api/elements/${elementId}/notes`);
  },

  createForElement(
    elementId: string,
    content: string,
  ): Promise<{ note: NoteResponse }> {
    return request(`/api/elements/${elementId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  listForOption(optionId: string): Promise<{ notes: NoteResponse[] }> {
    return request(`/api/options/${optionId}/notes`);
  },

  createForOption(
    optionId: string,
    content: string,
    attachments?: Array<{ s3Key: string; fileName: string; mediaType: string }>,
  ): Promise<{ note: NoteResponse }> {
    return request(`/api/options/${optionId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, attachments }),
    });
  },

  getNoteAttachmentDownloadUrl(s3Key: string): Promise<{ downloadUrl: string }> {
    return request(`/api/notes/attachment-download-url?s3Key=${encodeURIComponent(s3Key)}`);
  },
};
