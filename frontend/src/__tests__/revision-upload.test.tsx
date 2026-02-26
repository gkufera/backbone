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
  useParams: () => ({ id: 'prod-1', scriptId: 'script-1' }),
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
    list: vi.fn(),
    get: vi.fn(),
    uploadRevision: vi.fn(),
    getVersions: vi.fn(),
  },
  elementsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import { scriptsApi } from '../lib/api';
const mockedScriptsApi = vi.mocked(scriptsApi);

import RevisionUploadPage from '../app/productions/[id]/scripts/[scriptId]/revisions/upload/page';

describe('Revision upload page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'My Script',
        fileName: 'script.pdf',
        s3Key: 'scripts/uuid/script.pdf',
        pageCount: 120,
        status: 'READY',
        version: 1,
        parentScriptId: null,
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [],
      },
    });
  });

  it('renders form with file input', async () => {
    render(<RevisionUploadPage />);

    const fileInput = await screen.findByLabelText(/script file/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.pdf,.fdx');
  });

  it('shows current version context', async () => {
    render(<RevisionUploadPage />);

    expect(await screen.findByText(/uploading revision of/i)).toBeInTheDocument();
    expect(screen.getByText(/my script/i)).toBeInTheDocument();
    expect(screen.getByText(/v1/i)).toBeInTheDocument();
  });

  it('calls uploadRevision API on submit', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/script-v2.pdf',
    });

    mockedScriptsApi.uploadRevision.mockResolvedValue({
      script: {
        id: 'script-2',
        productionId: 'prod-1',
        title: 'My Script',
        fileName: 'script-v2.pdf',
        s3Key: 'scripts/uuid/script-v2.pdf',
        pageCount: null,
        status: 'PROCESSING',
        version: 2,
        parentScriptId: 'script-1',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<RevisionUploadPage />);

    await screen.findByText(/uploading revision of/i);

    const file = new File(['dummy'], 'script-v2.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockedScriptsApi.uploadRevision).toHaveBeenCalledWith('prod-1', 'script-1', {
        title: 'My Script',
        fileName: 'script-v2.pdf',
        s3Key: 'scripts/uuid/script-v2.pdf',
      });
    });
  });

  it('file input accepts .fdx files', async () => {
    render(<RevisionUploadPage />);

    const fileInput = await screen.findByLabelText(/script file/i);
    expect(fileInput).toHaveAttribute('accept', '.pdf,.fdx');
  });

  it('sends application/xml contentType for FDX revision', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/script-v2.fdx',
    });

    mockedScriptsApi.uploadRevision.mockResolvedValue({
      script: {
        id: 'script-2',
        productionId: 'prod-1',
        title: 'My Script',
        fileName: 'script-v2.fdx',
        s3Key: 'scripts/uuid/script-v2.fdx',
        pageCount: null,
        status: 'PROCESSING',
        version: 2,
        parentScriptId: 'script-1',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<RevisionUploadPage />);

    await screen.findByText(/uploading revision of/i);

    const file = new File(['<FinalDraft/>'], 'script-v2.fdx', { type: 'application/xml' });
    const fileInput = screen.getByLabelText(/script file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockedScriptsApi.getUploadUrl).toHaveBeenCalledWith(
        'script-v2.fdx',
        'application/xml',
      );
    });
  });

  it('shows FDX accuracy tooltip when FDX revision selected', async () => {
    render(<RevisionUploadPage />);

    await screen.findByText(/uploading revision of/i);

    const file = new File(['<FinalDraft/>'], 'script-v2.fdx', { type: 'application/xml' });
    const fileInput = screen.getByLabelText(/script file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText(/significantly more accurate/i)).toBeInTheDocument();
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/script-v2.pdf',
    });

    mockedScriptsApi.uploadRevision.mockRejectedValue(new Error('Upload failed'));

    render(<RevisionUploadPage />);

    await screen.findByText(/uploading revision of/i);

    const file = new File(['dummy'], 'script-v2.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /upload/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/upload failed/i);
  });
});
