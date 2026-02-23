import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'prod-1' }),
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

// Import after mocks
import ProductionDashboard from '../app/productions/[id]/page';

const mockProduction = {
  id: 'prod-1',
  title: 'Film One',
  description: null,
  createdById: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  members: [
    {
      id: 'member-1',
      userId: 'user-1',
      role: 'OWNER',
      user: { id: 'user-1', name: 'Test Owner', email: 'owner@example.com' },
    },
  ],
  scripts: [],
};

describe('Production dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders production title', async () => {
    mockedApi.get.mockResolvedValue({ production: mockProduction });

    render(<ProductionDashboard />);

    expect(await screen.findByText('Film One')).toBeInTheDocument();
  });

  it('renders team member list', async () => {
    mockedApi.get.mockResolvedValue({ production: mockProduction });

    render(<ProductionDashboard />);

    expect(await screen.findByText('Test Owner')).toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();
  });

  it('renders "Add Member" form', async () => {
    mockedApi.get.mockResolvedValue({ production: mockProduction });

    render(<ProductionDashboard />);

    expect(await screen.findByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
  });

  it('renders scripts section with empty state', async () => {
    mockedApi.get.mockResolvedValue({ production: mockProduction });

    render(<ProductionDashboard />);

    expect(await screen.findByText('Scripts')).toBeInTheDocument();
    expect(screen.getByText(/no scripts uploaded/i)).toBeInTheDocument();
  });

  it('renders "Upload Script" link', async () => {
    mockedApi.get.mockResolvedValue({ production: mockProduction });

    render(<ProductionDashboard />);

    expect(await screen.findByRole('link', { name: /upload script/i })).toBeInTheDocument();
  });

  it('shows error message when load fails', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network error'));

    render(<ProductionDashboard />);

    expect(await screen.findByText(/failed to load production/i)).toBeInTheDocument();
  });
});
