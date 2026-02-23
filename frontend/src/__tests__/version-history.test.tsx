import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'prod-1', scriptId: 'script-3' }),
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
}));

import { scriptsApi } from '../lib/api';
const mockedScriptsApi = vi.mocked(scriptsApi);

import VersionHistoryPage from '../app/productions/[id]/scripts/[scriptId]/versions/page';

describe('Version history page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders versions in descending order', async () => {
    mockedScriptsApi.getVersions.mockResolvedValue({
      versions: [
        {
          id: 'script-3',
          title: 'My Script',
          version: 3,
          status: 'READY',
          pageCount: 130,
          createdAt: '2026-03-01T00:00:00Z',
          parentScriptId: 'script-2',
        },
        {
          id: 'script-2',
          title: 'My Script',
          version: 2,
          status: 'READY',
          pageCount: 125,
          createdAt: '2026-02-15T00:00:00Z',
          parentScriptId: 'script-1',
        },
        {
          id: 'script-1',
          title: 'My Script',
          version: 1,
          status: 'READY',
          pageCount: 120,
          createdAt: '2026-02-01T00:00:00Z',
          parentScriptId: null,
        },
      ],
    });

    render(<VersionHistoryPage />);

    const items = await screen.findAllByText(/v\d/);
    // v3, v2, v1 should appear in that order
    expect(items[0]).toHaveTextContent('v3');
    expect(items[1]).toHaveTextContent('v2');
    expect(items[2]).toHaveTextContent('v1');
  });

  it('current version marked', async () => {
    mockedScriptsApi.getVersions.mockResolvedValue({
      versions: [
        {
          id: 'script-3',
          title: 'My Script',
          version: 3,
          status: 'READY',
          pageCount: 130,
          createdAt: '2026-03-01T00:00:00Z',
          parentScriptId: 'script-2',
        },
        {
          id: 'script-1',
          title: 'My Script',
          version: 1,
          status: 'READY',
          pageCount: 120,
          createdAt: '2026-02-01T00:00:00Z',
          parentScriptId: null,
        },
      ],
    });

    render(<VersionHistoryPage />);

    expect(await screen.findByText('Current')).toBeInTheDocument();
  });

  it('older versions have links', async () => {
    mockedScriptsApi.getVersions.mockResolvedValue({
      versions: [
        {
          id: 'script-3',
          title: 'My Script',
          version: 3,
          status: 'READY',
          pageCount: 130,
          createdAt: '2026-03-01T00:00:00Z',
          parentScriptId: 'script-2',
        },
        {
          id: 'script-1',
          title: 'My Script',
          version: 1,
          status: 'READY',
          pageCount: 120,
          createdAt: '2026-02-01T00:00:00Z',
          parentScriptId: null,
        },
      ],
    });

    render(<VersionHistoryPage />);

    await screen.findByText('Current');

    const links = screen.getAllByRole('link');
    const v1Link = links.find((l) => l.getAttribute('href')?.includes('script-1'));
    expect(v1Link).toBeTruthy();
  });

  it('single version displayed correctly', async () => {
    mockedScriptsApi.getVersions.mockResolvedValue({
      versions: [
        {
          id: 'script-3',
          title: 'My Script',
          version: 1,
          status: 'READY',
          pageCount: 120,
          createdAt: '2026-02-01T00:00:00Z',
          parentScriptId: null,
        },
      ],
    });

    render(<VersionHistoryPage />);

    expect(await screen.findByText('v1')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText(/120 pages/i)).toBeInTheDocument();
  });
});
