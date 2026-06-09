import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage';
import * as api from '../api/client';

vi.mock('../api/client', () => ({
  getMe: vi.fn(),
  getStudentStats: vi.fn(),
  getCourseProgress: vi.fn(),
  isAuthenticated: vi.fn(() => true),
}));

const mockStats = {
  total_lessons_completed: 12,
  total_time_spent_seconds: 7200,
  total_quizzes_taken: 5,
  avg_score_pct: 84,
  current_streak_days: 3,
  strongest_topic: { topic_id: 1, title: 'Kemijska ravnoteža', avg_score_pct: 90 },
  weakest_topic: { topic_id: 2, title: 'Elektrokemija', avg_score_pct: 60 },
};

const mockCourses = [
  {
    course_id: 1,
    course_title: 'IB Kemija',
    total_lessons: 20,
    completed_lessons: 8,
    in_progress_lessons: 2,
    completion_pct: 40,
  },
  {
    course_id: 2,
    course_title: 'Medicinska biokemija',
    total_lessons: 15,
    completed_lessons: 0,
    in_progress_lessons: 0,
    completion_pct: 0,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    api.getMe.mockResolvedValue({ id: 1, name: 'Ana Horvatić', subscription_tier: 'premium' });
    api.getStudentStats.mockResolvedValue(mockStats);
    api.getCourseProgress.mockResolvedValue(mockCourses);
  });

  it('renders greeting and student name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Dobrodošao, Ana/i)).toBeInTheDocument();
    });
  });

  it('displays stats from API', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();         // lessons completed
      expect(screen.getByText('84%')).toBeInTheDocument();        // avg score
      expect(screen.getByText('2h 0min')).toBeInTheDocument();    // 7200s = 2h
    });
  });

  it('shows streak badge', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getAllByText(/dana zaredom/i).length).toBeGreaterThan(0);
    });
  });

  it('shows course titles in progress list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('IB Kemija').length).toBeGreaterThan(0);
      expect(screen.getByText('Medicinska biokemija')).toBeInTheDocument();
    });
  });

  it('shows strongest topic hint', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Kemijska ravnoteža/i)).toBeInTheDocument();
    });
  });

  it('shows error message if API fails', async () => {
    api.getMe.mockRejectedValue(new Error('Network error'));
    api.getStudentStats.mockRejectedValue(new Error('Network error'));
    api.getCourseProgress.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Greška pri učitavanju/i)).toBeInTheDocument();
    });
  });

  it('renders quick links', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Svi kursevi').length).toBeGreaterThan(0);
      expect(screen.getByText('Napredak')).toBeInTheDocument();
      expect(screen.getByText('Kvizovi')).toBeInTheDocument();
      expect(screen.getByText('Zakaži Zoom')).toBeInTheDocument();
    });
  });
});
