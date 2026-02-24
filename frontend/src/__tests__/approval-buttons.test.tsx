import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalButtons } from '../components/approval-buttons';

describe('ApprovalButtons', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Y, M, N buttons', () => {
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    expect(screen.getByRole('button', { name: 'Y' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'N' })).toBeInTheDocument();
  });

  it('clicking Y calls onSubmit with APPROVED', async () => {
    const user = userEvent.setup();
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Y' }));
    expect(mockOnSubmit).toHaveBeenCalledWith('APPROVED', undefined);
  });

  it('clicking M calls onSubmit with MAYBE', async () => {
    const user = userEvent.setup();
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: 'M' }));
    expect(mockOnSubmit).toHaveBeenCalledWith('MAYBE', undefined);
  });

  it('clicking N calls onSubmit with REJECTED', async () => {
    const user = userEvent.setup();
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: 'N' }));
    expect(mockOnSubmit).toHaveBeenCalledWith('REJECTED', undefined);
  });

  it('buttons are disabled when disabled prop is true', () => {
    render(<ApprovalButtons onSubmit={mockOnSubmit} disabled />);

    expect(screen.getByRole('button', { name: 'Y' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'M' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'N' })).toBeDisabled();
  });

  it('shows note textarea and submits note with decision', async () => {
    const user = userEvent.setup();
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    const noteToggle = screen.getByRole('button', { name: /note/i });
    await user.click(noteToggle);

    const textarea = screen.getByPlaceholderText(/note/i);
    await user.type(textarea, 'Looks good but needs adjustment');
    await user.click(screen.getByRole('button', { name: 'Y' }));

    expect(mockOnSubmit).toHaveBeenCalledWith('APPROVED', 'Looks good but needs adjustment');
  });
});
