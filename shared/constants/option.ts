import { MediaType } from '../types/option';

export const OPTION_MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

export const OPTION_DESCRIPTION_MAX_LENGTH = 500;

export const OPTION_ALLOWED_MIME_TYPES: Record<string, MediaType> = {
  'image/jpeg': MediaType.IMAGE,
  'image/png': MediaType.IMAGE,
  'image/webp': MediaType.IMAGE,
  'video/mp4': MediaType.VIDEO,
  'video/quicktime': MediaType.VIDEO,
  'audio/mpeg': MediaType.AUDIO,
  'audio/wav': MediaType.AUDIO,
  'application/pdf': MediaType.PDF,
};

export const OPTION_ALLOWED_CONTENT_TYPES = Object.keys(OPTION_ALLOWED_MIME_TYPES);

export function mediaTypeFromMime(mimeType: string): MediaType | null {
  return OPTION_ALLOWED_MIME_TYPES[mimeType] ?? null;
}
