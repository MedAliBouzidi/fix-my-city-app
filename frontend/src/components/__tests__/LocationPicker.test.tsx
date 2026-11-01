import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocationPicker } from '../LocationPicker';

describe('LocationPicker Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders coordinate inputs with initial values', () => {
    render(
      <LocationPicker
        latitude={36.8008}
        longitude={10.18}
        onChange={vi.fn()}
      />,
    );

    const latInput = screen.getByLabelText(/Latitude/i) as HTMLInputElement;
    const lngInput = screen.getByLabelText(/Longitude/i) as HTMLInputElement;

    expect(latInput.value).toBe('36.8008');
    expect(lngInput.value).toBe('10.18');
  });

  it('calls onChange when user manually enters coordinates', () => {
    const handleChange = vi.fn();
    render(
      <LocationPicker
        latitude={null}
        longitude={null}
        onChange={handleChange}
      />,
    );

    const latInput = screen.getByLabelText(/Latitude/i);
    fireEvent.change(latInput, { target: { value: '48.8566' } });

    expect(handleChange).toHaveBeenCalledWith(48.8566, 0);

    const lngInput = screen.getByLabelText(/Longitude/i);
    fireEvent.change(lngInput, { target: { value: '2.3522' } });

    expect(handleChange).toHaveBeenCalledWith(0, 2.3522);
  });

  it('detects GPS location via browser navigator.geolocation', () => {
    const handleChange = vi.fn();
    const mockGetCurrentPosition = vi.fn((success) => {
      success({
        coords: {
          latitude: 36.800812,
          longitude: 10.180045,
        },
      });
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
      },
      configurable: true,
    });

    render(
      <LocationPicker
        latitude={null}
        longitude={null}
        onChange={handleChange}
      />,
    );

    const detectBtn = screen.getByRole('button', {
      name: /Detect my current location/i,
    });
    fireEvent.click(detectBtn);

    expect(mockGetCurrentPosition).toHaveBeenCalled();
    expect(handleChange).toHaveBeenCalledWith(36.800812, 10.180045);
    expect(
      screen.getByText(/GPS location captured accurately/i),
    ).toBeInTheDocument();
  });

  it('displays error message when geolocation permission is denied', () => {
    const mockGetCurrentPosition = vi.fn((_success, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
      },
      configurable: true,
    });

    render(
      <LocationPicker
        latitude={null}
        longitude={null}
        onChange={vi.fn()}
      />,
    );

    const detectBtn = screen.getByRole('button', {
      name: /Detect my current location/i,
    });
    fireEvent.click(detectBtn);

    expect(
      screen.getByText(/Location permission denied/i),
    ).toBeInTheDocument();
  });

  it('renders validation error passed via props', () => {
    render(
      <LocationPicker
        latitude={null}
        longitude={null}
        onChange={vi.fn()}
        error="Please capture or enter valid GPS coordinates."
      />,
    );

    expect(
      screen.getByText('Please capture or enter valid GPS coordinates.'),
    ).toBeInTheDocument();
  });
});
