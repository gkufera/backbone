export interface Note {
  id: string;
  content: string;
  userId: string;
  elementId: string | null;
  optionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  s3Key: string;
  fileName: string;
  mediaType: string;
  createdAt: Date;
}

export interface NoteAttachmentInput {
  s3Key: string;
  fileName: string;
  mediaType: string;
}
