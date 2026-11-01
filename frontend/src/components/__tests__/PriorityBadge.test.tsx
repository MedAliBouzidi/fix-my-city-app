import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityBadge } from '../PriorityBadge';

describe('PriorityBadge Component', () => {
  it('renders CRITICAL priority with icon and label', () => {
    render(<PriorityBadge priority="CRITICAL" />);
    expect(screen.getByText('Critical Priority')).toBeInTheDocument();
  });

  it('renders HIGH priority', () => {
    render(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('renders MEDIUM priority', () => {
    render(<PriorityBadge priority="MEDIUM" />);
    expect(screen.getByText('Medium Priority')).toBeInTheDocument();
  });

  it('renders LOW priority', () => {
    render(<PriorityBadge priority="LOW" />);
    expect(screen.getByText('Low Priority')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    const { container } = render(
      <PriorityBadge priority="HIGH" showIcon={false} />,
    );
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});
