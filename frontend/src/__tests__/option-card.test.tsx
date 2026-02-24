import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OptionCard } from '../components/option-card';
import type { ApprovalResponse } from '../lib/api';

const mockOption = {
  id: 'opt-1',
  elementId: 'elem-1',
  mediaType: 'IMAGE',
  description: 'Costume reference photo',
  s3Key: 'options/uuid/photo.jpg',
  fileName: 'photo.jpg',
  externalUrl: null,
  thumbnailS3Key: null,
  status: 'ACTIVE',
  readyForReview: false,
  uploadedById: 'user-1',
  uploadedBy: { id: 'user-1', name: 'Test User' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('OptionCard', () => {
  const mockOnToggleReady = vi.fn();
  const mockOnArchive = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders description', () => {
    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
      />,
    );

    expect(screen.getByText('Costume reference photo')).toBeInTheDocument();
  });

  it('renders media type badge for IMAGE', () => {
    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
      />,
    );

    expect(screen.getByText('IMAGE')).toBeInTheDocument();
  });

  it('renders media type badge for LINK', () => {
    const linkOption = {
      ...mockOption,
      id: 'opt-2',
      mediaType: 'LINK',
      externalUrl: 'https://example.com',
      s3Key: null,
      fileName: null,
    };

    render(
      <OptionCard
        option={linkOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
      />,
    );

    expect(screen.getByText('LINK')).toBeInTheDocument();
  });

  it('shows ready indicator when readyForReview is true', () => {
    const readyOption = { ...mockOption, readyForReview: true };

    render(
      <OptionCard
        option={readyOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
      />,
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('calls onToggleReady when toggle button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
      />,
    );

    await user.click(screen.getByRole('button', { name: /ready/i }));
    expect(mockOnToggleReady).toHaveBeenCalledWith('opt-1');
  });

  it('calls onArchive when archive button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
      />,
    );

    await user.click(screen.getByRole('button', { name: /archive/i }));
    expect(mockOnArchive).toHaveBeenCalledWith('opt-1');
  });

  it('renders approval decision badge when latestDecision is provided', () => {
    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
        latestDecision="APPROVED"
      />,
    );

    expect(screen.getByText('APPROVED')).toBeInTheDocument();
  });

  it('renders approval buttons when onApprove is provided', () => {
    const mockOnApprove = vi.fn();

    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
        onApprove={mockOnApprove}
      />,
    );

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /maybe/i })).toBeInTheDocument();
  });

  it('renders approval history when approvals are provided', () => {
    const approvals: ApprovalResponse[] = [
      {
        id: 'appr-1',
        optionId: 'opt-1',
        userId: 'user-1',
        decision: 'APPROVED',
        note: 'Looks great',
        tentative: false,
        createdAt: '2026-02-23T12:00:00Z',
        updatedAt: '2026-02-23T12:00:00Z',
        user: { id: 'user-1', name: 'Jane Director' },
      },
    ];

    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
        approvals={approvals}
      />,
    );

    expect(screen.getByText('Jane Director')).toBeInTheDocument();
    expect(screen.getByText(/Looks great/)).toBeInTheDocument();
  });

  it('renders confirm button for tentative approvals when onConfirm is provided', () => {
    const mockOnConfirm = vi.fn();
    const approvals: ApprovalResponse[] = [
      {
        id: 'appr-1',
        optionId: 'opt-1',
        userId: 'user-2',
        decision: 'APPROVED',
        note: null,
        tentative: true,
        createdAt: '2026-02-23T12:00:00Z',
        updatedAt: '2026-02-23T12:00:00Z',
        user: { id: 'user-2', name: 'Alice Member' },
      },
    ];

    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
        approvals={approvals}
        onConfirmApproval={mockOnConfirm}
      />,
    );

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('does not render confirm button when onConfirm is not provided', () => {
    const approvals: ApprovalResponse[] = [
      {
        id: 'appr-1',
        optionId: 'opt-1',
        userId: 'user-2',
        decision: 'APPROVED',
        note: null,
        tentative: true,
        createdAt: '2026-02-23T12:00:00Z',
        updatedAt: '2026-02-23T12:00:00Z',
        user: { id: 'user-2', name: 'Alice Member' },
      },
    ];

    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
        approvals={approvals}
      />,
    );

    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });

  it('calls onConfirmApproval when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = vi.fn();
    const approvals: ApprovalResponse[] = [
      {
        id: 'appr-1',
        optionId: 'opt-1',
        userId: 'user-2',
        decision: 'APPROVED',
        note: null,
        tentative: true,
        createdAt: '2026-02-23T12:00:00Z',
        updatedAt: '2026-02-23T12:00:00Z',
        user: { id: 'user-2', name: 'Alice Member' },
      },
    ];

    render(
      <OptionCard
        option={mockOption}
        onToggleReady={mockOnToggleReady}
        onArchive={mockOnArchive}
        approvals={approvals}
        onConfirmApproval={mockOnConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(mockOnConfirm).toHaveBeenCalledWith('appr-1');
  });
});
