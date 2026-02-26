import { describe, it, expect } from 'vitest';
import { SCRIPT_ALLOWED_MIME_TYPES, SCRIPT_ALLOWED_EXTENSIONS } from '@backbone/shared/constants';
import { ScriptFormat } from '@backbone/shared/types';

describe('FDX shared constants and types', () => {
  describe('SCRIPT_ALLOWED_MIME_TYPES', () => {
    it('includes application/pdf', () => {
      expect(SCRIPT_ALLOWED_MIME_TYPES).toContain('application/pdf');
    });

    it('includes application/xml for FDX files', () => {
      expect(SCRIPT_ALLOWED_MIME_TYPES).toContain('application/xml');
    });

    it('includes text/xml for FDX files', () => {
      expect(SCRIPT_ALLOWED_MIME_TYPES).toContain('text/xml');
    });

    it('includes application/octet-stream for FDX files', () => {
      expect(SCRIPT_ALLOWED_MIME_TYPES).toContain('application/octet-stream');
    });
  });

  describe('SCRIPT_ALLOWED_EXTENSIONS', () => {
    it('includes .pdf', () => {
      expect(SCRIPT_ALLOWED_EXTENSIONS).toContain('.pdf');
    });

    it('includes .fdx', () => {
      expect(SCRIPT_ALLOWED_EXTENSIONS).toContain('.fdx');
    });
  });

  describe('ScriptFormat enum', () => {
    it('has PDF value', () => {
      expect(ScriptFormat.PDF).toBe('PDF');
    });

    it('has FDX value', () => {
      expect(ScriptFormat.FDX).toBe('FDX');
    });
  });
});
