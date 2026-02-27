import type { Department } from '@backbone/shared/types';
import { type JsonSerialized, request } from './client';

export type DepartmentResponse = JsonSerialized<Department> & {
  _count?: { members: number };
  color?: string | null;
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
