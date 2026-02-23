import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

vi.mock('../lib/thumbnail', () => ({
  generateImageThumbnail: vi.fn().mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' })),
  generateVideoThumbnail: vi.fn().mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' })),
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

  it('shows upload form when Add Option is clicked', async () => {
    const user = userEvent.setup();
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: [] });

    render(<ElementDetailPage />);

    const addBtn = await screen.findByRole('button', { name: /add option/i });
    await user.click(addBtn);

    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
  });

  it('refreshes options after option is created', async () => {
    const user = userEvent.setup();
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list
      .mockResolvedValueOnce({ options: [] })
      .mockResolvedValueOnce({ options: mockOptions });
    mockedOptionsApi.create.mockResolvedValue({
      option: mockOptions[0],
    });

    render(<ElementDetailPage />);

    // Wait for initial load
    await screen.findByText(/no options/i);

    // Open form and submit a link
    const addButtons = screen.getAllByRole('button', { name: /add option/i });
    await user.click(addButtons[0]); // Toggle button
    await user.click(screen.getByText(/link/i));
    await user.type(screen.getByPlaceholderText(/url/i), 'https://example.com');
    // Click the form's submit button (type="submit")
    const submitBtn = screen.getAllByRole('button', { name: /add option/i });
    await user.click(submitBtn[submitBtn.length - 1]);

    // Should refresh and show new option
    expect(await screen.findByText('Costume reference')).toBeInTheDocument();
  });

  it('calls optionsApi.update when toggling ready for review', async () => {
    const user = userEvent.setup();
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: mockOptions });
    mockedOptionsApi.update.mockResolvedValue({
      option: { ...mockOptions[0], readyForReview: true },
    });

    render(<ElementDetailPage />);

    await screen.findByText('Costume reference');
    await user.click(screen.getByRole('button', { name: /ready/i }));

    expect(mockedOptionsApi.update).toHaveBeenCalledWith('opt-1', { readyForReview: true });
  });

  it('calls optionsApi.update when archiving option', async () => {
    const user = userEvent.setup();
    mockedElementsApi.list.mockResolvedValue({ elements: [mockElement] });
    mockedOptionsApi.list.mockResolvedValue({ options: mockOptions });
    mockedOptionsApi.update.mockResolvedValue({
      option: { ...mockOptions[0], status: 'ARCHIVED' },
    });

    render(<ElementDetailPage />);

    await screen.findByText('Costume reference');
    await user.click(screen.getByRole('button', { name: /archive/i }));

    expect(mockedOptionsApi.update).toHaveBeenCalledWith('opt-1', { status: 'ARCHIVED' });
  });
});
