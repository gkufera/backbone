import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  optionsApi: {
    getDownloadUrl: vi.fn(),
  },
}));

import { optionsApi } from '../api';
import { useMediaUrl } from '../use-media-url';

describe('useMediaUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when s3Key is null', () => {
    const { result } = renderHook(() => useMediaUrl(null));
    expect(result.current).toBeNull();
  });

  it('returns URL string after async resolution', async () => {
    (optionsApi.getDownloadUrl as ReturnType<typeof vi.fn>).mockResolvedValue({
      downloadUrl: 'https://s3.example.com/signed-url',
    });

    const { result } = renderHook(() => useMediaUrl('options/uuid/photo.jpg'));

    await waitFor(() => {
      expect(result.current).toBe('https://s3.example.com/signed-url');
    });

    expect(optionsApi.getDownloadUrl).toHaveBeenCalledWith('options/uuid/photo.jpg');
  });

  it('returns null on API error', async () => {
    (optionsApi.getDownloadUrl as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error'),
    );

    const { result } = renderHook(() => useMediaUrl('options/uuid/photo.jpg'));

    // Wait a tick for the effect to settle
    await waitFor(() => {
      expect(optionsApi.getDownloadUrl).toHaveBeenCalled();
    });

    expect(result.current).toBeNull();
  });
});
