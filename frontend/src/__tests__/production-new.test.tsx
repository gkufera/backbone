import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
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
import NewProductionPage from '../app/productions/new/page';

const mockedApi = vi.mocked(productionsApi);

describe('New Production page (request form)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('heading says "Request a Production"', () => {
    render(<NewProductionPage />);
    expect(screen.getByRole('heading', { name: /request a production/i })).toBeInTheDocument();
  });

  it('renders all required fields', () => {
    render(<NewProductionPage />);

    expect(screen.getByLabelText(/production title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/studio name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
  });

  it('shows info text about sales team', () => {
    render(<NewProductionPage />);
    expect(screen.getByText(/reviewed by our sales team/i)).toBeInTheDocument();
  });

  it('pre-fills name and email from auth context', () => {
    render(<NewProductionPage />);

    expect(screen.getByLabelText(/your name/i)).toHaveValue('Test User');
    expect(screen.getByLabelText(/contact email/i)).toHaveValue('test@example.com');
  });

  it('submit calls API with all fields', async () => {
    const user = userEvent.setup();

    mockedApi.create.mockResolvedValue({
      production: {
        id: 'prod-1',
        title: 'My Film',
        description: null,
        createdById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'PENDING',
      },
      member: { id: 'member-1', productionId: 'prod-1', userId: 'user-1', role: 'ADMIN' },
    });

    render(<NewProductionPage />);

    await user.type(screen.getByLabelText(/production title/i), 'My Film');
    await user.type(screen.getByLabelText(/studio name/i), 'Big Studio');
    await user.type(screen.getByLabelText(/budget/i), '$1M');
    // Name and email are pre-filled from auth context
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(mockedApi.create).toHaveBeenCalledWith({
      title: 'My Film',
      studioName: 'Big Studio',
      budget: '$1M',
      contactName: 'Test User',
      contactEmail: 'test@example.com',
    });
  });

  it('shows success message after submit (no redirect)', async () => {
    const user = userEvent.setup();

    mockedApi.create.mockResolvedValue({
      production: {
        id: 'prod-1',
        title: 'My Film',
        description: null,
        createdById: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'PENDING',
      },
      member: { id: 'member-1', productionId: 'prod-1', userId: 'user-1', role: 'ADMIN' },
    });

    render(<NewProductionPage />);

    await user.type(screen.getByLabelText(/production title/i), 'My Film');
    await user.type(screen.getByLabelText(/studio name/i), 'Big Studio');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(await screen.findByText(/request has been submitted/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows error on failure', async () => {
    const user = userEvent.setup();

    mockedApi.create.mockRejectedValue(new Error('Title is required'));

    render(<NewProductionPage />);

    await user.type(screen.getByLabelText(/production title/i), 'My Film');
    await user.type(screen.getByLabelText(/studio name/i), 'Big Studio');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/title is required/i);
  });

  it('validates required fields client-side', async () => {
    const user = userEvent.setup();

    render(<NewProductionPage />);

    // Clear pre-filled fields
    await user.clear(screen.getByLabelText(/your name/i));
    await user.clear(screen.getByLabelText(/contact email/i));

    await user.click(screen.getByRole('button', { name: /submit request/i }));

    // API should NOT have been called
    expect(mockedApi.create).not.toHaveBeenCalled();
  });
});
