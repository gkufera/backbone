import type { Production, ProductionMember, Department } from '@backbone/shared/types';
import { type JsonSerialized, request } from './client';
import type { DepartmentResponse } from './departments';
import type { ScriptResponse } from './scripts';

export type ProductionResponse = JsonSerialized<Production> & {
  memberRole?: string;
  status?: string;
  studioName?: string | null;
  budget?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
};

export type MemberResponse = JsonSerialized<
  Pick<ProductionMember, 'id' | 'productionId' | 'userId' | 'role' | 'title' | 'departmentId'>
> & {
  department?: { id: string; name: string } | null;
};

export interface ProductionDetailResponse extends ProductionResponse {
  members: Array<MemberResponse & { user: { id: string; name: string; email: string } }>;
  scripts: Array<Pick<ScriptResponse, 'id' | 'title' | 'fileName' | 'status' | 'createdAt'>>;
  departments?: DepartmentResponse[];
}

export const productionsApi = {
  create(data: {
    title: string;
    description?: string;
    studioName: string;
    contactName: string;
    contactEmail: string;
    budget?: string;
  }): Promise<{ production: ProductionResponse; member: MemberResponse }> {
    return request('/api/productions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  approve(token: string): Promise<{ message: string; productionTitle: string }> {
    return request('/api/productions/approve', {
      method: 'POST',
      body: JSON.stringify({ token }),
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
