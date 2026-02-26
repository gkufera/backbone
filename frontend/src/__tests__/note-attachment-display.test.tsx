import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteAttachmentDisplay } from '../components/note-attachment-display';

const { mockGetDownloadUrl } = vi.hoisted(() => ({
  mockGetDownloadUrl: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  notesApi: {
    getNoteAttachmentDownloadUrl: mockGetDownloadUrl,
  },
}));

describe('NoteAttachmentDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDownloadUrl.mockResolvedValue({ downloadUrl: 'https://s3.example.com/file' });
  });

  it('renders img element for IMAGE media type', async () => {
    render(
      <NoteAttachmentDisplay
        s3Key="uploads/photo.jpg"
        fileName="photo.jpg"
        mediaType="IMAGE"
      />,
    );

    const img = await screen.findByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'photo.jpg');
  });

  it('renders video element for VIDEO media type', async () => {
    render(
      <NoteAttachmentDisplay
        s3Key="uploads/clip.mp4"
        fileName="clip.mp4"
        mediaType="VIDEO"
      />,
    );

    const video = await screen.findByTestId('note-attachment-video');
    expect(video).toBeInTheDocument();
    expect(video.tagName).toBe('VIDEO');
  });

  it('renders audio element for AUDIO media type', async () => {
    render(
      <NoteAttachmentDisplay
        s3Key="uploads/sound.mp3"
        fileName="sound.mp3"
        mediaType="AUDIO"
      />,
    );

    const audio = await screen.findByTestId('note-attachment-audio');
    expect(audio).toBeInTheDocument();
    expect(audio.tagName).toBe('AUDIO');
  });

  it('renders download link for PDF media type', async () => {
    render(
      <NoteAttachmentDisplay
        s3Key="uploads/doc.pdf"
        fileName="doc.pdf"
        mediaType="PDF"
      />,
    );

    const link = await screen.findByRole('link', { name: /doc\.pdf/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://s3.example.com/file');
  });

  it('shows file name while loading', () => {
    mockGetDownloadUrl.mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <NoteAttachmentDisplay
        s3Key="uploads/photo.jpg"
        fileName="photo.jpg"
        mediaType="IMAGE"
      />,
    );

    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
  });
});
