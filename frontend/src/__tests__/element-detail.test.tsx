import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({
    id: 'prod-1',
    scriptId: 'script-1',
    elementId: 'elem-1',
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

import { elementsApi, optionsApi } from '../lib/api';

const mockedElementsApi = vi.mocked(elementsApi);
const mockedOptionsApi = vi.mocked(optionsApi);

import ElementDetailPage from '../app/productions/[id]/scripts/[scriptId]/elements/[elementId]/page';

const mockElement = {
  id: 'elem-1',
  scriptId: 'script-1',
  name: 'JOHN',
  type: 'CHARACTER',
  pageNumbers: [1, 5, 12],
  status: 'ACTIVE',
  source: 'AUTO',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockOptions = [
  {
    id: 'opt-1',
    elementId: 'elem-1',
    mediaType: 'IMAGE',
    description: 'Costume reference',
    s3Key: 'options/uuid/photo.jpg',
    fileName: 'photo.jpg',
    externalUrl: null,
    thumbnailS3Key: null,
    status: 'ACTIVE',
    readyForReview: false,
    uploadedById: 'user-1',
    uploadedBy: { id: 'user-1', name: 'Test User' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('Element detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders element name and type badge', async () => {
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: [] });

    render(<ElementDetailPage />);

    expect(await screen.findByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('CHARACTER')).toBeInTheDocument();
  });

  it('renders page numbers', async () => {
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: [] });

    render(<ElementDetailPage />);

    expect(await screen.findByText(/1, 5, 12/)).toBeInTheDocument();
  });

  it('calls optionsApi.list with elementId', async () => {
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: [] });

    render(<ElementDetailPage />);

    await screen.findByText('JOHN');
    expect(mockedOptionsApi.list).toHaveBeenCalledWith('elem-1');
  });

  it('renders empty state when no options', async () => {
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: [] });

    render(<ElementDetailPage />);

    expect(await screen.findByText(/no options/i)).toBeInTheDocument();
  });

  it('renders option info when options exist', async () => {
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: mockOptions });

    render(<ElementDetailPage />);

    expect(await screen.findByText('Costume reference')).toBeInTheDocument();
  });

  it('shows error when load fails', async () => {
    mockedElementsApi.list.mockRejectedValue(new Error('Network error'));

    render(<ElementDetailPage />);

    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
  });

  it('renders "Add Option" button', async () => {
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: [] });

    render(<ElementDetailPage />);

    expect(await screen.findByRole('button', { name: /add option/i })).toBeInTheDocument();
  });

  it('shows option count', async () => {
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: mockOptions });

    render(<ElementDetailPage />);

    expect(await screen.findByText(/1 option/i)).toBeInTheDocument();
  });
});
