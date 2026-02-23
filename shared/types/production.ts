export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
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
  createdAt: Date;
  updatedAt: Date;
}
