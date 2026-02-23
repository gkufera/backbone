import { render, screen } from '@testing-library/react';
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

import { scriptsApi, elementsApi } from '../lib/api';
const mockedScriptsApi = vi.mocked(scriptsApi);
const mockedElementsApi = vi.mocked(elementsApi);

import ScriptViewerPage from '../app/productions/[id]/scripts/[scriptId]/page';

describe('Script viewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
            pageNumbers: [1, 5],
            status: 'ACTIVE',
            source: 'AUTO',
          },
          {
            id: 'elem-2',
            name: 'INT. OFFICE - DAY',
            type: 'LOCATION',
            pageNumbers: [1],
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
});
