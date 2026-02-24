import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { OptionThumbnail } from '../components/option-thumbnail';

// Mock useMediaUrl hook
vi.mock('../lib/use-media-url', () => ({
  useMediaUrl: vi.fn(),
}));

import { useMediaUrl } from '../lib/use-media-url';

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
  it('renders an img when thumbnailS3Key is non-null and URL resolves', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://s3.example.com/thumb.jpg');

    render(
      <OptionThumbnail
        option={{ ...baseOption, thumbnailS3Key: 'thumbs/uuid/thumb.jpg' }}
        approvalState={null}
        onClick={vi.fn()}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'photo.jpg');
  });

  it('renders an img using s3Key when thumbnailS3Key is null for IMAGE type', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://s3.example.com/photo.jpg');

    render(
      <OptionThumbnail option={baseOption} approvalState={null} onClick={vi.fn()} />,
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
  });

  it('renders text fallback when no thumbnail and type is LINK', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const linkOption = { ...baseOption, mediaType: 'LINK', s3Key: null, fileName: null };
    render(
      <OptionThumbnail option={linkOption} approvalState={null} onClick={vi.fn()} />,
    );

    expect(screen.getByText('LINK')).toBeInTheDocument();
  });

  it('shows media type text while URL is loading', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    render(
      <OptionThumbnail option={baseOption} approvalState={null} onClick={vi.fn()} />,
    );

    expect(screen.getByText('IMAGE')).toBeInTheDocument();
  });

  it('renders with approved state green border class', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const { container } = render(
      <OptionThumbnail option={baseOption} approvalState="APPROVED" onClick={vi.fn()} />,
    );

    const thumb = container.querySelector('.option-border-approved');
    expect(thumb).toBeInTheDocument();
  });

  it('renders with rejected state border class', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const { container } = render(
      <OptionThumbnail option={baseOption} approvalState="REJECTED" onClick={vi.fn()} />,
    );

    const thumb = container.querySelector('.option-border-rejected');
    expect(thumb).toBeInTheDocument();
  });

  it('clicking calls onClick', async () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <OptionThumbnail option={baseOption} approvalState={null} onClick={onClick} />,
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
