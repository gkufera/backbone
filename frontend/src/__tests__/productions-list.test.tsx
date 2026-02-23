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
        },
        {
          id: 'prod-2',
          title: 'Film Two',
          description: 'A great film',
          createdById: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
});
