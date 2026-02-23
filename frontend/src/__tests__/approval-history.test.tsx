import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ApprovalHistory } from '../components/approval-history';

const mockApprovals = [
  {
    id: 'appr-1',
    optionId: 'opt-1',
    userId: 'user-1',
    decision: 'APPROVED',
    note: 'Perfect choice',
    createdAt: '2026-02-23T12:00:00Z',
    updatedAt: '2026-02-23T12:00:00Z',
    user: { id: 'user-1', name: 'Jane Director' },
  },
  {
    id: 'appr-2',
    optionId: 'opt-1',
    userId: 'user-1',
    decision: 'REJECTED',
    note: null,
    createdAt: '2026-02-22T12:00:00Z',
    updatedAt: '2026-02-22T12:00:00Z',
    user: { id: 'user-1', name: 'Jane Director' },
  },
];

describe('ApprovalHistory', () => {
  it('renders approval entries with user name and decision badge', () => {
    render(<ApprovalHistory approvals={mockApprovals} />);

    const names = screen.getAllByText('Jane Director');
    expect(names.length).toBe(2);
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
  });

  it('shows note text when present', () => {
    render(<ApprovalHistory approvals={mockApprovals} />);

    expect(screen.getByText(/Perfect choice/)).toBeInTheDocument();
  });
});
