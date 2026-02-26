import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElementDetailPanel } from '../components/element-detail-panel';

// Mock all API modules
vi.mock('../lib/api', () => ({
  elementsApi: {
    list: vi.fn(),
    update: vi.fn(),
  },
  optionsApi: {
    list: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    getUploadUrl: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
  approvalsApi: {
    list: vi.fn(),
    create: vi.fn(),
    confirm: vi.fn(),
  },
  departmentsApi: {
    list: vi.fn(),
  },
  notesApi: {
    listForElement: vi.fn(),
    createForElement: vi.fn(),
    listForOption: vi.fn(),
    createForOption: vi.fn(),
  },
  authApi: {
    me: vi.fn(),
  },
  productionsApi: {
    listMembers: vi.fn(),
  },
}));

// Mock useMediaUrl to avoid real S3 calls in component tests
vi.mock('../lib/use-media-url', () => ({
  useMediaUrl: vi.fn().mockReturnValue(null),
}));

// Mock OptionUploadForm to avoid complex file upload UI
vi.mock('../components/option-upload-form', () => ({
  OptionUploadForm: ({ onOptionCreated }: { onOptionCreated: () => void }) => (
    <div data-testid="option-upload-form">
      <button onClick={onOptionCreated}>Mock Upload</button>
    </div>
  ),
}));

import {
  elementsApi,
  optionsApi,
  approvalsApi,
  departmentsApi,
  notesApi,
  authApi,
  productionsApi,
} from '../lib/api';

const mockElement = {
  id: 'elem-1',
  scriptId: 'script-1',
  name: 'HERO CAPE',
  type: 'OTHER',
  status: 'ACTIVE',
  highlightPage: 3,
  highlightText: 'hero cape',
  departmentId: null,
  department: null,
  createdAt: '2026-02-24T00:00:00Z',
  updatedAt: '2026-02-24T00:00:00Z',
};

const mockOptions = [
  {
    id: 'opt-1',
    elementId: 'elem-1',
    mediaType: 'IMAGE',
    description: 'Red velvet cape',
    externalUrl: null,
    assets: [
      { id: 'a1', s3Key: 'options/uuid/cape.jpg', fileName: 'cape.jpg', thumbnailS3Key: null, mediaType: 'IMAGE', sortOrder: 0, optionId: 'opt-1', createdAt: new Date().toISOString() },
    ],
    status: 'ACTIVE',
    readyForReview: true,
    uploadedById: 'user-1',
    createdAt: '2026-02-24T00:00:00Z',
    updatedAt: '2026-02-24T00:00:00Z',
  },
  {
    id: 'opt-2',
    elementId: 'elem-1',
    mediaType: 'LINK',
    description: 'Reference link',
    externalUrl: 'https://example.com',
    assets: [],
    status: 'ACTIVE',
    readyForReview: false,
    uploadedById: 'user-1',
    createdAt: '2026-02-24T00:00:00Z',
    updatedAt: '2026-02-24T00:00:00Z',
  },
];

describe('ElementDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (elementsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      elements: [mockElement],
    });
    (optionsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      options: mockOptions,
    });
    (approvalsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      approvals: [],
    });
    (departmentsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      departments: [],
    });
    (notesApi.listForElement as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [],
    });
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [],
    });
    (authApi.me as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user-1', name: 'Jane Director', email: 'jane@example.com' },
    });
    (productionsApi.listMembers as ReturnType<typeof vi.fn>).mockResolvedValue({
      members: [
        {
          id: 'member-1',
          productionId: 'prod-1',
          userId: 'user-1',
          role: 'ADMIN',
          departmentId: 'dept-1',
          department: { id: 'dept-1', name: 'Art Department' },
          user: { id: 'user-1', name: 'Jane Director', email: 'jane@example.com' },
        },
      ],
    });
  });

  it('renders element name and type', async () => {
    render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('HERO CAPE')).toBeInTheDocument();
    });
    expect(screen.getByText('OTHER')).toBeInTheDocument();
  });

  it('renders DiscussionBox', async () => {
    render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Discussion')).toBeInTheDocument();
    });
  });

  it('renders option thumbnails', async () => {
    render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      // Option thumbnails show media type when no thumbnail
      expect(screen.getByText('IMAGE')).toBeInTheDocument();
      expect(screen.getByText('LINK')).toBeInTheDocument();
    });
  });

  it('clicking back button calls onBack', async () => {
    const onBack = vi.fn();
    render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('HERO CAPE')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /elements/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('resets lightbox when elementId changes', async () => {
    const { rerender } = render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText('HERO CAPE')).toBeInTheDocument();
    });

    // Open lightbox by clicking on a thumbnail
    const buttons = screen.getAllByRole('button');
    const thumbnailBtn = buttons.find(
      (b) => b.textContent === 'IMAGE' || b.closest('[class*="w-24"]'),
    );
    if (thumbnailBtn) {
      fireEvent.click(thumbnailBtn);
    }

    // Set up mocks for second element
    const mockElement2 = { ...mockElement, id: 'elem-2', name: 'VILLAIN MASK' };
    (elementsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      elements: [mockElement2],
    });
    (optionsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      options: [],
    });

    // Change elementId
    rerender(
      <ElementDetailPanel
        elementId="elem-2"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    // Lightbox should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('lightbox-backdrop')).not.toBeInTheDocument();
    });
  });

  it('resets upload form when elementId changes', async () => {
    const { rerender } = render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('HERO CAPE')).toBeInTheDocument();
    });

    // Open upload form
    fireEvent.click(screen.getByRole('button', { name: /add option/i }));
    expect(screen.getByTestId('option-upload-form')).toBeInTheDocument();

    // Set up mocks for second element
    const mockElement2 = { ...mockElement, id: 'elem-2', name: 'VILLAIN MASK' };
    (elementsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      elements: [mockElement2],
    });
    (optionsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      options: [],
    });

    rerender(
      <ElementDetailPanel
        elementId="elem-2"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('option-upload-form')).not.toBeInTheDocument();
    });
  });

  it('clears error when elementId changes', async () => {
    // Force an error
    (elementsApi.list as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Load failed'),
    );

    const { rerender } = render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load element')).toBeInTheDocument();
    });

    // Fix the mock and change elementId
    (elementsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      elements: [{ ...mockElement, id: 'elem-2', name: 'VILLAIN MASK' }],
    });
    (optionsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      options: [],
    });

    rerender(
      <ElementDetailPanel
        elementId="elem-2"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('Failed to load element')).not.toBeInTheDocument();
    });
  });

  it('shows archived message and refresh button when element not found', async () => {
    (elementsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      elements: [], // Element not in list
    });

    render(
      <ElementDetailPanel
        elementId="elem-missing"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/may have been archived/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('pressing Escape when no lightbox open calls onBack', async () => {
    const onBack = vi.fn();
    render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('HERO CAPE')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onBack).toHaveBeenCalled();
  });

  it('pressing Escape when lightbox IS open does NOT call onBack', async () => {
    const onBack = vi.fn();
    render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('HERO CAPE')).toBeInTheDocument();
    });

    // Open lightbox — click the first thumbnail area (the IMAGE one)
    const allButtons = screen.getAllByRole('button');
    const imageThumb = allButtons.find((b) => b.textContent === 'IMAGE');
    if (imageThumb) {
      fireEvent.click(imageThumb);
    }

    // Now Escape should close lightbox, not call onBack
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onBack).not.toHaveBeenCalled();
  });

  it('renders Posting as composer identity in discussion box', async () => {
    render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Posting as:/)).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Director')).toBeInTheDocument();
    expect(screen.getByText(/(Art Department)/)).toBeInTheDocument();
  });

  it('disables department dropdown during save', async () => {
    const departments = [
      { id: 'dept-1', name: 'Props', productionId: 'prod-1', createdAt: '2026-02-24T00:00:00Z', updatedAt: '2026-02-24T00:00:00Z' },
    ];
    (departmentsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({ departments });

    // Make update slow
    let resolveUpdate: () => void;
    (elementsApi.update as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise<{ element: typeof mockElement }>((resolve) => {
        resolveUpdate = () => resolve({ element: { ...mockElement, departmentId: 'dept-1' } });
      }),
    );

    render(
      <ElementDetailPanel
        elementId="elem-1"
        scriptId="script-1"
        productionId="prod-1"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Department')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Department');
    fireEvent.change(select, { target: { value: 'dept-1' } });

    // Select should be disabled while saving
    await waitFor(() => {
      expect(select).toBeDisabled();
    });

    // Resolve the update
    resolveUpdate!();

    await waitFor(() => {
      expect(select).not.toBeDisabled();
    });
  });
});
