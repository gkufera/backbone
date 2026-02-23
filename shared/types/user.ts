export enum Role {
  DIRECTOR = 'DIRECTOR',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  CONTRIBUTOR = 'CONTRIBUTOR',
  ASSISTANT = 'ASSISTANT',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
