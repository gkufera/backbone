import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundaryUI } from '../components/error-boundary-ui';

describe('ErrorBoundaryUI', () => {
  it('renders error message and retry button', () => {
    render(<ErrorBoundaryUI error={new Error('Test error')} reset={vi.fn()} />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retry button calls reset function', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<ErrorBoundaryUI error={new Error('Test error')} reset={reset} />);

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
