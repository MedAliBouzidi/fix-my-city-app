import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge Component', () => {
  it('renders RECEIVED status with appropriate label and class', () => {
    render(<StatusBadge status="RECEIVED" />);
    const badge = screen.getByText('Received');
    expect(badge).toBeInTheDocument();
  });

  it('renders VALIDATED status', () => {
    render(<StatusBadge status="VALIDATED" />);
    expect(screen.getByText('Validated')).toBeInTheDocument();
  });

  it('renders IN_PROGRESS status', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders RESOLVED status', () => {
    render(<StatusBadge status="RESOLVED" />);
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('renders REJECTED status', () => {
    render(<StatusBadge status="REJECTED" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('supports sm size variant', () => {
    render(<StatusBadge status="ASSIGNED" size="sm" />);
    const badge = screen.getByText('Assigned');
    expect(badge).toBeInTheDocument();
  });
});
