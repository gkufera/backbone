export enum ElementType {
  CHARACTER = 'CHARACTER',
  LOCATION = 'LOCATION',
  OTHER = 'OTHER',
}

export enum ElementStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ElementSource {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export interface Element {
  id: string;
  scriptId: string;
  name: string;
  type: ElementType;
  pageNumbers: number[];
  status: ElementStatus;
  source: ElementSource;
  createdAt: Date;
  updatedAt: Date;
}
