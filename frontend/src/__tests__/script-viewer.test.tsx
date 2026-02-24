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

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test', email: 'test@example.com', emailVerified: true, emailNotificationsEnabled: true, createdAt: '' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  }),
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
    getProcessingStatus: vi.fn(),
    acceptElements: vi.fn(),
    generateImplied: vi.fn(),
  },
  elementsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    hardDelete: vi.fn(),
  },
  departmentsApi: {
    list: vi.fn(),
  },
}));

// Mock the PdfViewer dynamic import — it renders a simple placeholder
vi.mock('../components/pdf-viewer', () => ({
  PdfViewer: ({ pdfUrl }: { pdfUrl: string }) => (
    <div data-testid="pdf-viewer-mock">PDF: {pdfUrl}</div>
  ),
}));

// Mock ProcessingProgress
vi.mock('../components/processing-progress', () => ({
  ProcessingProgress: ({ scriptId }: { scriptId: string }) => (
    <div data-testid="processing-progress">Processing: {scriptId}</div>
  ),
}));

// Mock ElementWizard
vi.mock('../components/element-wizard', () => ({
  ElementWizard: ({ scriptId }: { scriptId: string }) => (
    <div data-testid="element-wizard">Wizard: {scriptId}</div>
  ),
}));

// Mock DirectorNotesPanel
vi.mock('../components/director-notes-panel', () => ({
  DirectorNotesPanel: ({
    scriptId,
  }: {
    scriptId: string;
    sceneData: unknown[];
    userRole: string;
    userId: string;
  }) => <div data-testid="director-notes-panel">Notes: {scriptId}</div>,
}));

// Mock ElementDetailPanel
vi.mock('../components/element-detail-panel', () => ({
  ElementDetailPanel: ({
    elementId,
    onBack,
  }: {
    elementId: string;
    onBack: () => void;
  }) => (
    <div data-testid="element-detail-panel">
      Detail: {elementId}
      <button onClick={onBack}>Back to Elements</button>
    </div>
  ),
}));

import { scriptsApi, elementsApi, departmentsApi } from '../lib/api';
const mockedScriptsApi = vi.mocked(scriptsApi);
const mockedElementsApi = vi.mocked(elementsApi);
const mockedDepartmentsApi = vi.mocked(departmentsApi);

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

  it('renders processing progress when status is PROCESSING', async () => {
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

    expect(await screen.findByTestId('processing-progress')).toBeInTheDocument();
  });

  it('renders wizard when status is REVIEWING', async () => {
    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: 10,
        status: 'REVIEWING',
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
        sceneData: [
          { sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] },
        ],
      },
    });

    render(<ScriptViewerPage />);

    expect(await screen.findByTestId('element-wizard')).toBeInTheDocument();
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

  it('mobile layout: elements panel has order-1, PDF panel has order-2', async () => {
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

    await screen.findByText('JOHN');

    // Elements panel (right on desktop, top on mobile) has order-1
    const elementsPanel = screen.getByText('JOHN').closest('.order-1');
    expect(elementsPanel).toBeInTheDocument();

    // PDF panel (left on desktop, bottom on mobile) has order-2
    const pdfPanel = screen.getByTestId('pdf-viewer-mock').closest('.order-2');
    expect(pdfPanel).toBeInTheDocument();
  });

  it('renders RECONCILING state with reconcile link', async () => {
    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: 120,
        status: 'RECONCILING',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [],
      },
    });

    render(<ScriptViewerPage />);

    expect(await screen.findByText(/reconciliation/i)).toBeInTheDocument();
    expect(screen.getByText(/review and reconcile/i)).toBeInTheDocument();
    const reconcileLink = screen.getByRole('link', { name: /review and reconcile/i });
    expect(reconcileLink).toHaveAttribute(
      'href',
      '/productions/prod-1/scripts/script-1/reconcile',
    );
  });

  it('fetches departments for REVIEWING status', async () => {
    mockedDepartmentsApi.list.mockResolvedValue({ departments: [] });

    mockedScriptsApi.get.mockResolvedValue({
      script: {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Test Script',
        fileName: 'test.pdf',
        s3Key: 'scripts/uuid/test.pdf',
        pageCount: 10,
        status: 'REVIEWING',
        uploadedById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: [],
        sceneData: null,
      },
    });

    render(<ScriptViewerPage />);

    await screen.findByTestId('element-wizard');

    expect(mockedDepartmentsApi.list).toHaveBeenCalledWith('prod-1');
  });

  it('clicking element shows detail panel instead of list', async () => {
    const user = userEvent.setup();
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

    await screen.findByText('JOHN');

    // Click on the element name
    await user.click(screen.getByText('JOHN'));

    // Detail panel should appear
    expect(await screen.findByTestId('element-detail-panel')).toBeInTheDocument();
    expect(screen.getByText('Detail: elem-1')).toBeInTheDocument();
  });

  it('clicking back in detail panel returns to list', async () => {
    const user = userEvent.setup();
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

    await screen.findByText('JOHN');

    // Click on element to open detail panel
    await user.click(screen.getByText('JOHN'));
    expect(await screen.findByTestId('element-detail-panel')).toBeInTheDocument();

    // Click back button
    await user.click(screen.getByRole('button', { name: /back to elements/i }));

    // Detail panel should be gone, element list should be back
    expect(screen.queryByTestId('element-detail-panel')).not.toBeInTheDocument();
    expect(screen.getByText('Elements (1)')).toBeInTheDocument();
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

  it('renders Elements/Notes toggle when sceneData exists', async () => {
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
        sceneData: [
          { sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] },
        ],
      },
    });

    render(<ScriptViewerPage />);

    await screen.findByText('Test Script');

    expect(screen.getByRole('button', { name: /^elements$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /director.s notes/i })).toBeInTheDocument();
  });

  it('clicking Director\'s Notes toggle shows notes panel', async () => {
    const user = userEvent.setup();

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
        sceneData: [
          { sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] },
        ],
      },
    });

    render(<ScriptViewerPage />);

    await screen.findByText('Test Script');

    await user.click(screen.getByRole('button', { name: /director.s notes/i }));

    expect(await screen.findByTestId('director-notes-panel')).toBeInTheDocument();
  });
});
