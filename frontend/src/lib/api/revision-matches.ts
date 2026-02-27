import { type RevisionMatch, RevisionMatchDecision } from '@backbone/shared/types';
import { type JsonSerialized, request } from './client';
import type { ElementResponse } from './elements';

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
      decision: RevisionMatchDecision;
      departmentId?: string | null;
    }>,
  ): Promise<{ message: string }> {
    return request(`/api/scripts/${scriptId}/revision-matches/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decisions }),
    });
  },
};
