import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className = '', label }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
      role="status"
    >
      <div
        className={`${sizeClasses} rounded-full border-blue-600 border-t-transparent animate-spin`}
        aria-hidden="true"
      />
      {label && <span className="text-sm text-slate-500 font-medium">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
}
