import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OptionLightbox } from '../components/option-lightbox';

// Mock useMediaUrl hook
vi.mock('../lib/use-media-url', () => ({
  useMediaUrl: vi.fn(),
}));

import { useMediaUrl } from '../lib/use-media-url';

const baseOption = {
  id: 'opt-1',
  elementId: 'elem-1',
  mediaType: 'IMAGE',
  description: 'Photo reference',
  externalUrl: null,
  status: 'ACTIVE',
  readyForReview: true,
  uploadedById: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  assets: [
    { id: 'asset-1', s3Key: 'options/uuid/photo.jpg', fileName: 'photo.jpg', thumbnailS3Key: null, mediaType: 'IMAGE', sortOrder: 0, optionId: 'opt-1', createdAt: new Date().toISOString() },
  ],
};

describe('OptionLightbox', () => {
  it('renders option media description', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

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
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

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
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

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
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

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

  it('renders img tag when mediaType is IMAGE and URL resolves', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://s3.example.com/photo.jpg');

    render(
      <OptionLightbox
        option={baseOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://s3.example.com/photo.jpg');
  });

  it('renders video tag when mediaType is VIDEO and URL resolves', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://s3.example.com/clip.mp4');

    const videoOption = {
      ...baseOption,
      mediaType: 'VIDEO',
      assets: [
        { id: 'asset-1', s3Key: 'options/uuid/clip.mp4', fileName: 'clip.mp4', thumbnailS3Key: null, mediaType: 'VIDEO', sortOrder: 0, optionId: 'opt-1', createdAt: new Date().toISOString() },
      ],
    };
    const { container } = render(
      <OptionLightbox
        option={videoOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('controls');
  });

  it('renders audio tag when mediaType is AUDIO and URL resolves', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://s3.example.com/track.mp3');

    const audioOption = {
      ...baseOption,
      mediaType: 'AUDIO',
      assets: [
        { id: 'asset-1', s3Key: 'options/uuid/track.mp3', fileName: 'track.mp3', thumbnailS3Key: null, mediaType: 'AUDIO', sortOrder: 0, optionId: 'opt-1', createdAt: new Date().toISOString() },
      ],
    };
    const { container } = render(
      <OptionLightbox
        option={audioOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('controls');
  });

  it('renders external URL link when option has externalUrl', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const linkOption = {
      ...baseOption,
      mediaType: 'LINK',
      externalUrl: 'https://example.com/ref',
      assets: [],
    };
    render(
      <OptionLightbox
        option={linkOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/ref');
  });

  it('media area has no grayscale filter', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://s3.example.com/photo.jpg');

    render(
      <OptionLightbox
        option={baseOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    const img = screen.getByRole('img');
    expect(img.style.filter).toBeFalsy();
  });

  it('renders first asset by default for multi-asset option', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://s3.example.com/photo1.jpg');

    const multiOption = {
      ...baseOption,
      assets: [
        { id: 'a1', s3Key: 'options/uuid/photo1.jpg', fileName: 'photo1.jpg', thumbnailS3Key: null, mediaType: 'IMAGE', sortOrder: 0, optionId: 'opt-1', createdAt: new Date().toISOString() },
        { id: 'a2', s3Key: 'options/uuid/photo2.jpg', fileName: 'photo2.jpg', thumbnailS3Key: null, mediaType: 'IMAGE', sortOrder: 1, optionId: 'opt-1', createdAt: new Date().toISOString() },
      ],
    };

    render(
      <OptionLightbox
        option={multiOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
  });

  it('LINK option renders without assets', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const linkOption = {
      ...baseOption,
      mediaType: 'LINK',
      externalUrl: 'https://example.com/ref',
      assets: [],
    };

    render(
      <OptionLightbox
        option={linkOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
      />,
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/ref');
  });

  it('renders approval history when approvals are provided', () => {
    (useMediaUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const approvals = [
      {
        id: 'appr-1',
        optionId: 'opt-1',
        userId: 'user-1',
        decision: 'APPROVED',
        note: 'Great choice',
        tentative: false,
        confirmedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: { id: 'user-1', name: 'Jane Director' },
      },
    ];

    render(
      <OptionLightbox
        option={baseOption}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        approvals={approvals}
      />,
    );

    expect(screen.getByText('Jane Director')).toBeInTheDocument();
    expect(screen.getByText(/Great choice/)).toBeInTheDocument();
  });
});
