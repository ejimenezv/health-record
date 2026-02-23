import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../../../../src/components/ui/alert';

describe('Alert', () => {
  describe('Default Variant', () => {
    it('should render with default styling', () => {
      render(<Alert>Alert content</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-white');
      expect(alert).toHaveClass('border-gray-200');
    });

    it('should render children', () => {
      render(<Alert>Test alert content</Alert>);
      expect(screen.getByText('Test alert content')).toBeInTheDocument();
    });

    it('should have alert role', () => {
      render(<Alert>Content</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Destructive Variant', () => {
    it('should render with destructive styling', () => {
      render(<Alert variant="destructive">Error content</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('text-red-600');
      expect(alert).toHaveClass('bg-red-50');
    });

    it('should have red border for destructive variant', () => {
      render(<Alert variant="destructive">Error</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-red-500/50');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Alert className="custom-class">Content</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-class');
    });
  });
});

describe('AlertTitle', () => {
  it('should render title text', () => {
    render(<AlertTitle>Error Title</AlertTitle>);
    expect(screen.getByText('Error Title')).toBeInTheDocument();
  });

  it('should have correct styling', () => {
    render(<AlertTitle>Title</AlertTitle>);
    const title = screen.getByText('Title');
    expect(title).toHaveClass('font-medium');
    expect(title).toHaveClass('leading-none');
  });

  it('should apply custom className', () => {
    render(<AlertTitle className="custom-title">Title</AlertTitle>);
    const title = screen.getByText('Title');
    expect(title).toHaveClass('custom-title');
  });
});

describe('AlertDescription', () => {
  it('should render description text', () => {
    render(<AlertDescription>This is an error message</AlertDescription>);
    expect(screen.getByText('This is an error message')).toBeInTheDocument();
  });

  it('should have correct styling', () => {
    render(<AlertDescription>Description</AlertDescription>);
    const description = screen.getByText('Description');
    expect(description).toHaveClass('text-sm');
  });

  it('should apply custom className', () => {
    render(<AlertDescription className="custom-desc">Description</AlertDescription>);
    const description = screen.getByText('Description');
    expect(description).toHaveClass('custom-desc');
  });
});

describe('Alert Composition', () => {
  it('should render complete alert with title and description', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong</AlertDescription>
      </Alert>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
