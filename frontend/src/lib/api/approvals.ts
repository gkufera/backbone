import type { Approval, Element } from '@backbone/shared/types';
import { type JsonSerialized, request } from './client';
import type { OptionResponse } from './options';

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
