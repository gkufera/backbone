import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteAttachmentUpload } from '../components/note-attachment-upload';

describe('NoteAttachmentUpload', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ATTACH button', () => {
    render(<NoteAttachmentUpload files={[]} onChange={mockOnChange} />);

    expect(screen.getByRole('button', { name: /attach/i })).toBeInTheDocument();
  });

  it('renders file list when files are selected', () => {
    const files = [
      new File(['content'], 'photo.jpg', { type: 'image/jpeg' }),
      new File(['content'], 'clip.mp4', { type: 'video/mp4' }),
    ];

    render(<NoteAttachmentUpload files={files} onChange={mockOnChange} />);

    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('clip.mp4')).toBeInTheDocument();
  });

  it('calls onChange with file removed when remove button clicked', async () => {
    const user = userEvent.setup();
    const files = [
      new File(['content'], 'photo.jpg', { type: 'image/jpeg' }),
      new File(['content'], 'clip.mp4', { type: 'video/mp4' }),
    ];

    render(<NoteAttachmentUpload files={files} onChange={mockOnChange} />);

    const items = screen.getAllByTestId('attachment-item');
    const removeButton = within(items[0]).getByRole('button', { name: /remove/i });
    await user.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith([files[1]]);
  });

  it('hides ATTACH button when max attachments reached', () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      new File(['content'], `file${i}.jpg`, { type: 'image/jpeg' }),
    );

    render(<NoteAttachmentUpload files={files} onChange={mockOnChange} />);

    expect(screen.queryByRole('button', { name: /attach/i })).not.toBeInTheDocument();
  });

  it('shows attachment count', () => {
    const files = [
      new File(['content'], 'photo.jpg', { type: 'image/jpeg' }),
    ];

    render(<NoteAttachmentUpload files={files} onChange={mockOnChange} />);

    expect(screen.getByText(/1.*\/.*5/)).toBeInTheDocument();
  });
});
