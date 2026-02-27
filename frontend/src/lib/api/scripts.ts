import type { Script } from '@backbone/shared/types';
import { type JsonSerialized, request } from './client';
import type { ElementWithCountResponse } from './elements';

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
    data: { title: string; fileName: string; s3Key: string; episodeNumber?: number; episodeTitle?: string },
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
