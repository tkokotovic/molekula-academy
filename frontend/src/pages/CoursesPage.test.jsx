import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CoursesPage from './CoursesPage';

// ─── Mock API client ──────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  getCourses:      vi.fn(),
  createCourse:    vi.fn(),
  updateCourse:    vi.fn(),
  deleteCourse:    vi.fn(),
  setCourseStatus: vi.fn(),
  logout:          vi.fn(),
}));

import * as api from '../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/courses']}>
      <Routes>
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getCourses.mockResolvedValue([]);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('CoursesPage — rendering', () => {
  it('shows page heading', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /kolegiji|courses/i })).toBeInTheDocument();
  });

  it('shows a list of courses returned from the API', async () => {
    api.getCourses.mockResolvedValue([
      { id: 1, title: 'IB Kemija HL', status: 'published', description: '', target_audience: [] },
      { id: 2, title: 'Opća kemija', status: 'draft',     description: '', target_audience: [] },
    ]);

    renderPage();

    expect(await screen.findByText('IB Kemija HL')).toBeInTheDocument();
    expect(await screen.findByText('Opća kemija')).toBeInTheDocument();
  });

  it('shows empty state when no courses exist', async () => {
    api.getCourses.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/nema kolegija|no courses/i)).toBeInTheDocument();
  });

  it('shows a "New course" button', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /novi kolegij|new course/i })).toBeInTheDocument();
  });
});

// ─── Create course ────────────────────────────────────────────────────────────

describe('CoursesPage — create', () => {
  it('opens create form when "New course" is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /novi kolegij|new course/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls createCourse and refreshes list on submit', async () => {
    const user = userEvent.setup();
    const newCourse = { id: 99, title: 'Organska kemija', status: 'draft', description: '', target_audience: [] };
    api.createCourse.mockResolvedValue(newCourse);
    api.getCourses.mockResolvedValueOnce([]).mockResolvedValue([newCourse]);

    renderPage();
    await user.click(await screen.findByRole('button', { name: /novi kolegij|new course/i }));

    await user.type(screen.getByLabelText(/naziv|title/i), 'Organska kemija');
    await user.click(screen.getByRole('button', { name: /spremi|save/i }));

    await waitFor(() => expect(api.createCourse).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Organska kemija' })
    ));
    expect(await screen.findByText('Organska kemija')).toBeInTheDocument();
  });

  it('requires a title — shows error if empty', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /novi kolegij|new course/i }));
    await user.click(screen.getByRole('button', { name: /spremi|save/i }));

    expect(await screen.findByText(/naziv.*obavezan|title.*required/i)).toBeInTheDocument();
    expect(api.createCourse).not.toHaveBeenCalled();
  });
});

// ─── Delete course ────────────────────────────────────────────────────────────

describe('CoursesPage — delete', () => {
  it('calls deleteCourse and removes course from list', async () => {
    const user = userEvent.setup();
    const course = { id: 3, title: 'Za brisanje', status: 'draft', description: '', target_audience: [] };
    api.getCourses.mockResolvedValueOnce([course]).mockResolvedValue([]);
    api.deleteCourse.mockResolvedValue({});

    renderPage();
    await screen.findByText('Za brisanje');

    await user.click(screen.getByRole('button', { name: /obriši|delete/i }));

    await waitFor(() => expect(api.deleteCourse).toHaveBeenCalledWith(3));
    await waitFor(() => expect(screen.queryByText('Za brisanje')).not.toBeInTheDocument());
  });
});

// ─── Status badge ─────────────────────────────────────────────────────────────

describe('CoursesPage — status', () => {
  it('displays status badge for each course', async () => {
    api.getCourses.mockResolvedValue([
      { id: 1, title: 'Kemija', status: 'published', description: '', target_audience: [] },
    ]);
    renderPage();
    expect(await screen.findByText(/published|objavljeno/i)).toBeInTheDocument();
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('CoursesPage — logout', () => {
  it('shows a logout button', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /odjava|logout|sign out/i })).toBeInTheDocument();
  });

  it('calls logout() and redirects to /login when logout is clicked', async () => {
    const user = userEvent.setup();
    api.logout.mockResolvedValue();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /odjava|logout|sign out/i }));

    await waitFor(() => expect(api.logout).toHaveBeenCalled());
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
