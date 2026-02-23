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

  it('rejects when image fails to load (onerror)', async () => {
    // Override Image mock to trigger onerror instead of onload
    vi.stubGlobal('Image', function (this: any) {
      this.width = 0;
      this.height = 0;
      this.onload = null;
      this.onerror = null;
      Object.defineProperty(this, 'src', {
        set() {
          setTimeout(() => this.onerror?.(new Error('Load failed')), 0);
        },
      });
    });

    const file = new File(['test'], 'bad.jpg', { type: 'image/jpeg' });
    await expect(generateImageThumbnail(file)).rejects.toThrow();
  });

  it('revokes object URL after generating thumbnail', async () => {
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    await generateImageThumbnail(file);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });
});

describe('generateVideoThumbnail', () => {
  it('returns a Blob for a valid video file', async () => {
    const file = new File(['test'], 'clip.mp4', { type: 'video/mp4' });
    const result = await generateVideoThumbnail(file);
    expect(result).toBeInstanceOf(Blob);
  });

  it('rejects when video fails to load (onerror)', async () => {
    // Override document.createElement to return a video that errors
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        if (tag === 'video') {
          const video: any = {
            src: '',
            currentTime: 0,
            videoWidth: 0,
            videoHeight: 0,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            load: vi.fn(),
          };
          // Trigger onerror after src is set
          Object.defineProperty(video, 'src', {
            set() {
              setTimeout(() => video.onerror?.(new Error('Video load failed')), 0);
            },
          });
          return video;
        }
        return {};
      }),
    });

    const file = new File(['test'], 'bad.mp4', { type: 'video/mp4' });
    await expect(generateVideoThumbnail(file)).rejects.toThrow();
  });
});
