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
});
