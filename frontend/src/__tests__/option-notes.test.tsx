import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api', () => ({
  notesApi: {
    listForOption: vi.fn(),
    createForOption: vi.fn(),
  },
}));

import { notesApi } from '../lib/api';
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

    render(<OptionNotes optionId="opt-1" />);

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
    render(<OptionNotes optionId="opt-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/add a note/i), 'New note');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(notesApi.createForOption).toHaveBeenCalledWith('opt-1', 'New note');
    });
  });

  it('shows empty state when no notes', async () => {
    (notesApi.listForOption as ReturnType<typeof vi.fn>).mockResolvedValue({
      notes: [],
    });

    render(<OptionNotes optionId="opt-1" />);

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

    render(<OptionNotes optionId="opt-1" />);

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

    render(<OptionNotes optionId="opt-1" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
    });

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });
});
