import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FeedCard } from '../components/feed-card';

const mockElement = {
  id: 'elem-1',
  scriptId: 'script-1',
  name: 'JOHN',
  type: 'CHARACTER',
  highlightPage: 1,
  highlightText: 'JOHN',
  departmentId: null,
  status: 'ACTIVE',
  source: 'AUTO',
  workflowState: 'OUTSTANDING',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  options: [
    {
      id: 'opt-1',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      description: 'Costume reference',
      externalUrl: null,
      assets: [
        { id: 'a1', s3Key: 'options/uuid/photo.jpg', fileName: 'photo.jpg', thumbnailS3Key: null, mediaType: 'IMAGE', sortOrder: 0, optionId: 'opt-1', createdAt: new Date().toISOString() },
      ],
      status: 'ACTIVE',
      readyForReview: true,
      uploadedById: 'user-2',
      uploadedBy: { id: 'user-2', name: 'Alice' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvals: [],
    },
    {
      id: 'opt-2',
      elementId: 'elem-1',
      mediaType: 'LINK',
      description: 'Mood board',
      externalUrl: 'https://example.com',
      assets: [],
      status: 'ACTIVE',
      readyForReview: true,
      uploadedById: 'user-3',
      uploadedBy: { id: 'user-3', name: 'Bob' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvals: [
        {
          id: 'appr-1',
          optionId: 'opt-2',
          userId: 'user-1',
          decision: 'APPROVED',
          note: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: 'user-1', name: 'Jane Director' },
        },
      ],
    },
  ],
};

describe('FeedCard', () => {
  it('renders element name and type badge', () => {
    render(<FeedCard element={mockElement} productionId="prod-1" scriptId="script-1" />);

    expect(screen.getByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('CHARACTER')).toBeInTheDocument();
  });

  it('renders page numbers', () => {
    render(<FeedCard element={mockElement} productionId="prod-1" scriptId="script-1" />);

    expect(screen.getByText(/p\. 1/)).toBeInTheDocument();
  });

  it('renders option count', () => {
    render(<FeedCard element={mockElement} productionId="prod-1" scriptId="script-1" />);

    expect(screen.getByText(/2 options/i)).toBeInTheDocument();
  });

  it('shows approved badge when workflowState is APPROVED', () => {
    const approvedElement = { ...mockElement, workflowState: 'APPROVED' };
    render(<FeedCard element={approvedElement} productionId="prod-1" scriptId="script-1" />);

    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('displays workflow state badge on feed elements', () => {
    const pendingElement = {
      ...mockElement,
      workflowState: 'PENDING',
    };
    const { rerender } = render(
      <FeedCard element={pendingElement} productionId="prod-1" scriptId="script-1" />,
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();

    const outstandingElement = {
      ...mockElement,
      workflowState: 'OUTSTANDING',
    };
    rerender(
      <FeedCard element={outstandingElement} productionId="prod-1" scriptId="script-1" />,
    );
    expect(screen.getByText('Outstanding')).toBeInTheDocument();

    const approvedElement = {
      ...mockElement,
      workflowState: 'APPROVED',
    };
    rerender(
      <FeedCard element={approvedElement} productionId="prod-1" scriptId="script-1" />,
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });
});
