import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window.location in tests to prevent jsdom "Not implemented: navigation" warnings
if (typeof window !== 'undefined') {
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      pathname: '/',
      href: 'http://localhost:3000/',
      assign: vi.fn(),
      replace: vi.fn(),
    },
    writable: true,
  });
}
