import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IncidentTimeline } from '../IncidentTimeline';

describe('IncidentTimeline Component', () => {
  it('renders all pipeline stages for a received report', () => {
    render(<IncidentTimeline status="RECEIVED" />);

    expect(screen.getByText('Report Received')).toBeInTheDocument();
    expect(screen.getByText('Inspection Assigned')).toBeInTheDocument();
    expect(screen.getByText('Validated by Agent')).toBeInTheDocument();
    expect(screen.getByText('Technician Assigned')).toBeInTheDocument();
    expect(screen.getByText('Repairs In Progress')).toBeInTheDocument();
    expect(screen.getByText('Certified Resolved')).toBeInTheDocument();

    expect(screen.getByText('Current Stage')).toBeInTheDocument();
  });

  it('marks current stage on IN_PROGRESS status', () => {
    render(<IncidentTimeline status="IN_PROGRESS" />);

    const currentBadges = screen.getAllByText('Current Stage');
    expect(currentBadges).toHaveLength(1);

    // Parent step should be Repairs In Progress
    const inProgressStep = screen.getByText('Repairs In Progress');
    expect(inProgressStep).toBeInTheDocument();
  });

  it('renders rejected branch when status is REJECTED', () => {
    render(<IncidentTimeline status="REJECTED" />);

    expect(screen.getByText('Report Rejected')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Inspection determined report could not be validated/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders certified resolved when status is RESOLVED', () => {
    render(<IncidentTimeline status="RESOLVED" />);

    const resolvedTitle = screen.getByText('Certified Resolved');
    expect(resolvedTitle).toBeInTheDocument();
    expect(screen.getByText('Current Stage')).toBeInTheDocument();
  });
});
