import { Role } from '../types/user.js';

export const ROLES = [Role.DIRECTOR, Role.DEPARTMENT_HEAD, Role.CONTRIBUTOR, Role.ASSISTANT] as const;

export const ROLE_LABELS: Record<Role, string> = {
  [Role.DIRECTOR]: 'Director',
  [Role.DEPARTMENT_HEAD]: 'Department Head',
  [Role.CONTRIBUTOR]: 'Contributor',
  [Role.ASSISTANT]: 'Assistant',
};
