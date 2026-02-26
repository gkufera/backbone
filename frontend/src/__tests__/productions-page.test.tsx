import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  productionsApi: {
    list: vi.fn(),
  },
}));

import { productionsApi } from '../lib/api';
const mockedProductionsApi = vi.mocked(productionsApi);

import ProductionsPage from '../app/productions/page';

describe('Productions page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('container uses max-w-3xl for wider layout', async () => {
    mockedProductionsApi.list.mockResolvedValue({ productions: [] });
    const { container } = render(<ProductionsPage />);

    await screen.findByText(/no productions yet/i);
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toContain('max-w-3xl');
  });

  it('heading and button container has gap-4', async () => {
    mockedProductionsApi.list.mockResolvedValue({ productions: [] });
    render(<ProductionsPage />);

    await screen.findByText(/no productions yet/i);
    const heading = screen.getByRole('heading', { name: /productions/i });
    const flexContainer = heading.parentElement as HTMLElement;
    expect(flexContainer.className).toContain('gap-4');
  });

  it('shows loading skeleton initially', () => {
    // Never resolve to keep loading state
    mockedProductionsApi.list.mockReturnValue(new Promise(() => {}));
    render(<ProductionsPage />);

    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });

  it('renders production list with titles', async () => {
    mockedProductionsApi.list.mockResolvedValue({
      productions: [
        { id: 'p1', title: 'Blade Runner 3', description: null, createdById: 'u1', createdAt: '', updatedAt: '' },
        { id: 'p2', title: 'Dune 4', description: 'Spice wars', createdById: 'u1', createdAt: '', updatedAt: '' },
      ],
    });

    render(<ProductionsPage />);

    expect(await screen.findByText('Blade Runner 3')).toBeInTheDocument();
    expect(screen.getByText('Dune 4')).toBeInTheDocument();
    expect(screen.getByText('Spice wars')).toBeInTheDocument();
  });

  it('shows empty state message when no productions', async () => {
    mockedProductionsApi.list.mockResolvedValue({ productions: [] });

    render(<ProductionsPage />);

    expect(await screen.findByText(/no productions yet/i)).toBeInTheDocument();
  });

  it('renders "Request Production" link with correct href', async () => {
    mockedProductionsApi.list.mockResolvedValue({ productions: [] });

    render(<ProductionsPage />);

    await screen.findByText(/no productions yet/i);
    const link = screen.getByRole('link', { name: /request production/i });
    expect(link).toHaveAttribute('href', '/productions/new');
  });

  it('renders production links with correct hrefs', async () => {
    mockedProductionsApi.list.mockResolvedValue({
      productions: [
        { id: 'p1', title: 'Film A', description: null, createdById: 'u1', createdAt: '', updatedAt: '' },
      ],
    });

    render(<ProductionsPage />);

    const link = await screen.findByRole('link', { name: /film a/i });
    expect(link).toHaveAttribute('href', '/productions/p1');
  });
});
