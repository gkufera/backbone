export enum ApprovalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MAYBE = 'MAYBE',
}

export interface Approval {
  id: string;
  optionId: string;
  userId: string;
  decision: ApprovalDecision;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}
