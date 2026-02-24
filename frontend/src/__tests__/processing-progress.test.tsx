import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api', () => ({
  scriptsApi: {
    getProcessingStatus: vi.fn(),
  },
}));

import { scriptsApi } from '../lib/api';
const mockedScriptsApi = vi.mocked(scriptsApi);

import { ProcessingProgress } from '../components/processing-progress';

describe('ProcessingProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders progress bar with step name', async () => {
    mockedScriptsApi.getProcessingStatus.mockResolvedValue({
      status: 'PROCESSING',
      progress: { percent: 60, step: 'Detecting elements' },
    });

    const { unmount } = render(
      <ProcessingProgress scriptId="script-1" onComplete={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Detecting elements')).toBeInTheDocument();
    });

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveStyle({ width: '60%' });

    unmount();
  });

  it('calls onComplete when status changes from PROCESSING', async () => {
    const onComplete = vi.fn();

    let callCount = 0;
    mockedScriptsApi.getProcessingStatus.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { status: 'PROCESSING', progress: { percent: 80, step: 'Saving elements' } };
      }
      return { status: 'REVIEWING', progress: null };
    });

    const { unmount } = render(
      <ProcessingProgress scriptId="script-1" onComplete={onComplete} />,
    );

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledWith('REVIEWING');
      },
      { timeout: 5000 },
    );

    unmount();
  });
});
