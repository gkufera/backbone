import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
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
    getDownloadUrl: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
  },
  elementsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock the PdfViewer dynamic import — it renders a simple placeholder
vi.mock('../components/pdf-viewer', () => ({
  PdfViewer: ({ pdfUrl }: { pdfUrl: string }) => (
    <div data-testid="pdf-viewer-mock">PDF: {pdfUrl}</div>
  ),
}));

import { scriptsApi, elementsApi } from '../lib/api';
const mockedScriptsApi = vi.mocked(scriptsApi);
const mockedElementsApi = vi.mocked(elementsApi);

import ScriptViewerPage from '../app/productions/[id]/scripts/[scriptId]/page';

describe('Script viewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: getDownloadUrl resolves with a URL
    mockedScriptsApi.getDownloadUrl.mockResolvedValue({
      downloadUrl: 'https://s3.example.com/test.pdf?signed',
    });
  });

  it('renders script title and status badge', async () => {
    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: 120,
        status: 'READY',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [],
      },
    });

    render(<ScriptViewerPage />);

    expect(await screen.findByText('Test Script')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('renders element list when READY', async () => {
    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: 120,
        status: 'READY',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [
          {
            id: 'elem-1',
            name: 'JOHN',
            type: 'CHARACTER',
            highlightPage: 1,
            highlightText: 'JOHN',
            departmentId: null,
            status: 'ACTIVE',
            source: 'AUTO',
          },
          {
            id: 'elem-2',
            name: 'INT. OFFICE - DAY',
            type: 'LOCATION',
            highlightPage: 1,
            highlightText: 'INT. OFFICE - DAY',
            departmentId: null,
            status: 'ACTIVE',
            source: 'AUTO',
          },
        ],
      },
    });

    render(<ScriptViewerPage />);

    expect(await screen.findByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('INT. OFFICE - DAY')).toBeInTheDocument();
  });

  it('shows processing state when PROCESSING', async () => {
    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: null,
        status: 'PROCESSING',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [],
      },
    });

    render(<ScriptViewerPage />);

    expect(await screen.findByText(/script is processing/i)).toBeInTheDocument();
  });

  it('renders "Add Element" button', async () => {
    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: 120,
        status: 'READY',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [],
      },
    });

    render(<ScriptViewerPage />);

    expect(await screen.findByRole('button', { name: /add element/i })).toBeInTheDocument();
  });

  it('renders page count info', async () => {
    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: 120,
        status: 'READY',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [],
      },
    });

    render(<ScriptViewerPage />);

    expect(await screen.findByText(/120 pages/i)).toBeInTheDocument();
  });

  it('shows error message when load fails', async () => {
    mockedScriptsApi.get.mockRejectedValue(new Error('Network error'));

    render(<ScriptViewerPage />);

    expect(await screen.findByText(/failed to load script/i)).toBeInTheDocument();
  });

  it('calls elementsApi.create when add element form is submitted', async () => {
    const user = userEvent.setup();
    const mockScript = {
      id: 'script-1',
      productionId: 'prod-1',
      title: 'Test Script',
      fileName: 'test.pdf',
      s3Key: 'scripts/uuid/test.pdf',
      pageCount: 120,
      status: 'READY',
      uploadedById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: [],
    };

    mockedScriptsApi.get.mockResolvedValue({ script: mockScript });
    mockedElementsApi.create.mockResolvedValue({
      element: {
        id: 'elem-new',
        name: 'NEW CHARACTER',
        type: 'CHARACTER',
        highlightPage: null,
        highlightText: null,
        departmentId: null,
        status: 'ACTIVE',
        source: 'MANUAL',
        scriptId: 'script-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<ScriptViewerPage />);

    await screen.findByText('Test Script');

    await user.click(screen.getByRole('button', { name: /add element/i }));
    await user.type(screen.getByPlaceholderText(/element name/i), 'NEW CHARACTER');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(mockedElementsApi.create).toHaveBeenCalledWith('script-1', {
      name: 'NEW CHARACTER',
      type: 'CHARACTER',
    });
  });

  it('calls elementsApi.update with ARCHIVED when archive button clicked', async () => {
    const user = userEvent.setup();
    const mockScript = {
      id: 'script-1',
      productionId: 'prod-1',
      title: 'Test Script',
      fileName: 'test.pdf',
      s3Key: 'scripts/uuid/test.pdf',
      pageCount: 120,
      status: 'READY',
      uploadedById: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: [
        {
          id: 'elem-1',
          name: 'JOHN',
          type: 'CHARACTER',
          highlightPage: 1,
          highlightText: 'JOHN',
          departmentId: null,
          status: 'ACTIVE',
          source: 'AUTO',
          scriptId: 'script-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    mockedScriptsApi.get.mockResolvedValue({ script: mockScript });
    mockedElementsApi.update.mockResolvedValue({
      element: { ...mockScript.elements[0], status: 'ARCHIVED' },
    });

    render(<ScriptViewerPage />);

    await screen.findByText('JOHN');

    await user.click(screen.getByRole('button', { name: /archive john/i }));

    expect(mockedElementsApi.update).toHaveBeenCalledWith('elem-1', { status: 'ARCHIVED' });
  });

  it('fetches PDF download URL when script is READY', async () => {
    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: 120,
        status: 'READY',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [],
      },
    });

    render(<ScriptViewerPage />);

    await screen.findByText('Test Script');

    expect(mockedScriptsApi.getDownloadUrl).toHaveBeenCalledWith('script-1');
  });

  it('uses split layout with PDF panel and elements panel when READY', async () => {
    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: 120,
        status: 'READY',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [
          {
            id: 'elem-1',
            name: 'JOHN',
            type: 'CHARACTER',
            highlightPage: 1,
            highlightText: 'JOHN',
            departmentId: null,
            status: 'ACTIVE',
            source: 'AUTO',
          },
        ],
      },
    });

    render(<ScriptViewerPage />);

    // Both panels should be present
    expect(await screen.findByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('Test Script')).toBeInTheDocument();
    expect(screen.getByText('Elements (1)')).toBeInTheDocument();
  });
});
