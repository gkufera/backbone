export enum ProductionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
}

export enum MemberRole {
  ADMIN = 'ADMIN',
  DECIDER = 'DECIDER',
  MEMBER = 'MEMBER',
}

export interface Production {
  id: string;
  title: string;
  description: string | null;
  status: ProductionStatus;
  studioName: string | null;
  budget: string | null;
  contactName: string | null;
  contactEmail: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionMember {
  id: string;
  productionId: string;
  userId: string;
  role: MemberRole;
  title: string | null;
  departmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  productionId: string;
  name: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}
