import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from '../app/page';

describe('Home page', () => {
  it('renders Backbone heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /backbone/i })).toBeInTheDocument();
  });

  it('renders tagline', () => {
    render(<Home />);
    expect(screen.getByText(/production collaboration platform/i)).toBeInTheDocument();
  });
});
