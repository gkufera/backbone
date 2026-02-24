import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockUsePathname(),
}));

vi.mock('../lib/api', () => ({
  authApi: {
    signup: vi.fn(),
    login: vi.fn(),
    me: vi.fn().mockRejectedValue(new Error('No token')),
  },
  productionsApi: {
    get: vi.fn(),
  },
  notificationsApi: {
    unreadCount: vi.fn(),
    list: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

import { productionsApi, notificationsApi } from '../lib/api';
const mockedProductionsApi = vi.mocked(productionsApi);
const mockedNotificationsApi = vi.mocked(notificationsApi);

import { AppHeader } from '../components/app-header';
import { AuthProvider } from '../lib/auth-context';

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  it('renders logo image linking to / on non-homepage routes', () => {
    mockUsePathname.mockReturnValue('/settings');

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
    mockUsePathname.mockReturnValue('/settings');

    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    const logo = screen.getByAltText('Slug Max');
    expect(logo).toHaveStyle({ imageRendering: 'pixelated' });
  });

  it('renders with 1-bit design (black bottom border)', () => {
    mockUsePathname.mockReturnValue('/settings');

    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('border-b-2');
    expect(header).toHaveClass('border-black');
  });

  it('shows breadcrumb with production name on production pages', async () => {
    mockUsePathname.mockReturnValue('/productions/prod-1/scripts/s1');
    mockedProductionsApi.get.mockResolvedValue({
      production: {
        id: 'prod-1',
        title: 'My Film',
        description: null,
        createdById: 'user-1',
        memberRole: 'ADMIN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
        scripts: [],
      },
    });
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });

    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('My Film')).toBeInTheDocument();
    });
  });

  it('shows notification bell on production pages', async () => {
    mockUsePathname.mockReturnValue('/productions/prod-1');
    mockedProductionsApi.get.mockResolvedValue({
      production: {
        id: 'prod-1',
        title: 'My Film',
        description: null,
        createdById: 'user-1',
        memberRole: 'ADMIN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
        scripts: [],
      },
    });
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 3 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });

    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    });
  });

  it('hamburger menu button exists with aria-label "Menu"', () => {
    mockUsePathname.mockReturnValue('/settings');

    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    expect(screen.getByLabelText('Menu')).toBeInTheDocument();
  });

  it('clicking hamburger opens mobile nav', async () => {
    mockUsePathname.mockReturnValue('/settings');
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    await user.click(screen.getByLabelText('Menu'));
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
  });

  it('mobile nav closes when pathname changes', () => {
    const { fireEvent } = require('@testing-library/react');

    mockUsePathname.mockReturnValue('/settings');

    const { rerender } = render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    // Open the mobile nav
    fireEvent.click(screen.getByLabelText('Menu'));
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();

    // Simulate a route change
    mockUsePathname.mockReturnValue('/productions/prod-1');
    rerender(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument();
  });

  it('does not render header on homepage', () => {
    mockUsePathname.mockReturnValue('/');

    const { container } = render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    expect(container.querySelector('header')).toBeNull();
  });

  it('shows logo image on non-homepage routes', () => {
    mockUsePathname.mockReturnValue('/settings');

    render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    const logo = screen.getByAltText('Slug Max');
    expect(logo).toBeInTheDocument();
    expect(logo.closest('a')).toHaveAttribute('href', '/');
  });

  it('does not render anything on homepage (no breadcrumb, bell, or nav)', () => {
    mockUsePathname.mockReturnValue('/');

    const { container } = render(
      <AuthProvider>
        <AppHeader />
      </AuthProvider>,
    );

    // Entire component returns null on homepage
    expect(container.innerHTML).toBe('');
  });
});
