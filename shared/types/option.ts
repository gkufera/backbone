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
  s3Key: string | null;
  fileName: string | null;
  externalUrl: string | null;
  thumbnailS3Key: string | null;
  status: OptionStatus;
  readyForReview: boolean;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}
