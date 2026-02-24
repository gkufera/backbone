import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  authApi: {
    signup: vi.fn(),
    login: vi.fn(),
    me: vi.fn().mockRejectedValue(new Error('No token')),
  },
}));

import { AppHeader } from '../components/app-header';
import { AuthProvider } from '../lib/auth-context';

describe('AppHeader', () => {
  it('renders logo image linking to /', () => {
    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    const logo = screen.getByAltText('Slug Max');
    expect(logo).toBeInTheDocument();

    const link = logo.closest('a');
    expect(link).toHaveAttribute('href', '/');
  });

  it('logo has image-rendering: pixelated style', () => {
    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    const logo = screen.getByAltText('Slug Max');
    expect(logo).toHaveStyle({ imageRendering: 'pixelated' });
  });

  it('renders with 1-bit design (black bottom border)', () => {
    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('border-b-2');
    expect(header).toHaveClass('border-black');
  });
});
