export const SCRIPT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const SCRIPT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/xml',
  'text/xml',
  'application/octet-stream',
] as const;
export const SCRIPT_ALLOWED_EXTENSIONS = ['.pdf', '.fdx'] as const;
