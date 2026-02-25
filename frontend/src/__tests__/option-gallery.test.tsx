import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OptionGallery } from '../components/option-gallery';

const mockOptions = [
  {
    id: 'opt-1',
    elementId: 'elem-1',
    mediaType: 'IMAGE',
    description: 'Photo A',
    externalUrl: null,
    assets: [
      { id: 'a1', s3Key: 'options/uuid/a.jpg', fileName: 'a.jpg', thumbnailS3Key: null, mediaType: 'IMAGE', sortOrder: 0, optionId: 'opt-1', createdAt: new Date().toISOString() },
    ],
    status: 'ACTIVE',
    readyForReview: false,
    uploadedById: 'user-1',
    uploadedBy: { id: 'user-1', name: 'Test User' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'opt-2',
    elementId: 'elem-1',
    mediaType: 'LINK',
    description: 'Reference link',
    externalUrl: 'https://example.com',
    assets: [],
    status: 'ACTIVE',
    readyForReview: true,
    uploadedById: 'user-1',
    uploadedBy: { id: 'user-1', name: 'Test User' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('OptionGallery', () => {
  const mockOnToggleReady = vi.fn();
  const mockOnArchive = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders option cards in a grid', () => {
    render(
      <OptionGallery
        options={mockOptions}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
      />,
    );

    expect(screen.getByText('Photo A')).toBeInTheDocument();
    expect(screen.getByText('Reference link')).toBeInTheDocument();
  });

  it('renders empty state when no options', () => {
    render(
      <OptionGallery options={[]} onToggleReady={mockOnToggleReady} onArchive={mockOnArchive} />,
    );

    expect(screen.getByText(/no options/i)).toBeInTheDocument();
  });
});
