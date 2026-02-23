export enum ScriptStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  ERROR = 'ERROR',
}

export interface Script {
  id: string;
  productionId: string;
  title: string;
  fileName: string;
  s3Key: string;
  pageCount: number | null;
  status: ScriptStatus;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}
