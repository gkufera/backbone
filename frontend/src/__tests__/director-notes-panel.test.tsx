import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock functions
const { mockList, mockCreate, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  directorNotesApi: {
    list: mockList,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

import { DirectorNotesPanel } from '../components/director-notes-panel';

const sceneData = [
  { sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] },
  { sceneNumber: 2, location: 'EXT. PARK - NIGHT', characters: ['MARY'] },
  { sceneNumber: 3, location: 'INT. HOUSE - MORNING', characters: ['JOHN', 'MARY'] },
];

const mockNotes = [
  {
    id: 'note-1',
    scriptId: 'script-1',
    sceneNumber: 1,
    note: 'More dramatic lighting',
    createdById: 'user-decider',
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: { id: 'user-decider', name: 'Director' },
  },
  {
    id: 'note-2',
    scriptId: 'script-1',
    sceneNumber: 2,
    note: 'Use wide angle',
    createdById: 'user-decider',
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: { id: 'user-decider', name: 'Director' },
  },
];

describe('DirectorNotesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ notes: mockNotes });
  });

  it('renders scene list from sceneData', async () => {
    render(
      <DirectorNotesPanel
        scriptId="script-1"
        sceneData={sceneData}
        userRole="DECIDER"
        userId="user-decider"
      />,
    );

    expect(await screen.findByText(/Scene 1/)).toBeInTheDocument();
    expect(screen.getByText(/Scene 2/)).toBeInTheDocument();
    expect(screen.getByText(/Scene 3/)).toBeInTheDocument();
  });

  it('displays notes grouped by scene number', async () => {
    render(
      <DirectorNotesPanel
        scriptId="script-1"
        sceneData={sceneData}
        userRole="DECIDER"
        userId="user-decider"
      />,
    );

    expect(await screen.findByText('More dramatic lighting')).toBeInTheDocument();
    expect(screen.getByText('Use wide angle')).toBeInTheDocument();
  });

  it('shows "Add Note" button for DECIDER', async () => {
    render(
      <DirectorNotesPanel
        scriptId="script-1"
        sceneData={sceneData}
        userRole="DECIDER"
        userId="user-decider"
      />,
    );

    await screen.findByText(/Scene 1/);
    const addButtons = screen.getAllByRole('button', { name: /add note/i });
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('hides "Add Note" button for MEMBER', async () => {
    render(
      <DirectorNotesPanel
        scriptId="script-1"
        sceneData={sceneData}
        userRole="MEMBER"
        userId="user-member"
      />,
    );

    await screen.findByText(/Scene 1/);
    expect(screen.queryAllByRole('button', { name: /add note/i })).toHaveLength(0);
  });

  it('calls create API when adding a note', async () => {
    const user = userEvent.setup();

    mockCreate.mockResolvedValue({
      note: {
        id: 'note-new',
        scriptId: 'script-1',
        sceneNumber: 1,
        note: 'New note text',
        createdById: 'user-decider',
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(
      <DirectorNotesPanel
        scriptId="script-1"
        sceneData={sceneData}
        userRole="DECIDER"
        userId="user-decider"
      />,
    );

    await screen.findByText(/Scene 1/);

    // Click "Add Note" for scene 1
    const addButtons = screen.getAllByRole('button', { name: /add note/i });
    await user.click(addButtons[0]);

    // Type in the note textarea
    const textarea = screen.getByPlaceholderText(/director.s note/i);
    await user.type(textarea, 'New note text');

    // Submit
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('script-1', {
        sceneNumber: 1,
        note: 'New note text',
      });
    });
  });

  it('displays error when create fails', async () => {
    const user = userEvent.setup();

    mockCreate.mockRejectedValue(new Error('Server error'));

    render(
      <DirectorNotesPanel
        scriptId="script-1"
        sceneData={sceneData}
        userRole="DECIDER"
        userId="user-decider"
      />,
    );

    await screen.findByText(/Scene 1/);

    const addButtons = screen.getAllByRole('button', { name: /add note/i });
    await user.click(addButtons[0]);

    const textarea = screen.getByPlaceholderText(/director.s note/i);
    await user.type(textarea, 'Failing note');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/failed to create note/i)).toBeInTheDocument();
  });

  it('displays error when delete fails', async () => {
    const user = userEvent.setup();

    mockDelete.mockRejectedValue(new Error('Server error'));

    render(
      <DirectorNotesPanel
        scriptId="script-1"
        sceneData={sceneData}
        userRole="DECIDER"
        userId="user-decider"
      />,
    );

    // Wait for notes to load (note-1 is created by user-decider)
    await screen.findByText('More dramatic lighting');

    // Click delete on the first note
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(await screen.findByText(/failed to delete note/i)).toBeInTheDocument();
  });
});
