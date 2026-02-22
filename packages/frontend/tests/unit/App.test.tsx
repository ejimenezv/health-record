import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../../src/App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

describe('App', () => {
  it('should render the app title', () => {
    renderWithProviders(<App />);

    expect(screen.getByText('MedRecord AI')).toBeInTheDocument();
  });

  it('should render the subtitle', () => {
    renderWithProviders(<App />);

    expect(screen.getByText('Sistema de Expediente Clinico con IA')).toBeInTheDocument();
  });
});
