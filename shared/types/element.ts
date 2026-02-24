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

export enum ElementWorkflowState {
  PENDING = 'PENDING',
  OUTSTANDING = 'OUTSTANDING',
  APPROVED = 'APPROVED',
}

export interface Element {
  id: string;
  scriptId: string;
  name: string;
  type: ElementType;
  highlightPage: number | null;
  highlightText: string | null;
  departmentId: string | null;
  status: ElementStatus;
  source: ElementSource;
  workflowState: ElementWorkflowState;
  createdAt: Date;
  updatedAt: Date;
}
