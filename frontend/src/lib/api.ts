import type { Production, ProductionMember, Script, Element, Option } from '@backbone/shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

/** Convert Date fields to string for JSON API responses */
type JsonSerialized<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    departmentId: string | null;
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
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export type ProductionResponse = JsonSerialized<Production> & {
  memberRole?: string;
};

export interface ProductionDetailResponse extends ProductionResponse {
  members: Array<MemberResponse & { user: { id: string; name: string; email: string } }>;
  scripts: Array<Pick<ScriptResponse, 'id' | 'title' | 'fileName' | 'status' | 'createdAt'>>;
}

export type MemberResponse = JsonSerialized<
  Pick<ProductionMember, 'id' | 'productionId' | 'userId' | 'role'>
>;

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

  addMember(productionId: string, email: string): Promise<{ member: MemberResponse }> {
    return request(`/api/productions/${productionId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
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
};

export type ScriptResponse = JsonSerialized<Script>;

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
  ): Promise<{ script: ScriptResponse & { elements: ElementResponse[] } }> {
    return request(`/api/productions/${productionId}/scripts/${scriptId}`);
  },
};

export type ElementResponse = JsonSerialized<Element>;

export const elementsApi = {
  list(scriptId: string, includeArchived = false): Promise<{ elements: ElementResponse[] }> {
    const qs = includeArchived ? '?includeArchived=true' : '';
    return request(`/api/scripts/${scriptId}/elements${qs}`);
  },

  create(
    scriptId: string,
    data: { name: string; type?: string; pageNumbers?: number[] },
  ): Promise<{ element: ElementResponse }> {
    return request(`/api/scripts/${scriptId}/elements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(
    elementId: string,
    data: { name?: string; type?: string; status?: string; pageNumbers?: number[] },
  ): Promise<{ element: ElementResponse }> {
    return request(`/api/elements/${elementId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
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
  signup(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/signup', {
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
};
