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

  it('renders rejected overlay with X when approvalState is REJECTED', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    render(
      <OptionThumbnail option={baseOption} approvalState="REJECTED" onClick={vi.fn()} />,
    );

    const overlay = screen.getByTestId('rejected-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay.textContent).toContain('\u2715');
  });

  it('does not render rejected overlay when approvalState is APPROVED', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    render(
      <OptionThumbnail option={baseOption} approvalState="APPROVED" onClick={vi.fn()} />,
    );

    expect(screen.queryByTestId('rejected-overlay')).not.toBeInTheDocument();
  });

  it('uses default border when approvalState is MAYBE', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const { container } = render(
      <OptionThumbnail option={baseOption} approvalState="MAYBE" onClick={vi.fn()} />,
    );

    // MAYBE should have no special border — just default border-2 border-black
    expect(container.querySelector('.option-border-maybe')).not.toBeInTheDocument();
    expect(container.querySelector('.option-border-approved')).not.toBeInTheDocument();
  });

  it('uses default border when approvalState is null', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const { container } = render(
      <OptionThumbnail option={baseOption} approvalState={null} onClick={vi.fn()} />,
    );

    expect(container.querySelector('.option-border-approved')).not.toBeInTheDocument();
    expect(container.querySelector('.option-border-rejected')).not.toBeInTheDocument();
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

  it('renders Y/M/N buttons when readyForReview and onApprove provided', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    render(
      <OptionThumbnail
        option={baseOption}
        approvalState={null}
        onClick={vi.fn()}
        onApprove={vi.fn()}
        readyForReview
      />,
    );

    expect(screen.getByRole('button', { name: 'Y' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'N' })).toBeInTheDocument();
  });

  it('clicking Y calls onApprove with APPROVED', async () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(
      <OptionThumbnail
        option={baseOption}
        approvalState={null}
        onClick={vi.fn()}
        onApprove={onApprove}
        readyForReview
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Y' }));
    expect(onApprove).toHaveBeenCalledWith('APPROVED');
  });

  it('clicking N calls onApprove with REJECTED', async () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(
      <OptionThumbnail
        option={baseOption}
        approvalState={null}
        onClick={vi.fn()}
        onApprove={onApprove}
        readyForReview
      />,
    );

    await user.click(screen.getByRole('button', { name: 'N' }));
    expect(onApprove).toHaveBeenCalledWith('REJECTED');
  });

  it('does not render Y/M/N buttons when not readyForReview', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const notReadyOption = { ...baseOption, readyForReview: false };
    render(
      <OptionThumbnail
        option={notReadyOption}
        approvalState={null}
        onClick={vi.fn()}
        onApprove={vi.fn()}
        readyForReview={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Y' })).not.toBeInTheDocument();
  });

  it('Y/M/N button clicks do not trigger main onClick', async () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const user = userEvent.setup();
    const onClick = vi.fn();
    const onApprove = vi.fn();
    render(
      <OptionThumbnail
        option={baseOption}
        approvalState={null}
        onClick={onClick}
        onApprove={onApprove}
        readyForReview
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Y' }));
    expect(onApprove).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
