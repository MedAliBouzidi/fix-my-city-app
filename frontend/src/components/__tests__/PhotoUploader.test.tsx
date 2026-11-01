import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoUploader } from '../PhotoUploader';

// Mock URL.createObjectURL and revokeObjectURL in jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('PhotoUploader Component', () => {
  it('renders default dropzone when no file is selected', () => {
    render(<PhotoUploader file={null} onFileSelect={vi.fn()} />);

    expect(screen.getByText('Upload incident photo')).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPG or JPEG up to 5MB/i)).toBeInTheDocument();
  });

  it('validates file type and rejects unsupported formats', () => {
    const handleFileSelect = vi.fn();
    const { container } = render(
      <PhotoUploader file={null} onFileSelect={handleFileSelect} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const invalidFile = new File(['dummy'], 'document.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(
      screen.getByText(/Only PNG, JPG, and JPEG images are allowed/i),
    ).toBeInTheDocument();
    expect(handleFileSelect).not.toHaveBeenCalled();
  });

  it('validates file size and rejects files exceeding 5MB', () => {
    const handleFileSelect = vi.fn();
    const { container } = render(
      <PhotoUploader file={null} onFileSelect={handleFileSelect} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // Create 6MB file
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(
      screen.getByText(/Maximum allowed size is 5 MB/i),
    ).toBeInTheDocument();
    expect(handleFileSelect).not.toHaveBeenCalled();
  });

  it('accepts valid JPEG image and calls onFileSelect', () => {
    const handleFileSelect = vi.fn();
    const { container } = render(
      <PhotoUploader file={null} onFileSelect={handleFileSelect} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    const validFile = new File(['content'], 'pothole.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(input, { target: { files: [validFile] } });

    expect(handleFileSelect).toHaveBeenCalledWith(validFile);
  });

  it('displays upload progress indicator when uploading', () => {
    const validFile = new File(['content'], 'pothole.jpg', {
      type: 'image/jpeg',
    });

    render(
      <PhotoUploader
        file={validFile}
        onFileSelect={vi.fn()}
        isUploading={true}
        uploadProgress={65}
      />,
    );

    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(
      screen.getByText(/Uploading directly to secure S3 storage/i),
    ).toBeInTheDocument();
  });

  it('displays upload error with retry button', () => {
    const handleRetry = vi.fn();
    const validFile = new File(['content'], 'pothole.jpg', {
      type: 'image/jpeg',
    });

    render(
      <PhotoUploader
        file={validFile}
        onFileSelect={vi.fn()}
        uploadError="Network error during S3 PUT"
        onRetry={handleRetry}
      />,
    );

    expect(
      screen.getByText('Network error during S3 PUT'),
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', {
      name: /Retry photo upload/i,
    });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
