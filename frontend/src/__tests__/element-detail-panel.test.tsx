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
  },
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
    s3Key: 'options/uuid/cape.jpg',
    fileName: 'cape.jpg',
    externalUrl: null,
    thumbnailS3Key: null,
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
    s3Key: null,
    fileName: null,
    externalUrl: 'https://example.com',
    thumbnailS3Key: null,
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
});
