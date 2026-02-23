const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

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

export interface ProductionResponse {
  id: string;
  title: string;
  description: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  memberRole?: string;
}

export interface ProductionDetailResponse extends ProductionResponse {
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: { id: string; name: string; email: string };
  }>;
  scripts: Array<{
    id: string;
    title: string;
    fileName: string;
    status: string;
    createdAt: string;
  }>;
}

export interface MemberResponse {
  id: string;
  productionId: string;
  userId: string;
  role: string;
}

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

export interface ScriptResponse {
  id: string;
  productionId: string;
  title: string;
  fileName: string;
  s3Key: string;
  pageCount: number | null;
  status: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

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
  ): Promise<{ script: ScriptResponse & { elements: any[] } }> {
    return request(`/api/productions/${productionId}/scripts/${scriptId}`);
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
