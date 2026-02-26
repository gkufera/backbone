import { NotificationType } from '../types/notification';

export const NOTIFICATION_MESSAGE_MAX_LENGTH = 500;

export type NotificationCategory = 'option' | 'note' | 'approval' | 'script' | 'member';

export const NOTIFICATION_TYPE_CATEGORY: Record<NotificationType, NotificationCategory> = {
  [NotificationType.OPTION_READY]: 'option',
  [NotificationType.OPTION_ADDED]: 'option',
  [NotificationType.OPTION_APPROVED]: 'approval',
  [NotificationType.OPTION_REJECTED]: 'approval',
  [NotificationType.OPTION_MAYBE]: 'approval',
  [NotificationType.TENTATIVE_APPROVAL]: 'approval',
  [NotificationType.TENTATIVE_CONFIRMED]: 'approval',
  [NotificationType.NOTE_ADDED]: 'note',
  [NotificationType.SCRIPT_UPLOADED]: 'script',
  [NotificationType.MEMBER_INVITED]: 'member',
};

export const CATEGORY_TO_PREF_FIELD: Record<NotificationCategory, string> = {
  option: 'optionEmails',
  approval: 'approvalEmails',
  note: 'noteEmails',
  script: 'scriptEmails',
  member: 'memberEmails',
};
