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
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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
  approvalsApi: {
    create: vi.fn(),
    list: vi.fn(),
  },
  feedApi: {
    list: vi.fn(),
  },
}));

import { feedApi } from '../lib/api';

const mockedFeedApi = vi.mocked(feedApi);

import FeedPage from '../app/productions/[id]/feed/page';

const mockFeedElements = [
  {
    id: 'elem-1',
    scriptId: 'script-1',
    name: 'JOHN',
    type: 'CHARACTER',
    highlightPage: 1,
    highlightText: 'JOHN',
    departmentId: null,
    status: 'ACTIVE',
    source: 'AUTO',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-1',
        elementId: 'elem-1',
        mediaType: 'IMAGE',
        description: 'Costume ref',
        externalUrl: null,
        assets: [
          { id: 'a1', s3Key: 'options/uuid/photo.jpg', fileName: 'photo.jpg', thumbnailS3Key: null, mediaType: 'IMAGE', sortOrder: 0, optionId: 'opt-1', createdAt: new Date().toISOString() },
        ],
        status: 'ACTIVE',
        readyForReview: true,
        uploadedById: 'user-2',
        uploadedBy: { id: 'user-2', name: 'Alice' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvals: [],
      },
    ],
  },
  {
    id: 'elem-2',
    scriptId: 'script-1',
    name: 'BEACH HOUSE',
    type: 'LOCATION',
    highlightPage: 3,
    highlightText: 'BEACH HOUSE',
    departmentId: null,
    status: 'ACTIVE',
    source: 'AUTO',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-2',
        elementId: 'elem-2',
        mediaType: 'LINK',
        description: 'Location photo',
        externalUrl: 'https://example.com',
        assets: [],
        status: 'ACTIVE',
        readyForReview: true,
        uploadedById: 'user-3',
        uploadedBy: { id: 'user-3', name: 'Bob' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvals: [],
      },
    ],
  },
];

describe('Feed page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders element names from feed', async () => {
    mockedFeedApi.list.mockResolvedValue({ elements: mockFeedElements });

    render(<FeedPage />);

    expect(await screen.findByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('BEACH HOUSE')).toBeInTheDocument();
  });

  it('shows type badges', async () => {
    mockedFeedApi.list.mockResolvedValue({ elements: mockFeedElements });

    render(<FeedPage />);

    expect(await screen.findByText('CHARACTER')).toBeInTheDocument();
    expect(screen.getByText('LOCATION')).toBeInTheDocument();
  });

  it('shows option count per element', async () => {
    mockedFeedApi.list.mockResolvedValue({ elements: mockFeedElements });

    render(<FeedPage />);

    await screen.findByText('JOHN');
    const optionCounts = screen.getAllByText(/1 option/i);
    expect(optionCounts.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when no elements need review', async () => {
    mockedFeedApi.list.mockResolvedValue({ elements: [] });

    render(<FeedPage />);

    expect(await screen.findByText(/no elements/i)).toBeInTheDocument();
  });

  it('shows error state when feed fails to load', async () => {
    mockedFeedApi.list.mockRejectedValue(new Error('Network error'));

    render(<FeedPage />);

    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
  });

  it('links to element detail page', async () => {
    mockedFeedApi.list.mockResolvedValue({ elements: mockFeedElements });

    render(<FeedPage />);

    await screen.findByText('JOHN');
    const links = screen.getAllByRole('link');
    const elementLink = links.find((l) => l.getAttribute('href')?.includes('elem-1'));
    expect(elementLink).toBeDefined();
  });
});
