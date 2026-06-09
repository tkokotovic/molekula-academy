import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CourseDetailPage from './CourseDetailPage';

// ─── Mock API client ──────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  getCourses:          vi.fn(),
  getTopics:           vi.fn(),
  createTopic:         vi.fn(),
  updateTopic:         vi.fn(),
  deleteTopicById:     vi.fn(),
  setTopicStatus:      vi.fn(),
  getLessonsByTopic:   vi.fn(),
}));

import * as api from '../api/client';

function renderPage(courseId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/courses/${courseId}`]}>
      <Routes>
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getCourses.mockResolvedValue([{ id: 1, title: 'Opća kemija', status: 'draft' }]);
  api.getTopics.mockResolvedValue([]);
  api.getLessonsByTopic.mockResolvedValue([]);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('CourseDetailPage — rendering', () => {
  it('shows the course title as heading', async () => {
    renderPage();
    expect(await screen.findByText('Opća kemija')).toBeInTheDocument();
  });

  it('shows breadcrumb link back to courses list', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: /kolegiji|courses/i });
    expect(link).toBeInTheDocument();
  });

  it('shows a "New topic" button', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /nova tema|new topic/i })).toBeInTheDocument();
  });

  it('shows list of topics for the course', async () => {
    api.getTopics.mockResolvedValue([
      { id: 10, title: 'Atomska struktura', status: 'draft', description: '' },
      { id: 11, title: 'Kemijska veza',     status: 'published', description: '' },
    ]);
    renderPage();
    expect(await screen.findByText('Atomska struktura')).toBeInTheDocument();
    expect(await screen.findByText('Kemijska veza')).toBeInTheDocument();
  });

  it('shows empty state when course has no topics', async () => {
    api.getTopics.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/nema tema|no topics/i)).toBeInTheDocument();
  });
});

// ─── Create topic ─────────────────────────────────────────────────────────────

describe('CourseDetailPage — create topic', () => {
  it('opens form when "New topic" is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /nova tema|new topic/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls createTopic and refreshes on submit', async () => {
    const user = userEvent.setup();
    const newTopic = { id: 20, title: 'Organska kemija', status: 'draft', description: '' };
    api.createTopic.mockResolvedValue(newTopic);
    api.getTopics.mockResolvedValueOnce([]).mockResolvedValue([newTopic]);

    renderPage();
    await user.click(await screen.findByRole('button', { name: /nova tema|new topic/i }));
    await user.type(screen.getByLabelText(/naziv|title/i), 'Organska kemija');
    await user.click(screen.getByRole('button', { name: /spremi|save/i }));

    await waitFor(() => expect(api.createTopic).toHaveBeenCalledWith(
      1, expect.objectContaining({ title: 'Organska kemija' })
    ));
    expect(await screen.findByText('Organska kemija')).toBeInTheDocument();
  });

  it('requires a title', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /nova tema|new topic/i }));
    await user.click(screen.getByRole('button', { name: /spremi|save/i }));
    expect(await screen.findByText(/naziv.*obavezan|title.*required/i)).toBeInTheDocument();
    expect(api.createTopic).not.toHaveBeenCalled();
  });
});

// ─── Delete topic ─────────────────────────────────────────────────────────────

describe('CourseDetailPage — delete topic', () => {
  it('calls deleteTopicById and removes from list', async () => {
    const user = userEvent.setup();
    const topic = { id: 55, title: 'Za brisanje', status: 'draft', description: '' };
    api.getTopics.mockResolvedValueOnce([topic]).mockResolvedValue([]);
    api.deleteTopicById.mockResolvedValue({});

    renderPage();
    await screen.findByText('Za brisanje');

    await user.click(screen.getByRole('button', { name: /obriši|delete/i }));

    await waitFor(() => expect(api.deleteTopicById).toHaveBeenCalledWith(55));
    await waitFor(() => expect(screen.queryByText('Za brisanje')).not.toBeInTheDocument());
  });
});

// ─── Status badge ─────────────────────────────────────────────────────────────

describe('CourseDetailPage — status', () => {
  it('shows status badge for each topic', async () => {
    api.getTopics.mockResolvedValue([
      { id: 1, title: 'Tema', status: 'published', description: '' },
    ]);
    renderPage();
    expect(await screen.findByText(/published|objavljeno/i)).toBeInTheDocument();
  });
});
