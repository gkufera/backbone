export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  PDF = 'PDF',
  LINK = 'LINK',
}

export enum OptionStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface Option {
  id: string;
  elementId: string;
  mediaType: MediaType;
  description: string | null;
  externalUrl: string | null;
  status: OptionStatus;
  readyForReview: boolean;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptionAsset {
  id: string;
  optionId: string;
  s3Key: string;
  fileName: string;
  thumbnailS3Key: string | null;
  mediaType: MediaType;
  sortOrder: number;
  createdAt: Date;
}
