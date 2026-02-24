import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonCard } from '../components/skeleton';

describe('Skeleton components', () => {
  it('Skeleton renders with animation class', () => {
    render(<Skeleton />);
    const el = screen.getByTestId('skeleton');
    expect(el).toHaveClass('mac-skeleton');
  });

  it('SkeletonCard renders mac-window structure with skeleton bars', () => {
    render(<SkeletonCard />);
    const card = screen.getByTestId('skeleton-card');
    expect(card).toHaveClass('mac-window');
    // Should contain multiple skeleton bars
    const bars = card.querySelectorAll('.mac-skeleton');
    expect(bars.length).toBeGreaterThanOrEqual(2);
  });
});
