import type { Option, OptionAsset } from '@backbone/shared/types';
import { type JsonSerialized, request } from './client';

export type OptionAssetResponse = JsonSerialized<OptionAsset>;

export type OptionResponse = JsonSerialized<Option> & {
  uploadedBy?: { id: string; name: string };
  assets?: OptionAssetResponse[];
};

export const optionsApi = {
  getUploadUrl(
    fileName: string,
    contentType: string,
    productionId: string,
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
      body: JSON.stringify({ fileName, contentType, thumbnailFileName, productionId }),
    });
  },

  create(
    elementId: string,
    data: {
      mediaType: string;
      description?: string;
      externalUrl?: string;
      assets?: Array<{
        s3Key: string;
        fileName: string;
        thumbnailS3Key?: string;
        mediaType: string;
      }>;
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
