import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  login,
  getToken,
  setToken,
  clearToken,
  isAuthenticated,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  setCourseStatus,
  getTopics,
  createTopic,
  updateTopic,
  deleteTopicById,
  setTopicStatus,
} from './client';

// ─── Mock fetch globally ──────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

// ─── Mock localStorage ────────────────────────────────────────────────────────

const storage = {};
vi.stubGlobal('localStorage', {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; },
});

beforeEach(() => {
  mockFetch.mockReset();
  Object.keys(storage).forEach(k => delete storage[k]);
});

// ─── Token helpers ────────────────────────────────────────────────────────────

describe('token helpers', () => {
  it('setToken stores token in localStorage', () => {
    setToken('abc123');
    expect(getToken()).toBe('abc123');
  });

  it('clearToken removes token', () => {
    setToken('abc123');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('isAuthenticated returns true when token exists', () => {
    setToken('tok');
    expect(isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false when no token', () => {
    expect(isAuthenticated()).toBe(false);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('login()', () => {
  it('posts credentials and stores token on success', async () => {
    mockFetch.mockReturnValue(mockResponse({ token: 'jwt-token-xyz' }));

    const result = await login('tomislav@molekula.hr', 'lozinka123');

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'tomislav@molekula.hr', password: 'lozinka123' }),
    }));
    expect(result.token).toBe('jwt-token-xyz');
    expect(getToken()).toBe('jwt-token-xyz');
  });

  it('throws on invalid credentials', async () => {
    mockFetch.mockReturnValue(mockResponse({ error: 'Invalid credentials' }, 401));
    await expect(login('x@x.com', 'wrong')).rejects.toThrow();
  });
});

// ─── getCourses ───────────────────────────────────────────────────────────────

describe('getCourses()', () => {
  it('fetches all teacher courses with auth header', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ courses: [{ id: 1, title: 'Kemija' }] }));

    const courses = await getCourses();

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/courses', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
    }));
    expect(courses).toHaveLength(1);
    expect(courses[0].title).toBe('Kemija');
  });
});

// ─── createCourse ─────────────────────────────────────────────────────────────

describe('createCourse()', () => {
  it('posts course data and returns created course', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ course: { id: 1, title: 'Nova' } }, 201));

    const course = await createCourse({ title: 'Nova', description: 'Opis' });

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/courses', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Nova', description: 'Opis' }),
    }));
    expect(course.title).toBe('Nova');
  });
});

// ─── updateCourse ─────────────────────────────────────────────────────────────

describe('updateCourse()', () => {
  it('sends PUT with updated fields', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ course: { id: 5, title: 'Updated' } }));

    const course = await updateCourse(5, { title: 'Updated' });

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/courses/5', expect.objectContaining({
      method: 'PUT',
    }));
    expect(course.title).toBe('Updated');
  });
});

// ─── setCourseStatus ──────────────────────────────────────────────────────────

describe('setCourseStatus()', () => {
  it('patches status correctly', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ course: { id: 3, status: 'published' } }));

    const course = await setCourseStatus(3, 'published');

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/courses/3/status', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'published' }),
    }));
    expect(course.status).toBe('published');
  });
});

// ─── deleteCourse ─────────────────────────────────────────────────────────────

describe('deleteCourse()', () => {
  it('sends DELETE request', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ message: 'Course deleted' }));

    await deleteCourse(7);

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/courses/7', expect.objectContaining({
      method: 'DELETE',
    }));
  });
});

// ─── Topics ───────────────────────────────────────────────────────────────────

describe('getTopics()', () => {
  it('fetches topics for a course', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ topics: [{ id: 1, title: 'Topic 1' }] }));

    const topics = await getTopics(2);

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/courses/2/topics', expect.anything());
    expect(topics).toHaveLength(1);
  });
});

describe('createTopic()', () => {
  it('posts topic to the correct course', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ topic: { id: 1, title: 'Atomska struktura' } }, 201));

    const topic = await createTopic(3, { title: 'Atomska struktura' });

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/courses/3/topics', expect.objectContaining({
      method: 'POST',
    }));
    expect(topic.title).toBe('Atomska struktura');
  });
});

describe('updateTopic()', () => {
  it('sends PUT to /api/teacher/topics/:id', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ topic: { id: 4, title: 'Updated Topic' } }));

    const topic = await updateTopic(4, { title: 'Updated Topic' });

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/topics/4', expect.objectContaining({
      method: 'PUT',
    }));
    expect(topic.title).toBe('Updated Topic');
  });
});

describe('setTopicStatus()', () => {
  it('patches topic status', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ topic: { id: 2, status: 'published' } }));

    const topic = await setTopicStatus(2, 'published');

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/topics/2/status', expect.objectContaining({
      method: 'PATCH',
    }));
    expect(topic.status).toBe('published');
  });
});

describe('deleteTopicById()', () => {
  it('sends DELETE to /api/teacher/topics/:id', async () => {
    setToken('tok');
    mockFetch.mockReturnValue(mockResponse({ message: 'Topic deleted' }));

    await deleteTopicById(9);

    expect(mockFetch).toHaveBeenCalledWith('/api/teacher/topics/9', expect.objectContaining({
      method: 'DELETE',
    }));
  });
});
