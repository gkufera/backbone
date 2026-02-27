import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api', () => ({
  notesApi: {
    listForOption: vi.fn(),
    createForOption: vi.fn(),
  },
  optionsApi: {
    getUploadUrl: vi.fn(),
  },
}));

import { notesApi, optionsApi } from '../lib/api';
import { OptionNotes } from '../components/option-notes';

const mockNotes = [
  {
    id: 'note-1',
    content: 'This color works well',
    userId: 'user-1',
    elementId: null,
    optionId: 'opt-1',
    createdAt: '2026-02-24T10:00:00Z',
    updatedAt: '2026-02-24T10:00:00Z',
    user: { id: 'user-1', name: 'Jane Director' },
  },
  {
    id: 'note-2',
    content: 'Needs more contrast',
    userId: 'user-2',
    elementId: null,
    optionId: 'opt-1',
    createdAt: '2026-02-24T11:00:00Z',
    updatedAt: '2026-02-24T11:00:00Z',
    user: { id: 'user-2', name: 'Bob Designer' },
  },
];

describe('OptionNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders existing notes with user names', async () => {
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: mockNotes,
    });

    render(<OptionNotes optionId="opt-1" productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByText('Jane Director')).toBeInTheDocument();
    });
    expect(screen.getByText('This color works well')).toBeInTheDocument();
    expect(screen.getByText('Bob Designer')).toBeInTheDocument();
    expect(screen.getByText('Needs more contrast')).toBeInTheDocument();
  });

  it('submitting a note calls notesApi.createForOption', async () => {
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [],
    });
    (notesApi.createForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      note: {
        id: 'note-3',
        content: 'New note',
        userId: 'user-1',
        elementId: null,
        optionId: 'opt-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: { id: 'user-1', name: 'Jane Director' },
      },
    });

    const user = userEvent.setup();
    render(<OptionNotes optionId="opt-1" productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/add a note/i), 'New note');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(notesApi.createForOption).toHaveBeenCalledWith('opt-1', 'New note', undefined);
    });
  });

  it('shows empty state when no notes', async () => {
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [],
    });

    render(<OptionNotes optionId="opt-1" productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
    });
  });

  it('shows department name on notes when available', async () => {
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [
        {
          id: 'note-1',
          content: 'Department note',
          userId: 'user-1',
          elementId: null,
          optionId: 'opt-1',
          createdAt: '2026-02-24T10:00:00Z',
          updatedAt: '2026-02-24T10:00:00Z',
          user: { id: 'user-1', name: 'Jane Director' },
          department: 'Camera',
        },
      ],
    });

    render(<OptionNotes optionId="opt-1" productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Jane Director/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Camera/)).toBeInTheDocument();
  });

  it('shows composer identity when props provided', async () => {
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [],
    });

    render(
      <OptionNotes
        optionId="opt-1"
        productionId="prod-1"
        composerName="Alex Kim"
        composerDepartment="Props"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Posting as:/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Alex Kim/)).toBeInTheDocument();
    expect(screen.getByText(/Props/)).toBeInTheDocument();
  });

  it('disables submit when content is empty', async () => {
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [],
    });

    render(<OptionNotes optionId="opt-1" productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
    });

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('surfaces error when S3 upload fails', async () => {
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [],
    });
    (optionsApi.getUploadUrl as ReturnType<typeof vi.fn>).mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'uploads/test.png',
      mediaType: 'PHOTO',
    });

    // S3 returns 500
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const user = userEvent.setup();
    render(<OptionNotes optionId="opt-1" productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
    });

    // Type some content so submit is enabled
    await user.type(screen.getByPlaceholderText(/add a note/i), 'Note with attachment');

    // Simulate file attachment via the hidden input
    const file = new File(['test'], 'photo.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    // Submit
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Should NOT create the note since S3 upload failed
    await waitFor(() => {
      expect(notesApi.createForOption).not.toHaveBeenCalled();
    });

    fetchSpy.mockRestore();
  });

  it('creates note with attachment refs after successful S3 upload', async () => {
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [],
    });
    (notesApi.createForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      note: { id: 'note-4', content: 'With file', attachments: [] },
    });
    (optionsApi.getUploadUrl as ReturnType<typeof vi.fn>).mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      s3Key: 'uploads/test.png',
      mediaType: 'PHOTO',
    });

    // S3 returns success
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const user = userEvent.setup();
    render(<OptionNotes optionId="opt-1" productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/add a note/i), 'With file');

    const file = new File(['test'], 'photo.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(notesApi.createForOption).toHaveBeenCalledWith('opt-1', 'With file', [
        { s3Key: 'uploads/test.png', fileName: 'photo.png', mediaType: 'PHOTO' },
      ]);
    });

    fetchSpy.mockRestore();
  });
});
