import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IncidentCard } from '../IncidentCard';
import { Incident } from '../../types/incident';

const mockIncident: Incident = {
  id: 'inc-123',
  reportNumber: 1042,
  title: 'Large pothole on Main Street',
  description: 'Causes car tire damage near the school crossing',
  category: 'ROADS',
  status: 'PENDING_VALIDATION',
  priority: 'HIGH',
  streetAddress: '123 Main Street',
  latitude: 48.8566,
  longitude: 2.3522,
  reporterId: 'user-1',
  agentId: null,
  technicianId: null,
  photos: [],
  notes: [],
  createdAt: '2026-10-31T12:00:00Z',
  updatedAt: '2026-10-31T12:00:00Z',
};

describe('IncidentCard Component', () => {
  it('renders incident details accurately', () => {
    render(<IncidentCard incident={mockIncident} />);

    expect(screen.getAllByText('#1042').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Large pothole on Main Street')).toBeInTheDocument();
    expect(screen.getByText('Roads & Pavement')).toBeInTheDocument();
    expect(screen.getByText('123 Main Street')).toBeInTheDocument();
    expect(screen.getByText('Pending Validation')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('handles click callback when clicked', () => {
    const handleClick = vi.fn();
    render(<IncidentCard incident={mockIncident} onClick={handleClick} />);

    fireEvent.click(screen.getByText('Large pothole on Main Street'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders actionSlot when provided', () => {
    render(
      <IncidentCard
        incident={mockIncident}
        actionSlot={<button>Inspect</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Inspect' })).toBeInTheDocument();
  });
});
