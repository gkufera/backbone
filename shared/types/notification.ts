export enum NotificationType {
  OPTION_READY = 'OPTION_READY',
  OPTION_APPROVED = 'OPTION_APPROVED',
  OPTION_REJECTED = 'OPTION_REJECTED',
  OPTION_MAYBE = 'OPTION_MAYBE',
  OPTION_ADDED = 'OPTION_ADDED',
  MEMBER_INVITED = 'MEMBER_INVITED',
  SCRIPT_UPLOADED = 'SCRIPT_UPLOADED',
  TENTATIVE_APPROVAL = 'TENTATIVE_APPROVAL',
  TENTATIVE_CONFIRMED = 'TENTATIVE_CONFIRMED',
  NOTE_ADDED = 'NOTE_ADDED',
}

export interface Notification {
  id: string;
  userId: string;
  productionId: string;
  type: NotificationType;
  message: string;
  link: string | null;
  read: boolean;
  emailSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum ScopeFilter {
  ALL = 'ALL',
  MY_DEPARTMENT = 'MY_DEPARTMENT',
}

export interface NotificationPreference {
  id: string;
  userId: string;
  productionId: string;
  optionEmails: boolean;
  noteEmails: boolean;
  approvalEmails: boolean;
  scriptEmails: boolean;
  memberEmails: boolean;
  scopeFilter: ScopeFilter;
  createdAt: Date;
  updatedAt: Date;
}
