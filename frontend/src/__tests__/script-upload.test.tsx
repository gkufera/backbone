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

  it('renders file input accepting both PDF and FDX files', () => {
    render(<ScriptUploadPage />);

    const fileInput = screen.getByLabelText(/script file/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.pdf,.fdx');
  });

  it('shows selected file name after selection', async () => {
    const user = userEvent.setup();
    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test-script.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    await user.upload(fileInput, file);

    expect(screen.getByText('test-script.pdf')).toBeInTheDocument();
  });

  it('shows error for unsupported file types', async () => {
    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test.doc', { type: 'application/msword' });
    const fileInput = screen.getByLabelText(/script file/i);

    // Use fireEvent to bypass accept attribute filtering
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/pdf|fdx/i);
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
    const fileInput = screen.getByLabelText(/script file/i);
    await user.upload(fileInput, file);

    const titleInput = screen.getByLabelText(/^title$/i);
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
    const fileInput = screen.getByLabelText(/script file/i);
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
    const fileInput = screen.getByLabelText(/script file/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/productions/prod-1/scripts/script-1');
    });
  });

  it('auto-fills title from .fdx filename', async () => {
    render(<ScriptUploadPage />);

    const file = new File(['<FinalDraft/>'], 'my-screenplay.fdx', { type: 'application/xml' });
    const fileInput = screen.getByLabelText(/script file/i);

    fireEvent.change(fileInput, { target: { files: [file] } });

    const titleInput = screen.getByLabelText(/^title$/i) as HTMLInputElement;
    expect(titleInput.value).toBe('my-screenplay');
  });

  it('sends correct contentType for FDX files', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/test.fdx',
    });

    mockedScriptsApi.create.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'test',
        fileName: 'test.fdx',
        s3Key: 'scripts/uuid/test.fdx',
        pageCount: null,
        status: 'PROCESSING',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<ScriptUploadPage />);

    const file = new File(['<FinalDraft/>'], 'test.fdx', { type: 'application/xml' });
    const fileInput = screen.getByLabelText(/script file/i);

    fireEvent.change(fileInput, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockedScriptsApi.getUploadUrl).toHaveBeenCalledWith(
        'test.fdx',
        'application/xml',
      );
    });
  });

  it('shows description text for both PDF and FDX files after selection', async () => {
    render(<ScriptUploadPage />);

    // Select a PDF file
    const pdfFile = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    expect(screen.getByText(/element tagging on PDF import is beta/i)).toBeInTheDocument();
  });

  it('shows description text for FDX files after selection', async () => {
    render(<ScriptUploadPage />);

    const file = new File(['<FinalDraft/>'], 'test.fdx', { type: 'application/xml' });
    const fileInput = screen.getByLabelText(/script file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText(/element tagging on PDF import is beta/i)).toBeInTheDocument();
  });

  it('renders extract elements checkbox unchecked by default after file selected', async () => {
    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    const checkbox = screen.getByLabelText(/extract elements/i);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('shows FDX duplicate warning only when checkbox checked + FDX selected', async () => {
    const user = userEvent.setup();
    render(<ScriptUploadPage />);

    const file = new File(['<FinalDraft/>'], 'test.fdx', { type: 'application/xml' });
    const fileInput = screen.getByLabelText(/script file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Warning should not show initially
    expect(screen.queryByText(/duplicate elements/i)).not.toBeInTheDocument();

    // Check the checkbox
    const checkbox = screen.getByLabelText(/extract elements/i);
    await user.click(checkbox);

    // Warning should show now
    expect(screen.getByText(/duplicate elements/i)).toBeInTheDocument();
  });

  it('does not show FDX duplicate warning for PDF files even when checkbox checked', async () => {
    const user = userEvent.setup();
    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    const checkbox = screen.getByLabelText(/extract elements/i);
    await user.click(checkbox);

    expect(screen.queryByText(/duplicate elements/i)).not.toBeInTheDocument();
  });

  it('submit with checkbox unchecked sends extractElements: false', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/test.pdf',
    });

    mockedScriptsApi.create.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'test-script',
        fileName: 'test-script.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: null,
        status: 'PROCESSING',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test-script.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockedScriptsApi.create).toHaveBeenCalledWith('prod-1', expect.objectContaining({
        extractElements: false,
      }));
    });
  });

  it('submit with checkbox checked sends extractElements: true', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/test.pdf',
    });

    mockedScriptsApi.create.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'test-script',
        fileName: 'test-script.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: null,
        status: 'PROCESSING',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test-script.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    await user.upload(fileInput, file);

    // Check the extract elements checkbox
    const checkbox = screen.getByLabelText(/extract elements/i);
    await user.click(checkbox);

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockedScriptsApi.create).toHaveBeenCalledWith('prod-1', expect.objectContaining({
        extractElements: true,
      }));
    });
  });

  it('renders episode number and episode title fields', () => {
    render(<ScriptUploadPage />);

    expect(screen.getByLabelText(/episode number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/episode title/i)).toBeInTheDocument();
  });

  it('shows validation error when only episode number is filled', async () => {
    const user = userEvent.setup();
    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    await user.upload(fileInput, file);

    const epNumberInput = screen.getByLabelText(/episode number/i);
    await user.type(epNumberInput, '1');

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/episode/i);
    });

    expect(mockedScriptsApi.getUploadUrl).not.toHaveBeenCalled();
  });

  it('passes episode fields to API when both are provided', async () => {
    const user = userEvent.setup();

    mockedScriptsApi.getUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'scripts/uuid/pilot.pdf',
    });

    mockedScriptsApi.create.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Pilot',
        fileName: 'pilot.pdf',
        s3Key: 'scripts/uuid/pilot.pdf',
        pageCount: null,
        status: 'PROCESSING',
        episodeNumber: 1,
        episodeTitle: 'Pilot',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<ScriptUploadPage />);

    const file = new File(['dummy'], 'pilot.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/script file/i);
    await user.upload(fileInput, file);

    const titleInput = screen.getByLabelText(/^title$/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Pilot');

    const epNumberInput = screen.getByLabelText(/episode number/i);
    await user.type(epNumberInput, '1');

    const epTitleInput = screen.getByLabelText(/episode title/i);
    await user.type(epTitleInput, 'Pilot');

    await user.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(mockedScriptsApi.create).toHaveBeenCalledWith('prod-1', expect.objectContaining({
        episodeNumber: 1,
        episodeTitle: 'Pilot',
      }));
    });
  });
});
