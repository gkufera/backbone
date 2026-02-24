export interface Note {
  id: string;
  content: string;
  userId: string;
  elementId: string | null;
  optionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
