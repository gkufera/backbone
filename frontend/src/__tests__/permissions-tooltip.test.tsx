import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { PermissionsTooltip } from '../components/permissions-tooltip';

describe('PermissionsTooltip', () => {
  it('renders info icon button', () => {
    render(<PermissionsTooltip role="MEMBER" />);

    expect(screen.getByRole('button', { name: /permissions info/i })).toBeInTheDocument();
  });

  it('shows tooltip content for MEMBER on click', async () => {
    const user = userEvent.setup();
    render(<PermissionsTooltip role="MEMBER" />);

    await user.click(screen.getByRole('button', { name: /permissions info/i }));

    expect(screen.getByText(/tentative/i)).toBeInTheDocument();
  });

  it('shows tooltip content for DECIDER on click', async () => {
    const user = userEvent.setup();
    render(<PermissionsTooltip role="DECIDER" />);

    await user.click(screen.getByRole('button', { name: /permissions info/i }));

    expect(screen.getByText(/official/i)).toBeInTheDocument();
  });

  it('shows tooltip content for ADMIN on click', async () => {
    const user = userEvent.setup();
    render(<PermissionsTooltip role="ADMIN" />);

    await user.click(screen.getByRole('button', { name: /permissions info/i }));

    expect(screen.getByText(/tentative/i)).toBeInTheDocument();
  });

  it('hides tooltip on second click', async () => {
    const user = userEvent.setup();
    render(<PermissionsTooltip role="MEMBER" />);

    const btn = screen.getByRole('button', { name: /permissions info/i });
    await user.click(btn);
    expect(screen.getByText(/tentative/i)).toBeInTheDocument();

    await user.click(btn);
    expect(screen.queryByText(/tentative/i)).not.toBeInTheDocument();
  });

  it('uses white border/text when inverted prop is true', () => {
    render(<PermissionsTooltip role="MEMBER" inverted />);

    const btn = screen.getByRole('button', { name: /permissions info/i });
    expect(btn).toHaveClass('border-white');
    expect(btn).toHaveClass('text-white');
  });

  it('uses black border/text when inverted prop is false', () => {
    render(<PermissionsTooltip role="MEMBER" />);

    const btn = screen.getByRole('button', { name: /permissions info/i });
    expect(btn).toHaveClass('border-black');
    expect(btn).toHaveClass('text-black');
  });

  it('tooltip popup text includes role name prefix', async () => {
    const user = userEvent.setup();
    render(<PermissionsTooltip role="DECIDER" />);

    await user.click(screen.getByRole('button', { name: /permissions info/i }));

    expect(screen.getByText(/DECIDER —/)).toBeInTheDocument();
  });
});
