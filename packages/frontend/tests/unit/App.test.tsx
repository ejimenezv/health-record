import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../../src/pages/auth/LoginPage';

// Mock the auth store
vi.mock('../../src/store/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    login: vi.fn(),
    loadUser: vi.fn(),
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    isAuthenticated: false,
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {component}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the app title on login page', async () => {
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('MedRecord AI')).toBeInTheDocument();
    });
  });

  it('should render the login description', async () => {
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('Inicia sesión en tu cuenta')).toBeInTheDocument();
    });
  });
});
