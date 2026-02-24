export enum MemberRole {
  ADMIN = 'ADMIN',
  DECIDER = 'DECIDER',
  MEMBER = 'MEMBER',
}

export interface Production {
  id: string;
  title: string;
  description: string | null;
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
