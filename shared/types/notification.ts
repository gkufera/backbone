export enum NotificationType {
  OPTION_READY = 'OPTION_READY',
  OPTION_APPROVED = 'OPTION_APPROVED',
  OPTION_REJECTED = 'OPTION_REJECTED',
  OPTION_MAYBE = 'OPTION_MAYBE',
  MEMBER_INVITED = 'MEMBER_INVITED',
  SCRIPT_UPLOADED = 'SCRIPT_UPLOADED',
}

export interface Notification {
  id: string;
  userId: string;
  productionId: string;
  type: NotificationType;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}
