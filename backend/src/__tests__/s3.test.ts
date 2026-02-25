import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/signed'),
}));

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateDownloadUrl } from '../lib/s3';

const MockedGetObjectCommand = vi.mocked(GetObjectCommand);
const mockedGetSignedUrl = vi.mocked(getSignedUrl);

describe('generateDownloadUrl (S9: Content-Disposition)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSignedUrl.mockResolvedValue('https://s3.amazonaws.com/signed');
  });

  it('includes ResponseContentDisposition attachment header', async () => {
    await generateDownloadUrl('options/uuid/photo.jpg');

    // Verify GetObjectCommand was created with ResponseContentDisposition
    expect(MockedGetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ResponseContentDisposition: 'attachment',
      }),
    );
  });

  it('returns signed URL from S3', async () => {
    const url = await generateDownloadUrl('options/uuid/photo.jpg');
    expect(url).toBe('https://s3.amazonaws.com/signed');
  });
});
