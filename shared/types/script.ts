export enum ScriptStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  REVIEWING = 'REVIEWING',
  READY = 'READY',
  RECONCILING = 'RECONCILING',
  ERROR = 'ERROR',
}

export enum ScriptFormat {
  PDF = 'PDF',
  FDX = 'FDX',
}

export interface SceneInfo {
  sceneNumber: number;
  location: string;
  characters: string[];
}

export interface Script {
  id: string;
  productionId: string;
  title: string;
  fileName: string;
  s3Key: string;
  pageCount: number | null;
  status: ScriptStatus;
  format: ScriptFormat;
  sourceS3Key: string | null;
  version: number;
  parentScriptId: string | null;
  uploadedById: string;
  sceneData: SceneInfo[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum RevisionMatchStatus {
  EXACT = 'EXACT',
  FUZZY = 'FUZZY',
  NEW = 'NEW',
  MISSING = 'MISSING',
}

export enum RevisionMatchDecision {
  MAP = 'map',
  CREATE_NEW = 'create_new',
  KEEP = 'keep',
  ARCHIVE = 'archive',
}

export interface RevisionMatch {
  id: string;
  newScriptId: string;
  detectedName: string;
  detectedType: string;
  detectedPage: number | null;
  detectedHighlightText: string | null;
  matchStatus: RevisionMatchStatus;
  oldElementId: string | null;
  similarity: number | null;
  userDecision: string | null;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
