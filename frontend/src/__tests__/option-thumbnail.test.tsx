import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { OptionThumbnail } from '../components/option-thumbnail';

const baseOption = {
  id: 'opt-1',
  elementId: 'elem-1',
  mediaType: 'IMAGE',
  description: 'Photo ref',
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

describe('OptionThumbnail', () => {
  it('renders with approved state green border class', () => {
    const { container } = render(
      <OptionThumbnail option={baseOption} approvalState="APPROVED" onClick={vi.fn()} />,
    );

    const thumb = container.querySelector('.option-border-approved');
    expect(thumb).toBeInTheDocument();
  });

  it('renders with rejected state grayscale class', () => {
    const { container } = render(
      <OptionThumbnail option={baseOption} approvalState="REJECTED" onClick={vi.fn()} />,
    );

    const thumb = container.querySelector('.option-border-rejected');
    expect(thumb).toBeInTheDocument();
  });

  it('renders media type icon when no thumbnail', () => {
    render(
      <OptionThumbnail option={baseOption} approvalState={null} onClick={vi.fn()} />,
    );

    expect(screen.getByText('IMAGE')).toBeInTheDocument();
  });

  it('clicking calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <OptionThumbnail option={baseOption} approvalState={null} onClick={onClick} />,
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
