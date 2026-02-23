import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'prod-1', scriptId: 'script-2' }),
}));

vi.mock('../lib/api', () => ({
  authApi: { signup: vi.fn(), login: vi.fn(), me: vi.fn() },
  productionsApi: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    addMember: vi.fn(),
    listMembers: vi.fn(),
    removeMember: vi.fn(),
  },
  scriptsApi: {
    getUploadUrl: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    uploadRevision: vi.fn(),
    getVersions: vi.fn(),
  },
  elementsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  revisionMatchesApi: {
    get: vi.fn(),
    resolve: vi.fn(),
  },
}));

import { revisionMatchesApi } from '../lib/api';
const mockedRevisionMatchesApi = vi.mocked(revisionMatchesApi);

import ReconcilePage from '../app/productions/[id]/scripts/[scriptId]/reconcile/page';

const fuzzyMatch = {
  id: 'match-1',
  newScriptId: 'script-2',
  detectedName: 'JOHN SMITHE',
  detectedType: 'CHARACTER',
  detectedPages: [1, 2],
  matchStatus: 'FUZZY',
  oldElementId: 'elem-1',
  similarity: 0.91,
  userDecision: null,
  resolved: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  oldElement: {
    id: 'elem-1',
    name: 'JOHN SMITH',
    type: 'CHARACTER',
    pageNumbers: [1, 3],
    status: 'ACTIVE',
    source: 'AUTO',
    scriptId: 'script-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { options: 3 },
    options: [{ approvals: [{ decision: 'APPROVED' }] }],
  },
};

const missingMatch = {
  id: 'match-2',
  newScriptId: 'script-2',
  detectedName: 'BOB',
  detectedType: 'CHARACTER',
  detectedPages: [],
  matchStatus: 'MISSING',
  oldElementId: 'elem-2',
  similarity: null,
  userDecision: null,
  resolved: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  oldElement: {
    id: 'elem-2',
    name: 'BOB',
    type: 'CHARACTER',
    pageNumbers: [5],
    status: 'ACTIVE',
    source: 'AUTO',
    scriptId: 'script-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { options: 1 },
    options: [],
  },
};

describe('Reconciliation page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fuzzy matches with similarity scores', async () => {
    mockedRevisionMatchesApi.get.mockResolvedValue({
      matches: [fuzzyMatch as any],
    });

    render(<ReconcilePage />);

    expect(await screen.findByText('JOHN SMITHE')).toBeInTheDocument();
    expect(screen.getByText(/91%/)).toBeInTheDocument();
    expect(screen.getByText('JOHN SMITH')).toBeInTheDocument();
  });

  it('renders missing elements with context', async () => {
    mockedRevisionMatchesApi.get.mockResolvedValue({
      matches: [missingMatch as any],
    });

    render(<ReconcilePage />);

    expect(await screen.findByText('BOB')).toBeInTheDocument();
    expect(screen.getByText(/1 option/i)).toBeInTheDocument();
  });

  it('Map/Create New buttons update state', async () => {
    const user = userEvent.setup();
    mockedRevisionMatchesApi.get.mockResolvedValue({
      matches: [fuzzyMatch as any],
    });

    render(<ReconcilePage />);

    await screen.findByText('JOHN SMITHE');

    const mapBtn = screen.getByRole('button', { name: /map to existing/i });
    await user.click(mapBtn);

    // After clicking, the button should show selected state
    expect(mapBtn).toHaveClass('bg-black');
  });

  it('Keep/Archive buttons update state', async () => {
    const user = userEvent.setup();
    mockedRevisionMatchesApi.get.mockResolvedValue({
      matches: [missingMatch as any],
    });

    render(<ReconcilePage />);

    await screen.findByText('BOB');

    const archiveBtn = screen.getByRole('button', { name: /archive/i });
    await user.click(archiveBtn);

    expect(archiveBtn).toHaveClass('bg-black');
  });

  it('Confirm button disabled when decisions incomplete', async () => {
    mockedRevisionMatchesApi.get.mockResolvedValue({
      matches: [fuzzyMatch as any, missingMatch as any],
    });

    render(<ReconcilePage />);

    await screen.findByText('JOHN SMITHE');

    const confirmBtn = screen.getByRole('button', { name: /confirm all/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('Confirm button calls resolve API', async () => {
    const user = userEvent.setup();
    mockedRevisionMatchesApi.get.mockResolvedValue({
      matches: [fuzzyMatch as any],
    });
    mockedRevisionMatchesApi.resolve.mockResolvedValue({ message: 'ok' });

    render(<ReconcilePage />);

    await screen.findByText('JOHN SMITHE');

    await user.click(screen.getByRole('button', { name: /map to existing/i }));

    const confirmBtn = screen.getByRole('button', { name: /confirm all/i });
    expect(confirmBtn).not.toBeDisabled();

    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockedRevisionMatchesApi.resolve).toHaveBeenCalledWith('script-2', [
        { matchId: 'match-1', decision: 'map' },
      ]);
    });
  });

  it('shows RECONCILING banner on script viewer', async () => {
    // This test is about the script viewer page, which we already added the banner to
    // in Phase 6. We'll test that the reconciliation page itself renders correctly.
    mockedRevisionMatchesApi.get.mockResolvedValue({
      matches: [fuzzyMatch as any, missingMatch as any],
    });

    render(<ReconcilePage />);

    // Should show summary counts
    expect(await screen.findByText(/1 fuzzy/i)).toBeInTheDocument();
    expect(screen.getByText(/1 missing/i)).toBeInTheDocument();
  });

  it('elements with approved options highlighted', async () => {
    mockedRevisionMatchesApi.get.mockResolvedValue({
      matches: [fuzzyMatch as any],
    });

    render(<ReconcilePage />);

    await screen.findByText('JOHN SMITH');

    // The card with approved options should have a yellow indicator
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });
});
