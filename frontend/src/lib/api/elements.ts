import type { Element } from '@backbone/shared/types';
import { type JsonSerialized, request } from './client';

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
