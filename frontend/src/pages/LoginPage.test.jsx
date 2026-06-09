import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';

// ─── Mock API client ──────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  login: vi.fn(),
  isAuthenticated: vi.fn(),
}));

import * as api from '../api/client';

function renderPage({ initialEntry = '/login' } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/courses" element={<div>Courses page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.isAuthenticated.mockReturnValue(false);
});

// ─── Submit ───────────────────────────────────────────────────────────────────

describe('LoginPage — submit', () => {
  it('calls login() with email and password on submit', async () => {
    const user = userEvent.setup();
    api.login.mockResolvedValue({});
    renderPage();

    await user.type(screen.getByLabelText(/e-mail/i), 'ucitelj@molekula.hr');
    await user.type(screen.getByLabelText(/lozinka|password/i), 'tajna123');
    await user.click(screen.getByRole('button', { name: /prijava|login|sign in/i }));

    await waitFor(() =>
      expect(api.login).toHaveBeenCalledWith('ucitelj@molekula.hr', 'tajna123')
    );
  });

  it('redirects to /courses after successful login', async () => {
    const user = userEvent.setup();
    api.login.mockResolvedValue({});
    renderPage();

    await user.type(screen.getByLabelText(/e-mail/i), 'ucitelj@molekula.hr');
    await user.type(screen.getByLabelText(/lozinka|password/i), 'tajna123');
    await user.click(screen.getByRole('button', { name: /prijava|login|sign in/i }));

    expect(await screen.findByText('Courses page')).toBeInTheDocument();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('LoginPage — errors', () => {
  it('shows error message when login fails', async () => {
    const user = userEvent.setup();
    api.login.mockRejectedValue(new Error('Pogrešna lozinka'));
    renderPage();

    await user.type(screen.getByLabelText(/e-mail/i), 'ucitelj@molekula.hr');
    await user.type(screen.getByLabelText(/lozinka|password/i), 'kriva');
    await user.click(screen.getByRole('button', { name: /prijava|login|sign in/i }));

    expect(await screen.findByText('Pogrešna lozinka')).toBeInTheDocument();
  });

  it('does not redirect when login fails', async () => {
    const user = userEvent.setup();
    api.login.mockRejectedValue(new Error('Unauthorized'));
    renderPage();

    await user.type(screen.getByLabelText(/e-mail/i), 'x@x.com');
    await user.type(screen.getByLabelText(/lozinka|password/i), 'x');
    await user.click(screen.getByRole('button', { name: /prijava|login|sign in/i }));

    await waitFor(() => expect(api.login).toHaveBeenCalled());
    expect(screen.queryByText('Courses page')).not.toBeInTheDocument();
  });
});

// ─── Already logged in ────────────────────────────────────────────────────────

describe('LoginPage — already authenticated', () => {
  it('redirects to /courses if user is already logged in', () => {
    api.isAuthenticated.mockReturnValue(true);
    renderPage();
    expect(screen.getByText('Courses page')).toBeInTheDocument();
  });
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('LoginPage — rendering', () => {
  it('shows an email input', () => {
    renderPage();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
  });

  it('shows a password input', () => {
    renderPage();
    expect(screen.getByLabelText(/lozinka|password/i)).toBeInTheDocument();
  });

  it('shows a login button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /prijava|login|sign in/i })).toBeInTheDocument();
  });
});
