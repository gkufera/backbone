import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({}),
}));
vi.mock('@aws-sdk/client-s3', () => {
  const MockS3Client = vi.fn();
  MockS3Client.prototype.send = mockSend;
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/signed'),
}));

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateDownloadUrl, putFileBuffer } from '../lib/s3';

const MockedPutObjectCommand = vi.mocked(PutObjectCommand);
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

describe('putFileBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  it('calls S3 PutObjectCommand with correct params', async () => {
    const buffer = Buffer.from('test content');
    await putFileBuffer('scripts/uuid/generated.pdf', buffer, 'application/pdf');

    expect(MockedPutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: 'scripts/uuid/generated.pdf',
        Body: buffer,
        ContentType: 'application/pdf',
      }),
    );
    expect(mockSend).toHaveBeenCalled();
  });

  it('passes through different content types', async () => {
    const buffer = Buffer.from('<xml/>');
    await putFileBuffer('scripts/uuid/test.fdx', buffer, 'application/xml');

    expect(MockedPutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ContentType: 'application/xml',
      }),
    );
  });
});
