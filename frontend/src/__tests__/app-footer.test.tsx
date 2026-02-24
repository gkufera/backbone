import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppFooter } from '../components/app-footer';

describe('AppFooter', () => {
  it('renders copyright text', () => {
    render(<AppFooter />);

    expect(screen.getByText(/© 2026 Slug Max Inc\./)).toBeInTheDocument();
  });

  it('text is centered', () => {
    render(<AppFooter />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('text-center');
  });
});
