import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OptionUploadForm } from '../components/option-upload-form';

vi.mock('../lib/api', () => ({
  authApi: { signup: vi.fn(), login: vi.fn(), me: vi.fn() },
  productionsApi: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    addMember: vi.fn(),
    listMembers: vi.fn(),
    removeMember: vi.fn(),
  },
  scriptsApi: {
    getUploadUrl: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
  },
  elementsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  optionsApi: {
    getUploadUrl: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
}));

vi.mock('../lib/thumbnail', () => ({
  generateImageThumbnail: vi.fn().mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' })),
  generateVideoThumbnail: vi.fn().mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' })),
}));

import { optionsApi } from '../lib/api';
import { generateImageThumbnail } from '../lib/thumbnail';

const mockedOptionsApi = vi.mocked(optionsApi);
const mockedGenerateImageThumbnail = vi.mocked(generateImageThumbnail);

describe('OptionUploadForm', () => {
  const mockOnOptionCreated = vi.fn();
  const elementId = 'elem-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file and link mode inputs', () => {
    render(<OptionUploadForm elementId={elementId} onOptionCreated={mockOnOptionCreated} />);

    expect(screen.getByText(/file/i)).toBeInTheDocument();
    expect(screen.getByText(/link/i)).toBeInTheDocument();
  });

  it('shows link input in link mode', async () => {
    const user = userEvent.setup();

    render(<OptionUploadForm elementId={elementId} onOptionCreated={mockOnOptionCreated} />);

    await user.click(screen.getByText(/link/i));
    expect(screen.getByPlaceholderText(/url/i)).toBeInTheDocument();
  });

  it('creates a LINK option on submit', async () => {
    const user = userEvent.setup();
    mockedOptionsApi.create.mockResolvedValue({
      option: {
        id: 'opt-1',
        elementId: 'elem-1',
        mediaType: 'LINK',
        description: 'Reference board',
        s3Key: null,
        fileName: null,
        externalUrl: 'https://example.com',
        thumbnailS3Key: null,
        status: 'ACTIVE',
        readyForReview: false,
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<OptionUploadForm elementId={elementId} onOptionCreated={mockOnOptionCreated} />);

    await user.click(screen.getByText(/link/i));
    await user.type(screen.getByPlaceholderText(/url/i), 'https://example.com');
    await user.type(screen.getByPlaceholderText(/description/i), 'Reference board');
    await user.click(screen.getByRole('button', { name: /upload|submit|add/i }));

    expect(mockedOptionsApi.create).toHaveBeenCalledWith('elem-1', {
      mediaType: 'LINK',
      description: 'Reference board',
      externalUrl: 'https://example.com',
    });
    expect(mockOnOptionCreated).toHaveBeenCalled();
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();
    mockedOptionsApi.create.mockRejectedValue(new Error('Server error'));

    render(<OptionUploadForm elementId={elementId} onOptionCreated={mockOnOptionCreated} />);

    await user.click(screen.getByText(/link/i));
    await user.type(screen.getByPlaceholderText(/url/i), 'https://example.com');
    await user.click(screen.getByRole('button', { name: /upload|submit|add/i }));

    expect(await screen.findByText(/failed/i)).toBeInTheDocument();
  });

  it('disables submit button during upload', async () => {
    const user = userEvent.setup();
    // Make the create call hang
    mockedOptionsApi.create.mockImplementation(() => new Promise(() => {}));

    render(<OptionUploadForm elementId={elementId} onOptionCreated={mockOnOptionCreated} />);

    await user.click(screen.getByText(/link/i));
    await user.type(screen.getByPlaceholderText(/url/i), 'https://example.com');
    await user.click(screen.getByRole('button', { name: /upload|submit|add/i }));

    expect(screen.getByRole('button', { name: /uploading|submitting/i })).toBeDisabled();
  });

  it('calls onOptionCreated after successful creation', async () => {
    const user = userEvent.setup();
    mockedOptionsApi.create.mockResolvedValue({
      option: {
        id: 'opt-1',
        elementId: 'elem-1',
        mediaType: 'LINK',
        description: null,
        s3Key: null,
        fileName: null,
        externalUrl: 'https://example.com',
        thumbnailS3Key: null,
        status: 'ACTIVE',
        readyForReview: false,
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<OptionUploadForm elementId={elementId} onOptionCreated={mockOnOptionCreated} />);

    await user.click(screen.getByText(/link/i));
    await user.type(screen.getByPlaceholderText(/url/i), 'https://example.com');
    await user.click(screen.getByRole('button', { name: /upload|submit|add/i }));

    expect(mockOnOptionCreated).toHaveBeenCalled();
  });

  it('validates URL is required for link mode', async () => {
    const user = userEvent.setup();

    render(<OptionUploadForm elementId={elementId} onOptionCreated={mockOnOptionCreated} />);

    await user.click(screen.getByText(/link/i));
    await user.click(screen.getByRole('button', { name: /upload|submit|add/i }));

    // Should not call API without URL
    expect(mockedOptionsApi.create).not.toHaveBeenCalled();
  });

  it('shows error when S3 upload fails', async () => {
    const user = userEvent.setup();

    // Make thumbnail succeed
    mockedGenerateImageThumbnail.mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' }));

    // Mock fetch to fail for S3 upload
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal('fetch', mockFetch);

    mockedOptionsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'options/uuid/photo.jpg',
      mediaType: 'IMAGE',
      thumbnailUploadUrl: 'https://s3.example.com/thumb',
      thumbnailS3Key: 'options/uuid/thumb.jpg',
    });

    render(<OptionUploadForm elementId={elementId} onOptionCreated={mockOnOptionCreated} />);

    const file = new File(['test-image'], 'photo.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /upload|submit|add/i }));

    // Should show error and NOT create option
    expect(await screen.findByText(/failed/i)).toBeInTheDocument();
    expect(mockedOptionsApi.create).not.toHaveBeenCalled();
  });

  it('succeeds uploading file even when thumbnail generation fails', async () => {
    const user = userEvent.setup();

    // Make thumbnail generation throw
    mockedGenerateImageThumbnail.mockRejectedValue(new Error('Canvas not supported'));

    // Mock fetch for S3 upload
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    mockedOptionsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'options/uuid/photo.jpg',
      mediaType: 'IMAGE',
    });

    mockedOptionsApi.create.mockResolvedValue({
      option: {
        id: 'opt-1',
        elementId: 'elem-1',
        mediaType: 'IMAGE',
        description: null,
        s3Key: 'options/uuid/photo.jpg',
        fileName: 'photo.jpg',
        externalUrl: null,
        thumbnailS3Key: null,
        status: 'ACTIVE',
        readyForReview: false,
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<OptionUploadForm elementId={elementId} onOptionCreated={mockOnOptionCreated} />);

    // Upload an image file
    const file = new File(['test-image'], 'photo.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /upload|submit|add/i }));

    // Should still create the option without thumbnail
    expect(mockOnOptionCreated).toHaveBeenCalled();
    expect(mockedOptionsApi.create).toHaveBeenCalledWith(
      'elem-1',
      expect.objectContaining({
        mediaType: 'IMAGE',
        s3Key: 'options/uuid/photo.jpg',
      }),
    );
  });
});
