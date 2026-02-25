import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api', () => ({
  notesApi: {
    listForElement: vi.fn(),
    createForElement: vi.fn(),
  },
}));

import { notesApi } from '../lib/api';
import { DiscussionBox } from '../components/discussion-box';

const mockedNotesApi = vi.mocked(notesApi);

describe('DiscussionBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders existing notes with user names', async () => {
    mockedNotesApi.listForElement.mockResolvedValue({
      notes: [
        {
          id: 'note-1',
          content: 'This looks great',
          userId: 'user-1',
          elementId: 'elem-1',
          optionId: null,
          createdAt: '2026-02-24T10:00:00Z',
          updatedAt: '2026-02-24T10:00:00Z',
          user: { id: 'user-1', name: 'Jane Director' },
        },
        {
          id: 'note-2',
          content: 'Can we see more angles?',
          userId: 'user-2',
          elementId: 'elem-1',
          optionId: null,
          createdAt: '2026-02-24T11:00:00Z',
          updatedAt: '2026-02-24T11:00:00Z',
          user: { id: 'user-2', name: 'Bob Designer' },
        },
      ],
    });

    render(<DiscussionBox elementId="elem-1" />);

    expect(await screen.findByText('This looks great')).toBeInTheDocument();
    expect(screen.getByText('Jane Director')).toBeInTheDocument();
    expect(screen.getByText('Can we see more angles?')).toBeInTheDocument();
    expect(screen.getByText('Bob Designer')).toBeInTheDocument();
  });

  it('submitting a note calls API and refreshes', async () => {
    const user = userEvent.setup();

    mockedNotesApi.listForElement.mockResolvedValue({ notes: [] });
    mockedNotesApi.createForElement.mockResolvedValue({
      note: {
        id: 'note-new',
        content: 'New note',
        userId: 'user-1',
        elementId: 'elem-1',
        optionId: null,
        createdAt: '2026-02-24T12:00:00Z',
        updatedAt: '2026-02-24T12:00:00Z',
        user: { id: 'user-1', name: 'Test User' },
      },
    });

    render(<DiscussionBox elementId="elem-1" />);

    // Wait for initial load to complete and input to appear
    const input = await screen.findByPlaceholderText(/add a note/i);
    await user.type(input, 'New note');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(mockedNotesApi.createForElement).toHaveBeenCalledWith('elem-1', 'New note');
  });

  it('shows empty state when no notes', async () => {
    mockedNotesApi.listForElement.mockResolvedValue({ notes: [] });

    render(<DiscussionBox elementId="elem-1" />);

    expect(await screen.findByText(/no notes yet/i)).toBeInTheDocument();
  });

  it('renders notes with department name when available', async () => {
    mockedNotesApi.listForElement.mockResolvedValue({
      notes: [
        {
          id: 'note-1',
          content: 'Department note',
          userId: 'user-1',
          elementId: 'elem-1',
          optionId: null,
          createdAt: '2026-02-24T10:00:00Z',
          updatedAt: '2026-02-24T10:00:00Z',
          user: { id: 'user-1', name: 'Jane Director' },
          department: 'Art Department',
        },
      ],
    });

    render(<DiscussionBox elementId="elem-1" />);

    expect(await screen.findByText(/Jane Director/)).toBeInTheDocument();
    expect(screen.getByText(/Art Department/)).toBeInTheDocument();
  });

  it('renders notes without department gracefully', async () => {
    mockedNotesApi.listForElement.mockResolvedValue({
      notes: [
        {
          id: 'note-1',
          content: 'No dept note',
          userId: 'user-1',
          elementId: 'elem-1',
          optionId: null,
          createdAt: '2026-02-24T10:00:00Z',
          updatedAt: '2026-02-24T10:00:00Z',
          user: { id: 'user-1', name: 'Jane Director' },
          department: null,
        },
      ],
    });

    render(<DiscussionBox elementId="elem-1" />);

    expect(await screen.findByText('Jane Director')).toBeInTheDocument();
    expect(screen.getByText('No dept note')).toBeInTheDocument();
  });

  it('shows composer name and department when props provided', async () => {
    mockedNotesApi.listForElement.mockResolvedValue({ notes: [] });

    render(
      <DiscussionBox
        elementId="elem-1"
        composerName="Sarah Chen"
        composerDepartment="Directing"
      />,
    );

    expect(await screen.findByText(/Posting as:/)).toBeInTheDocument();
    expect(screen.getByText(/Sarah Chen/)).toBeInTheDocument();
    expect(screen.getByText(/Directing/)).toBeInTheDocument();
  });

  it('does not show composer label when props absent', async () => {
    mockedNotesApi.listForElement.mockResolvedValue({ notes: [] });

    render(<DiscussionBox elementId="elem-1" />);

    await screen.findByPlaceholderText(/add a note/i);
    expect(screen.queryByText(/Posting as:/)).not.toBeInTheDocument();
  });

  it('disables submit button when content is empty', async () => {
    mockedNotesApi.listForElement.mockResolvedValue({ notes: [] });

    render(<DiscussionBox elementId="elem-1" />);

    await waitFor(() => {
      expect(mockedNotesApi.listForElement).toHaveBeenCalled();
    });

    const submitButton = screen.getByRole('button', { name: /send/i });
    expect(submitButton).toBeDisabled();
  });
});
