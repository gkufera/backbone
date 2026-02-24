import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '../lib/toast-context';
import { ToastContainer } from '../components/toast-container';

function TestComponent() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.show('Profile saved')}>Show Toast</button>
      <button onClick={() => toast.show('Something failed', 'error')}>Show Error</button>
    </>
  );
}

function renderWithToast(ui?: React.ReactNode) {
  return render(
    <ToastProvider>
      {ui ?? <TestComponent />}
      <ToastContainer />
    </ToastProvider>,
  );
}

describe('Toast notification system', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ToastProvider renders children', () => {
    render(
      <ToastProvider>
        <p>Hello</p>
      </ToastProvider>,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('useToast().show() displays a toast message', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    renderWithToast();

    await user.click(screen.getByText('Show Toast'));

    expect(screen.getByText('Profile saved')).toBeInTheDocument();
  });

  it('toast auto-dismisses after timeout', async () => {
    renderWithToast();

    act(() => {
      // Trigger toast via a direct render approach
      screen.getByText('Show Toast').click();
    });

    expect(screen.getByText('Profile saved')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Profile saved')).not.toBeInTheDocument();
  });

  it('toast dismiss button removes it immediately', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    renderWithToast();

    await user.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Profile saved')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Profile saved')).not.toBeInTheDocument();
  });

  it('multiple toasts stack', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    renderWithToast();

    await user.click(screen.getByText('Show Toast'));
    await user.click(screen.getByText('Show Error'));

    expect(screen.getByText('Profile saved')).toBeInTheDocument();
    expect(screen.getByText('Something failed')).toBeInTheDocument();
  });
});
