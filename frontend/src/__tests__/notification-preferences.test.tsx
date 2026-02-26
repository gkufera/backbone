import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api', () => ({
  notificationPreferencesApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

import { notificationPreferencesApi } from '../lib/api';
import { NotificationPreferences } from '../components/notification-preferences';

const mockedApi = vi.mocked(notificationPreferencesApi);

const defaultPrefs = {
  optionEmails: true,
  noteEmails: true,
  approvalEmails: true,
  scriptEmails: true,
  memberEmails: true,
  scopeFilter: 'ALL',
};

describe('NotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders category checkboxes with correct labels', async () => {
    mockedApi.get.mockResolvedValue({ preferences: defaultPrefs });

    render(<NotificationPreferences productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByText('Options')).toBeInTheDocument();
    });
    expect(screen.getByText('Approvals')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Scripts')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  it('toggles checkbox and calls PATCH API', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockResolvedValue({ preferences: defaultPrefs });
    mockedApi.update.mockResolvedValue({
      preferences: { ...defaultPrefs, optionEmails: false },
    });

    render(<NotificationPreferences productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByText('Options')).toBeInTheDocument();
    });

    const optionsCheckbox = screen.getByRole('checkbox', { name: /options/i });
    expect(optionsCheckbox).toBeChecked();

    await user.click(optionsCheckbox);

    expect(mockedApi.update).toHaveBeenCalledWith('prod-1', {
      optionEmails: false,
    });
  });

  it('shows loading state while fetching', () => {
    mockedApi.get.mockReturnValue(new Promise(() => {})); // never resolves

    render(<NotificationPreferences productionId="prod-1" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network error'));

    render(<NotificationPreferences productionId="prod-1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load notification preferences')).toBeInTheDocument();
    });
  });
});
