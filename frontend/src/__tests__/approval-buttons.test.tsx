import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalButtons } from '../components/approval-buttons';

describe('ApprovalButtons', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Approve, Reject, and Maybe buttons', () => {
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /maybe/i })).toBeInTheDocument();
  });

  it('calls onSubmit with APPROVED when approve is clicked', async () => {
    const user = userEvent.setup();
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith('APPROVED', undefined);
  });

  it('calls onSubmit with REJECTED when reject is clicked', async () => {
    const user = userEvent.setup();
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /reject/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith('REJECTED', undefined);
  });

  it('calls onSubmit with MAYBE when maybe is clicked', async () => {
    const user = userEvent.setup();
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /maybe/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith('MAYBE', undefined);
  });

  it('shows note textarea and submits note with decision', async () => {
    const user = userEvent.setup();
    render(<ApprovalButtons onSubmit={mockOnSubmit} />);

    const noteToggle = screen.getByRole('button', { name: /add note/i });
    await user.click(noteToggle);

    const textarea = screen.getByPlaceholderText(/note/i);
    await user.type(textarea, 'Looks good but needs adjustment');
    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith('APPROVED', 'Looks good but needs adjustment');
  });

  it('highlights current decision when provided', () => {
    render(<ApprovalButtons onSubmit={mockOnSubmit} currentDecision="APPROVED" />);

    const approveBtn = screen.getByRole('button', { name: /approve/i });
    expect(approveBtn.className).toMatch(/bg-black/);
  });

  it('disables all decision buttons when disabled prop is true', () => {
    render(<ApprovalButtons onSubmit={mockOnSubmit} disabled={true} />);

    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /maybe/i })).toBeDisabled();
  });
});
