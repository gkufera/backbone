import type {
  Production,
  ProductionMember,
  Department,
  Script,
  Element,
  Option,
  Approval,
  RevisionMatch,
  Notification,
} from '@backbone/shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

/** Convert Date fields to string for JSON API responses */
type JsonSerialized<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    emailNotificationsEnabled: boolean;
    createdAt: string;
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.error ?? `Request failed with status ${res.status}`,
      res.status,
      body.code,
    );
  }

  return res.json() as Promise<T>;
}

export type ProductionResponse = JsonSerialized<Production> & {
  memberRole?: string;
};

export interface ProductionDetailResponse extends ProductionResponse {
  members: Array<MemberResponse & { user: { id: string; name: string; email: string } }>;
  scripts: Array<Pick<ScriptResponse, 'id' | 'title' | 'fileName' | 'status' | 'createdAt'>>;
  departments?: DepartmentResponse[];
}

export type MemberResponse = JsonSerialized<
  Pick<ProductionMember, 'id' | 'productionId' | 'userId' | 'role' | 'title' | 'departmentId'>
> & {
  department?: { id: string; name: string } | null;
};

export type DepartmentResponse = JsonSerialized<Department> & {
  _count?: { members: number };
  color?: string | null;
};

export const productionsApi = {
  create(data: {
    title: string;
    description?: string;
  }): Promise<{ production: ProductionResponse; member: MemberResponse }> {
    return request('/api/productions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  list(): Promise<{ productions: ProductionResponse[] }> {
    return request('/api/productions');
  },

  get(id: string): Promise<{ production: ProductionDetailResponse }> {
    return request(`/api/productions/${id}`);
  },

  update(id: string, data: { title: string }): Promise<{ production: ProductionResponse }> {
    return request(`/api/productions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  addMember(
    productionId: string,
    email: string,
    title?: string,
  ): Promise<{ member: MemberResponse }> {
    return request(`/api/productions/${productionId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, title: title || undefined }),
    });
  },

  listMembers(productionId: string): Promise<{
    members: Array<MemberResponse & { user: { id: string; name: string; email: string } }>;
  }> {
    return request(`/api/productions/${productionId}/members`);
  },

  removeMember(productionId: string, memberId: string): Promise<{ message: string }> {
    return request(`/api/productions/${productionId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  updateMemberRole(
    productionId: string,
    memberId: string,
    role: string,
  ): Promise<{ member: MemberResponse }> {
    return request(`/api/productions/${productionId}/members/${memberId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  updateMemberDepartment(
    productionId: string,
    memberId: string,
    departmentId: string | null,
  ): Promise<{ member: MemberResponse }> {
    return request(`/api/productions/${productionId}/members/${memberId}/department`, {
      method: 'PATCH',
      body: JSON.stringify({ departmentId }),
    });
  },

  getElementStats(
    productionId: string,
  ): Promise<{ pending: number; outstanding: number; approved: number; total: number }> {
    return request(`/api/productions/${productionId}/element-stats`);
  },
};

export const departmentsApi = {
  list(productionId: string): Promise<{ departments: DepartmentResponse[] }> {
    return request(`/api/productions/${productionId}/departments`);
  },

  create(productionId: string, name: string): Promise<{ department: DepartmentResponse }> {
    return request(`/api/productions/${productionId}/departments`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  delete(productionId: string, departmentId: string): Promise<{ message: string }> {
    return request(`/api/productions/${productionId}/departments/${departmentId}`, {
      method: 'DELETE',
    });
  },

  update(
    productionId: string,
    departmentId: string,
    data: { name?: string; color?: string | null },
  ): Promise<{ department: DepartmentResponse }> {
    return request(`/api/productions/${productionId}/departments/${departmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export type ScriptResponse = JsonSerialized<Script> & {
  sceneData?: Array<{ sceneNumber: number; location: string; characters: string[] }> | null;
};

export const scriptsApi = {
  getUploadUrl(
    fileName: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    return request('/api/scripts/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    });
  },

  create(
    productionId: string,
    data: { title: string; fileName: string; s3Key: string },
  ): Promise<{ script: ScriptResponse }> {
    return request(`/api/productions/${productionId}/scripts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  list(productionId: string): Promise<{ scripts: ScriptResponse[] }> {
    return request(`/api/productions/${productionId}/scripts`);
  },

  get(
    productionId: string,
    scriptId: string,
  ): Promise<{ script: ScriptResponse & { elements: ElementWithCountResponse[] } }> {
    return request(`/api/productions/${productionId}/scripts/${scriptId}`);
  },

  uploadRevision(
    productionId: string,
    scriptId: string,
    data: { title: string; fileName: string; s3Key: string },
  ): Promise<{ script: ScriptResponse }> {
    return request(`/api/productions/${productionId}/scripts/${scriptId}/revisions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getDownloadUrl(scriptId: string): Promise<{ downloadUrl: string }> {
    return request(`/api/scripts/${scriptId}/download-url`);
  },

  getVersions(
    productionId: string,
    scriptId: string,
  ): Promise<{
    versions: Array<
      Pick<ScriptResponse, 'id' | 'title' | 'version' | 'status' | 'pageCount' | 'createdAt'> & {
        parentScriptId: string | null;
      }
    >;
  }> {
    return request(`/api/productions/${productionId}/scripts/${scriptId}/versions`);
  },

  getProcessingStatus(
    scriptId: string,
  ): Promise<{ status: string; progress: { percent: number; step: string } | null }> {
    return request(`/api/scripts/${scriptId}/processing-status`);
  },

  acceptElements(scriptId: string): Promise<{ message: string }> {
    return request(`/api/scripts/${scriptId}/accept-elements`, { method: 'POST' });
  },

  generateImplied(
    scriptId: string,
    mode: 'per-scene' | 'per-character',
  ): Promise<{ message: string; count: number }> {
    return request(`/api/scripts/${scriptId}/generate-implied`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },
};

export type ElementResponse = JsonSerialized<Element>;

export type ElementWithCountResponse = ElementResponse & {
  _count?: { options: number };
  department?: { id: string; name: string; color: string | null } | null;
  approvalTemperature?: 'green' | 'yellow' | 'red' | null;
};

export const elementsApi = {
  list(scriptId: string, includeArchived = false): Promise<{ elements: ElementResponse[] }> {
    const qs = includeArchived ? '?includeArchived=true' : '';
    return request(`/api/scripts/${scriptId}/elements${qs}`);
  },

  create(
    scriptId: string,
    data: {
      name: string;
      type?: string;
      highlightPage?: number | null;
      highlightText?: string | null;
      departmentId?: string | null;
    },
  ): Promise<{ element: ElementResponse }> {
    return request(`/api/scripts/${scriptId}/elements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(
    elementId: string,
    data: {
      name?: string;
      type?: string;
      status?: string;
      highlightPage?: number | null;
      highlightText?: string | null;
      departmentId?: string | null;
    },
  ): Promise<{ element: ElementResponse }> {
    return request(`/api/elements/${elementId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  hardDelete(elementId: string): Promise<{ message: string }> {
    return request(`/api/elements/${elementId}`, { method: 'DELETE' });
  },
};

export type OptionResponse = JsonSerialized<Option> & {
  uploadedBy?: { id: string; name: string };
};

export const optionsApi = {
  getUploadUrl(
    fileName: string,
    contentType: string,
    thumbnailFileName?: string,
  ): Promise<{
    uploadUrl: string;
    s3Key: string;
    mediaType: string;
    thumbnailUploadUrl?: string;
    thumbnailS3Key?: string;
  }> {
    return request('/api/options/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType, thumbnailFileName }),
    });
  },

  create(
    elementId: string,
    data: {
      mediaType: string;
      description?: string;
      s3Key?: string;
      fileName?: string;
      externalUrl?: string;
      thumbnailS3Key?: string;
    },
  ): Promise<{ option: OptionResponse }> {
    return request(`/api/elements/${elementId}/options`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  list(elementId: string, includeArchived = false): Promise<{ options: OptionResponse[] }> {
    const qs = includeArchived ? '?includeArchived=true' : '';
    return request(`/api/elements/${elementId}/options${qs}`);
  },

  update(
    optionId: string,
    data: { description?: string; readyForReview?: boolean; status?: string },
  ): Promise<{ option: OptionResponse }> {
    return request(`/api/options/${optionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getDownloadUrl(s3Key: string): Promise<{ downloadUrl: string }> {
    return request(`/api/options/download-url?s3Key=${encodeURIComponent(s3Key)}`);
  },
};

export const authApi = {
  signup(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login(data: { email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  me(): Promise<{ user: AuthResponse['user'] }> {
    return request<{ user: AuthResponse['user'] }>('/api/auth/me');
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  verifyEmail(token: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  resendVerification(email: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  updateMe(data: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
    emailNotificationsEnabled?: boolean;
  }): Promise<{ user: AuthResponse['user'] }> {
    return request<{ user: AuthResponse['user'] }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export type ApprovalResponse = JsonSerialized<Approval> & {
  user?: { id: string; name: string };
};

export type FeedOptionResponse = OptionResponse & {
  approvals: ApprovalResponse[];
};

export type FeedElementResponse = JsonSerialized<Element> & {
  options: FeedOptionResponse[];
};

export const approvalsApi = {
  create(
    optionId: string,
    data: { decision: string; note?: string },
  ): Promise<{ approval: ApprovalResponse }> {
    return request(`/api/options/${optionId}/approvals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  list(optionId: string): Promise<{ approvals: ApprovalResponse[] }> {
    return request(`/api/options/${optionId}/approvals`);
  },

  confirm(approvalId: string): Promise<{ approval: ApprovalResponse }> {
    return request(`/api/approvals/${approvalId}/confirm`, {
      method: 'PATCH',
    });
  },
};

export const feedApi = {
  list(productionId: string): Promise<{ elements: FeedElementResponse[] }> {
    return request(`/api/productions/${productionId}/feed`);
  },
};

export type NoteResponse = {
  id: string;
  content: string;
  userId: string;
  elementId: string | null;
  optionId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string };
};

export const notesApi = {
  listForElement(elementId: string): Promise<{ notes: NoteResponse[] }> {
    return request(`/api/elements/${elementId}/notes`);
  },

  createForElement(
    elementId: string,
    content: string,
  ): Promise<{ note: NoteResponse }> {
    return request(`/api/elements/${elementId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  listForOption(optionId: string): Promise<{ notes: NoteResponse[] }> {
    return request(`/api/options/${optionId}/notes`);
  },

  createForOption(
    optionId: string,
    content: string,
  ): Promise<{ note: NoteResponse }> {
    return request(`/api/options/${optionId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

export type RevisionMatchResponse = JsonSerialized<RevisionMatch> & {
  oldElement?: ElementResponse & {
    _count?: { options: number };
    options?: Array<{
      approvals: Array<{ decision: string }>;
    }>;
  };
};

export const revisionMatchesApi = {
  get(scriptId: string): Promise<{ matches: RevisionMatchResponse[] }> {
    return request(`/api/scripts/${scriptId}/revision-matches`);
  },

  resolve(
    scriptId: string,
    decisions: Array<{
      matchId: string;
      decision: 'map' | 'create_new' | 'keep' | 'archive';
      departmentId?: string | null;
    }>,
  ): Promise<{ message: string }> {
    return request(`/api/scripts/${scriptId}/revision-matches/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decisions }),
    });
  },
};

export interface DirectorNoteResponse {
  id: string;
  scriptId: string;
  sceneNumber: number;
  note: string;
  createdById: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
}

export const directorNotesApi = {
  list(scriptId: string): Promise<{ notes: DirectorNoteResponse[] }> {
    return request(`/api/scripts/${scriptId}/director-notes`);
  },

  create(
    scriptId: string,
    data: { sceneNumber: number; note: string },
  ): Promise<{ note: DirectorNoteResponse }> {
    return request(`/api/scripts/${scriptId}/director-notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(noteId: string, data: { note: string }): Promise<{ note: DirectorNoteResponse }> {
    return request(`/api/director-notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete(noteId: string): Promise<{ message: string }> {
    return request(`/api/director-notes/${noteId}`, {
      method: 'DELETE',
    });
  },
};

export type NotificationResponse = JsonSerialized<Notification>;

export const notificationsApi = {
  list(productionId: string): Promise<{ notifications: NotificationResponse[] }> {
    return request(`/api/productions/${productionId}/notifications`);
  },

  markAsRead(notificationId: string): Promise<{ notification: NotificationResponse }> {
    return request(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  unreadCount(productionId: string): Promise<{ count: number }> {
    return request(`/api/productions/${productionId}/notifications/unread-count`);
  },
};
