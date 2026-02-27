import { describe, it, expect } from 'vitest';
import { sanitizeFileName } from '../lib/s3';

describe('sanitizeFileName', () => {
  it('passes through normal filenames unchanged', () => {
    expect(sanitizeFileName('photo.jpg')).toBe('photo.jpg');
    expect(sanitizeFileName('my-script_v2.pdf')).toBe('my-script_v2.pdf');
  });

  it('strips path traversal sequences', () => {
    expect(sanitizeFileName('../../../etc/passwd')).toBe('etcpasswd');
    expect(sanitizeFileName('..\\..\\windows\\system32')).toBe('windowssystem32');
  });

  it('strips null bytes', () => {
    expect(sanitizeFileName('file\x00.jpg')).toBe('file.jpg');
  });

  it('strips forward and back slashes', () => {
    expect(sanitizeFileName('path/to/file.jpg')).toBe('pathtofile.jpg');
    expect(sanitizeFileName('path\\to\\file.jpg')).toBe('pathtofile.jpg');
  });

  it('returns fallback for empty result after sanitization', () => {
    expect(sanitizeFileName('../../..')).toBe('upload');
    expect(sanitizeFileName('')).toBe('upload');
  });
});
