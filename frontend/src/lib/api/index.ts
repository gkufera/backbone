// Barrel re-export — all existing imports from '../lib/api' continue to work
export { ApiError, request } from './client';
export type { JsonSerialized } from './client';

export { authApi } from './auth';

export { productionsApi } from './productions';
export type { ProductionResponse, ProductionDetailResponse, MemberResponse } from './productions';

export { departmentsApi } from './departments';
export type { DepartmentResponse } from './departments';

export { scriptsApi } from './scripts';
export type { ScriptResponse } from './scripts';

export { elementsApi } from './elements';
export type { ElementResponse, ElementWithCountResponse } from './elements';

export { optionsApi } from './options';
export type { OptionResponse, OptionAssetResponse } from './options';

export { approvalsApi, feedApi } from './approvals';
export type { ApprovalResponse, FeedOptionResponse, FeedElementResponse } from './approvals';

export { notesApi } from './notes';
export type { NoteResponse, NoteAttachmentResponse } from './notes';

export { directorNotesApi } from './director-notes';
export type { DirectorNoteResponse } from './director-notes';

export { notificationsApi, notificationPreferencesApi } from './notifications';
export type { NotificationResponse, NotificationPreferenceResponse } from './notifications';

export { revisionMatchesApi } from './revision-matches';
export type { RevisionMatchResponse } from './revision-matches';
