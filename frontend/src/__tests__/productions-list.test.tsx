import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductionsPage from '../app/productions/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  authApi: { signup: vi.fn(), login: vi.fn(), me: vi.fn() },
  productionsApi: {
    create: vi.fn(),
    approve: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    addMember: vi.fn(),
    listMembers: vi.fn(),
    removeMember: vi.fn(),
  },
}));

import { productionsApi } from '../lib/api';
const mockedApi = vi.mocked(productionsApi);

describe('Productions list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders list of user's productions", async () => {
    mockedApi.list.mockResolvedValue({
      productions: [
        {
          id: 'prod-1',
          title: 'Film One',
          description: null,
          createdById: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'ACTIVE',
        },
        {
          id: 'prod-2',
          title: 'Film Two',
          description: 'A great film',
          createdById: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'ACTIVE',
        },
      ],
    });

    render(<ProductionsPage />);

    expect(await screen.findByText('Film One')).toBeInTheDocument();
    expect(screen.getByText('Film Two')).toBeInTheDocument();
  });

  it('renders "New Production" link', async () => {
    mockedApi.list.mockResolvedValue({ productions: [] });

    render(<ProductionsPage />);

    expect(await screen.findByRole('link', { name: /new production/i })).toBeInTheDocument();
  });

  it('shows empty state when no productions', async () => {
    mockedApi.list.mockResolvedValue({ productions: [] });

    render(<ProductionsPage />);

    expect(await screen.findByText(/no productions/i)).toBeInTheDocument();
  });

  it('shows error message when load fails', async () => {
    mockedApi.list.mockRejectedValue(new Error('Network error'));

    render(<ProductionsPage />);

    expect(await screen.findByText(/failed to load productions/i)).toBeInTheDocument();
  });

  it('PENDING productions show "PENDING APPROVAL" badge', async () => {
    mockedApi.list.mockResolvedValue({
      productions: [
        {
          id: 'prod-1',
          title: 'Pending Film',
          description: null,
          createdById: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'PENDING',
        },
      ],
    });

    render(<ProductionsPage />);

    expect(await screen.findByText('Pending Film')).toBeInTheDocument();
    expect(screen.getByText('PENDING APPROVAL')).toBeInTheDocument();
  });

  it('ACTIVE productions render without badge', async () => {
    mockedApi.list.mockResolvedValue({
      productions: [
        {
          id: 'prod-1',
          title: 'Active Film',
          description: null,
          createdById: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'ACTIVE',
        },
      ],
    });

    render(<ProductionsPage />);

    expect(await screen.findByText('Active Film')).toBeInTheDocument();
    expect(screen.queryByText('PENDING APPROVAL')).not.toBeInTheDocument();
  });
});
