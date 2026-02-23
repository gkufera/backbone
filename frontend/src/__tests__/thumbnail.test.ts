import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateImageThumbnail, generateVideoThumbnail } from '../lib/thumbnail';

// Mock canvas and related APIs
const mockCanvasContext = {
  drawImage: vi.fn(),
};

const mockCanvas = {
  getContext: vi.fn(() => mockCanvasContext),
  toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
    callback(new Blob(['fake-thumb'], { type: 'image/jpeg' }));
  }),
  width: 0,
  height: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('document', {
    createElement: vi.fn((tag: string) => {
      if (tag === 'canvas') return mockCanvas;
      if (tag === 'video') {
        return {
          src: '',
          currentTime: 0,
          videoWidth: 1920,
          videoHeight: 1080,
          addEventListener: vi.fn((event: string, handler: () => void) => {
            if (event === 'seeked') {
              // Simulate seeked event firing
              setTimeout(handler, 0);
            }
          }),
          removeEventListener: vi.fn(),
          load: vi.fn(),
        };
      }
      return {};
    }),
  });
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test-url'),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal('Image', function (this: any) {
    this.width = 800;
    this.height = 600;
    this.onload = null;
    Object.defineProperty(this, 'src', {
      set() {
        setTimeout(() => this.onload?.(), 0);
      },
    });
  });
});

describe('generateImageThumbnail', () => {
  it('returns a Blob for a valid image file', async () => {
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await generateImageThumbnail(file);
    expect(result).toBeInstanceOf(Blob);
  });
});

describe('generateVideoThumbnail', () => {
  it('returns a Blob for a valid video file', async () => {
    const file = new File(['test'], 'clip.mp4', { type: 'video/mp4' });
    const result = await generateVideoThumbnail(file);
    expect(result).toBeInstanceOf(Blob);
  });
});
