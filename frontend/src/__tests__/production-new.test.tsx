import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewProductionPage from '../app/productions/new/page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
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

describe('New Production page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with title input and submit button', () => {
    render(<NewProductionPage />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('calls productionsApi.create on submit', async () => {
    const user = userEvent.setup();

    mockedApi.create.mockResolvedValue({
      production: {
        id: 'prod-1',
        title: 'My Film',
        description: null,
        createdById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      member: { id: 'member-1', productionId: 'prod-1', userId: 'user-1', role: 'OWNER' },
    });

    render(<NewProductionPage />);

    await user.type(screen.getByLabelText(/title/i), 'My Film');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(mockedApi.create).toHaveBeenCalledWith({ title: 'My Film' });
  });

  it('redirects to /productions/[id] on success', async () => {
    const user = userEvent.setup();

    mockedApi.create.mockResolvedValue({
      production: {
        id: 'prod-1',
        title: 'My Film',
        description: null,
        createdById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      member: { id: 'member-1', productionId: 'prod-1', userId: 'user-1', role: 'OWNER' },
    });

    render(<NewProductionPage />);

    await user.type(screen.getByLabelText(/title/i), 'My Film');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(mockPush).toHaveBeenCalledWith('/productions/prod-1');
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();

    mockedApi.create.mockRejectedValue(new Error('Title is required'));

    render(<NewProductionPage />);

    await user.type(screen.getByLabelText(/title/i), 'My Film');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/title is required/i);
  });
});
