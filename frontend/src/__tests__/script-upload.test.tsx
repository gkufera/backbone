import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'prod-1' }),
}));

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
  },
}));

import { scriptsApi } from '../lib/api';
const mockedScriptsApi = vi.mocked(scriptsApi);

import ScriptUploadPage from '../app/productions/[id]/scripts/upload/page';

describe('Script upload page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global fetch for S3 upload
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it('renders file input accepting PDFs', () => {
    render(<ScriptUploadPage />);

    const fileInput = screen.getByLabelText(/pdf/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'application/pdf');
  });

  it('shows selected file name after selection', async () => {
    const user = userEvent.setup();
    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test-script.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/pdf/i);
    await user.upload(fileInput, file);

    expect(screen.getByText('test-script.pdf')).toBeInTheDocument();
  });

  it('shows error for non-PDF files', async () => {
    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test.doc', { type: 'application/msword' });
    const fileInput = screen.getByLabelText(/pdf/i);

    // Use fireEvent to bypass accept attribute filtering
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/pdf/i);
  });

  it('calls upload flow on submit', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/test-script.pdf',
    });

    mockedScriptsApi.create.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'test-script',
        fileName: 'test-script.pdf',
        s3Key: 'scripts/uuid/test-script.pdf',
        pageCount: null,
        status: 'PROCESSING',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test-script.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/pdf/i);
    await user.upload(fileInput, file);

    const titleInput = screen.getByLabelText(/title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'My Script');

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockedScriptsApi.getUploadUrl).toHaveBeenCalledWith(
        'test-script.pdf',
        'application/pdf',
      );
    });
  });

  it('shows error when S3 upload fails', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/test-script.pdf',
    });

    // S3 returns a non-ok response (e.g., CORS error, 403)
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test-script.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/pdf/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/upload.*failed|failed.*upload/i);
    });

    // Should NOT proceed to create the script record
    expect(mockedScriptsApi.create).not.toHaveBeenCalled();
  });

  it('redirects to script page on success', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/test-script.pdf',
    });

    mockedScriptsApi.create.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'test-script',
        fileName: 'test-script.pdf',
        s3Key: 'scripts/uuid/test-script.pdf',
        pageCount: null,
        status: 'PROCESSING',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test-script.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/pdf/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/productions/prod-1/scripts/script-1');
    });
  });
});
