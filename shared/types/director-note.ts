export interface DirectorNote {
  id: string;
  scriptId: string;
  sceneNumber: number;
  note: string;
  createdById: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
