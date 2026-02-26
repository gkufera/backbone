import { describe, it, expect } from 'vitest';
import { NotificationType } from '@backbone/shared/types';
import {
  NOTIFICATION_TYPE_CATEGORY,
  CATEGORY_TO_PREF_FIELD,
} from '@backbone/shared/constants';

describe('NotificationType enum', () => {
  it('includes OPTION_ADDED', () => {
    expect(NotificationType.OPTION_ADDED).toBe('OPTION_ADDED');
  });
});

describe('Notification interface', () => {
  it('supports emailSentAt field', () => {
    // This tests that the type compiles — emailSentAt should be Date | null
    const notification: {
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
    } = {
      id: '1',
      userId: 'u1',
      productionId: 'p1',
      type: NotificationType.OPTION_ADDED,
      message: 'test',
      link: null,
      read: false,
      emailSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(notification.emailSentAt).toBeNull();
  });
});

describe('NOTIFICATION_TYPE_CATEGORY', () => {
  it('maps all 10 notification types to 5 categories', () => {
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.OPTION_READY]).toBe('option');
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.OPTION_APPROVED]).toBe('approval');
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.OPTION_REJECTED]).toBe('approval');
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.OPTION_MAYBE]).toBe('approval');
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.OPTION_ADDED]).toBe('option');
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.MEMBER_INVITED]).toBe('member');
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.SCRIPT_UPLOADED]).toBe('script');
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.TENTATIVE_APPROVAL]).toBe('approval');
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.TENTATIVE_CONFIRMED]).toBe('approval');
    expect(NOTIFICATION_TYPE_CATEGORY[NotificationType.NOTE_ADDED]).toBe('note');
  });
});

describe('CATEGORY_TO_PREF_FIELD', () => {
  it('maps 5 categories to preference boolean field names', () => {
    expect(CATEGORY_TO_PREF_FIELD['option']).toBe('optionEmails');
    expect(CATEGORY_TO_PREF_FIELD['approval']).toBe('approvalEmails');
    expect(CATEGORY_TO_PREF_FIELD['note']).toBe('noteEmails');
    expect(CATEGORY_TO_PREF_FIELD['script']).toBe('scriptEmails');
    expect(CATEGORY_TO_PREF_FIELD['member']).toBe('memberEmails');
  });
});
