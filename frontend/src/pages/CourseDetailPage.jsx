import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getStudentCourse, getStudentCourseTopics, getStudentLessonsByTopic,
} from '../api/client';

const DIFFICULTY_LABELS = { easy: 'Lagano', medium: 'Srednje', hard: 'Teško' };
const DIFFICULTY_COLORS = {
  easy:   { background: '#d4f5f0', color: '#0b6b63' },
  medium: { background: '#fff3cd', color: '#7d5a00' },
  hard:   { background: '#fde8e8', color: '#b02020' },
};

function DifficultyBadge({ difficulty }) {
  const style = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.medium;
  return (
    <span style={{ ...style, padding: '2px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {DIFFICULTY_LABELS[difficulty] || difficulty}
    </span>
  );
}

function isNew(lesson) {
  if (!lesson.created_at && !lesson.updated_at) return false;
  const date = new Date(lesson.updated_at || lesson.created_at);
  return (Date.now() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
}

// ─── Topic accordion ──────────────────────────────────────────────────────────

function TopicSection({ topic, courseId, lessonOffset }) {
  const [lessons, setLessons]           = useState([]);
  const [expanded, setExpanded]         = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(true);

  useEffect(() => {
    getStudentLessonsByTopic(topic.id)
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoadingLessons(false));
  }, [topic.id]);

  return (
    <div style={{ border: '1.5px solid var(--line)', borderRadius: 12,
      background: 'var(--surface)', overflow: 'hidden' }}>

      {/* Topic header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left' }}
      >
        <span style={{ fontSize: 15, color: 'var(--ink-faint)', flexShrink: 0, width: 14, textAlign: 'center' }}>
          {expanded ? '▾' : '▸'}
        </span>
        <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17,
          color: 'var(--ink)', flex: 1 }}>
          {topic.title}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', flexShrink: 0 }}>
          {loadingLessons ? '…' : `${lessons.length} lekcija`}
        </span>
      </button>

      {/* Description */}
      {expanded && topic.description && (
        <p style={{ margin: '0 20px 12px 48px', fontSize: 14, color: 'var(--ink-soft)',
          lineHeight: 1.55 }}>
          {topic.description}
        </p>
      )}

      {/* Lesson rows */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)', paddingBottom: 4 }}>
          {loadingLessons && (
            <p style={{ padding: '12px 20px 12px 48px', margin: 0, fontSize: 14,
              color: 'var(--ink-faint)' }}>Učitavam lekcije…</p>
          )}
          {!loadingLessons && lessons.length === 0 && (
            <p style={{ padding: '12px 20px 12px 48px', margin: 0, fontSize: 14,
              color: 'var(--ink-faint)' }}>Nema lekcija u ovoj temi.</p>
          )}
          {!loadingLessons && lessons.map((lesson, idx) => (
            <Link
              key={lesson.id}
              to={`/courses/${courseId}/topics/${topic.id}/lessons/${lesson.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px 10px 20px',
                textDecoration: 'none', color: 'inherit',
                borderTop: idx === 0 ? 'none' : '1px solid var(--line)',
                transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-wash)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Number */}
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)',
                minWidth: 28, textAlign: 'right', flexShrink: 0 }}>
                {lessonOffset + idx + 1}.
              </span>

              {/* Title */}
              <span style={{ flex: 1, fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>
                {lesson.title}
              </span>

              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {isNew(lesson) && (
                  <span style={{ background: 'var(--accent)', color: '#fff',
                    padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    Novo
                  </span>
                )}
                {lesson.difficulty && <DifficultyBadge difficulty={lesson.difficulty} />}
                <span style={{ color: 'var(--accent)', fontSize: 16 }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse]   = useState(null);
  const [topics, setTopics]   = useState([]);
  const [topicLessonCounts, setTopicLessonCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [courseData, topicList] = await Promise.all([
        getStudentCourse(Number(courseId)),
        getStudentCourseTopics(Number(courseId)),
      ]);
      setCourse(courseData);
      setTopics(topicList);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Compute lesson offsets for global lesson numbering
  // We track this as topics reveal their lesson counts
  function getLessonOffset(topicIndex) {
    return topics.slice(0, topicIndex).reduce((sum, t) => sum + (topicLessonCounts[t.id] || 0), 0);
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 14, color: 'var(--ink-faint)' }}>
        <Link to="/courses" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          ← Kolegiji
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 30, color: 'var(--ink)',
          fontFamily: 'var(--display)', fontWeight: 800 }}>
          {loading ? '…' : (course?.title || 'Kolegij')}
        </h1>
        {course?.description && (
          <p style={{ margin: 0, fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            {course.description}
          </p>
        )}
      </div>

      {/* Topic list */}
      {loading && <p style={{ color: 'var(--ink-faint)' }}>Učitavam…</p>}

      {!loading && topics.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-faint)' }}>
          <p style={{ fontSize: 18 }}>Sadržaj kolegija je u pripremi.</p>
        </div>
      )}

      {!loading && topics.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topics.map((topic, idx) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              courseId={courseId}
              lessonOffset={getLessonOffset(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
