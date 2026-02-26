import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockSearchParams = new URLSearchParams('token=valid-token');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('../lib/api', () => ({
  productionsApi: {
    approve: vi.fn(),
  },
}));

import { productionsApi } from '../lib/api';
import ApproveProductionPage from '../app/approve-production/page';

const mockedApi = vi.mocked(productionsApi);

describe('Approve Production page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('token=valid-token');
  });

  it('shows approving state initially', () => {
    mockedApi.approve.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ApproveProductionPage />);
    expect(screen.getByText(/approving/i)).toBeInTheDocument();
  });

  it('shows success message on approval', async () => {
    mockedApi.approve.mockResolvedValue({
      message: 'Production approved successfully',
      productionTitle: 'My Film',
    });

    render(<ApproveProductionPage />);

    expect(await screen.findByText(/approved/i)).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    mockedApi.approve.mockRejectedValue(new Error('Invalid token'));

    render(<ApproveProductionPage />);

    expect(await screen.findByText(/invalid token/i)).toBeInTheDocument();
  });

  it('shows error when no token provided', async () => {
    mockSearchParams = new URLSearchParams('');

    render(<ApproveProductionPage />);

    expect(await screen.findByText(/no.*token/i)).toBeInTheDocument();
  });
});
