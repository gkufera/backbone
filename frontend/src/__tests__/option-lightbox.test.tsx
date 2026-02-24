import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OptionLightbox } from '../components/option-lightbox';

const baseOption = {
  id: 'opt-1',
  elementId: 'elem-1',
  mediaType: 'IMAGE',
  description: 'Photo reference',
  s3Key: 'options/uuid/photo.jpg',
  fileName: 'photo.jpg',
  externalUrl: null,
  thumbnailS3Key: null,
  status: 'ACTIVE',
  readyForReview: true,
  uploadedById: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('OptionLightbox', () => {
  it('renders option media description', () => {
    render(
      <OptionLightbox
        option={baseOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    expect(screen.getByText('Photo reference')).toBeInTheDocument();
  });

  it('Escape key closes lightbox', () => {
    const onClose = vi.fn();
    render(
      <OptionLightbox
        option={baseOption}
        onClose={onClose}
        onApprove={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking backdrop closes lightbox', async () => {
    const onClose = vi.fn();
    render(
      <OptionLightbox
        option={baseOption}
        onClose={onClose}
        onApprove={vi.fn()}
      />,
    );

    const backdrop = screen.getByTestId('lightbox-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders approval buttons', () => {
    render(
      <OptionLightbox
        option={baseOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Y' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'N' })).toBeInTheDocument();
  });
});
