const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '..', 'molekula.db');

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Enable foreign key enforcement
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    -- role: student | teacher | owner
    -- owner = Tomislav; can set subscription tiers and has all teacher permissions
    role TEXT NOT NULL DEFAULT 'student',
    -- subscription_tier: basic | premium (students only)
    subscription_tier TEXT NOT NULL DEFAULT 'basic',
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ─── Content system ───────────────────────────────────────────────────────

  -- Syllabus items are the official numbered curriculum points for a course.
  -- e.g. number="1.1", title="Particulate nature of matter"
  -- parent_id allows nesting: Topic 1 → 1.1, 1.2, 1.3
  CREATE TABLE IF NOT EXISTS syllabus_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    parent_id INTEGER,               -- NULL = top-level section; set for sub-items
    number TEXT NOT NULL,            -- e.g. "1", "1.1", "1.1.a"
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES syllabus_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    cover_image_url TEXT,
    -- target_audience: JSON array, e.g. ["IB","Medical"]
    target_audience TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',   -- draft | published | archived
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    formula_sheet_url TEXT,          -- uploaded PDF or image path
    -- syllabus_item_ids: JSON array of syllabus_items.id this topic covers
    -- e.g. [3, 4] means this topic covers syllabus points 1.1 and 1.2
    syllabus_item_ids TEXT NOT NULL DEFAULT '[]',
    -- linked_quiz_ids: JSON array of quiz IDs (populated in Step 34)
    linked_quiz_ids TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,                          -- short overview shown before student starts
    -- learning_objectives: JSON array of strings
    learning_objectives TEXT NOT NULL DEFAULT '[]',
    difficulty TEXT NOT NULL DEFAULT 'medium', -- easy | medium | hard
    duration_minutes INTEGER,              -- estimated time (auto or manual)
    -- tags: JSON array of strings, e.g. ["stoichiometry","thermodynamics"]
    tags TEXT NOT NULL DEFAULT '[]',
    -- prerequisites: JSON array of lesson IDs
    prerequisites TEXT NOT NULL DEFAULT '[]',
    -- linked_quiz_ids: JSON array (populated in Step 34)
    linked_quiz_ids TEXT NOT NULL DEFAULT '[]',
    teacher_notes TEXT,                    -- private — never shown to students
    status TEXT NOT NULL DEFAULT 'draft',  -- draft | published | archived
    publish_at TEXT,                       -- scheduled publish datetime (ISO 8601)
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lesson_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    -- type: see VALID_TYPES in backend/src/routes/lesson_blocks.js
    --        (heading, text, quote, callout, exam_tip, warning, summary, equation,
    --         molecule3d, image, video, table, graph, python, link, … etc.)
    type TEXT NOT NULL,
    -- content: JSON, shape depends on type
    content TEXT NOT NULL DEFAULT '{}',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,          -- stored name on disk (uuid-based)
    original_name TEXT NOT NULL,     -- original filename from user
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,           -- bytes
    path TEXT NOT NULL,              -- relative path on server
    uploaded_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ─── Question Bank (Step 34) ─────────────────────────────────────────────────

  -- A single question in the question bank.
  -- Questions are standalone; quizzes reference them (Step 35).
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Core content
    -- type: true_false | mcq | fill_blank | short_answer | chem_equation
    type TEXT NOT NULL,
    stem TEXT NOT NULL,              -- the question text (may contain LaTeX)
    explanation TEXT,                -- shown after grading (optional)
    model_answer TEXT,               -- teacher-provided reference answer (all types)

    -- Grading metadata
    -- difficulty: easy | medium | hard
    difficulty TEXT NOT NULL DEFAULT 'medium',
    -- max_points: total points this question is worth (1 for T/F and MCQ)
    max_points INTEGER NOT NULL DEFAULT 1,

    -- IB-specific metadata
    -- ib_level: HL | SL | both | null (null = not IB-specific)
    ib_level TEXT,
    -- ib_paper: 1 | 2 | 3 | null
    ib_paper INTEGER,

    -- Source metadata
    -- source_type: teacher | past_exam | entrance_exam | uni_exam
    source_type TEXT NOT NULL DEFAULT 'teacher',
    source_year INTEGER,             -- e.g. 2022  (past exams)
    source_month INTEGER,            -- e.g. 5 = May (past exams)
    source_label TEXT,               -- e.g. "IB May 2022 Paper 2" (free text)

    -- Linking
    topic_id INTEGER,                -- primary topic (optional)
    -- syllabus_item_ids: JSON array of syllabus_items.id
    syllabus_item_ids TEXT NOT NULL DEFAULT '[]',

    -- Workflow
    -- status: pending_approval | approved | rejected | archived | ai_generated_pending_approval
    status TEXT NOT NULL DEFAULT 'pending_approval',
    -- import_batch_id: links questions imported together (NULL = created manually)
    import_batch_id TEXT,

    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Options for MCQ and true_false questions.
  -- For true_false: exactly 2 rows (True / False), is_correct marks the right one.
  -- For MCQ: 2-6 rows, one or more marked is_correct.
  -- For fill_blank / short_answer / chem_equation: options hold accepted answers
  --   with individual point values (allows partial credit).
  CREATE TABLE IF NOT EXISTS question_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    text TEXT NOT NULL,              -- option text (may contain LaTeX)
    is_correct INTEGER NOT NULL DEFAULT 0,  -- 1 = correct
    -- points: used for fill_blank / short_answer / chem_equation partial credit
    points INTEGER NOT NULL DEFAULT 0,
    -- keywords: JSON array of strings — for keyword-based grading
    keywords TEXT NOT NULL DEFAULT '[]',
    position INTEGER NOT NULL DEFAULT 0,
    is_ai_suggested INTEGER NOT NULL DEFAULT 0,  -- 1 = AI suggested this option
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  -- Tracks each bulk import batch so teacher can approve/reject per question.
  CREATE TABLE IF NOT EXISTS question_import_batches (
    id TEXT PRIMARY KEY,             -- UUID
    imported_by INTEGER NOT NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    approved_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ─── Quiz Engine (Step 35) ───────────────────────────────────────────────────

  -- A quiz is a collection of ordered questions from the bank.
  -- type: topic_quiz (teacher-created) | self_generated (student-generated on demand) | mock_exam
  -- Self-generated quizzes are persisted so the attempt can be reviewed later.
  -- Mock exams: max 1 attempt, timed, Premium-only, teacher-scheduled or example (permanent).
  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    topic_id INTEGER,                  -- NULL for self-generated cross-topic quizzes
    -- type: topic_quiz | self_generated | mock_exam
    type TEXT NOT NULL DEFAULT 'topic_quiz',
    status TEXT NOT NULL DEFAULT 'draft',  -- draft | published | archived
    time_limit_minutes INTEGER,            -- NULL = no time limit
    -- max_attempts: NULL = unlimited (used for homework type)
    max_attempts INTEGER DEFAULT 5,
    shuffle_questions INTEGER NOT NULL DEFAULT 0,  -- 0 = false, 1 = true
    -- pass_score: minimum % to be considered passing (e.g. 70)
    pass_score INTEGER NOT NULL DEFAULT 60,
    -- ─── Mock exam fields ───────────────────────────────────────────────────
    -- scheduled_start / scheduled_end: availability window (NULL for example exams)
    scheduled_start TEXT,
    scheduled_end TEXT,
    -- is_example: 1 = permanently available to hand-picked students; 0 = timed window
    is_example INTEGER NOT NULL DEFAULT 0,
    -- grace_period_seconds: extra time after timer expires before auto-submit fires
    grace_period_seconds INTEGER NOT NULL DEFAULT 120,
    -- due_date: deadline for homework quizzes (type='homework'). NULL for other types.
    due_date TEXT,
    -- is_library_template: 1 = teacher saved this quiz to the reusable library
    is_library_template INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Students hand-picked by teacher for example mock exams.
  -- Only relevant when quizzes.is_example = 1.
  CREATE TABLE IF NOT EXISTS mock_exam_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    granted_by INTEGER NOT NULL,
    granted_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(quiz_id, student_id),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Per-student quiz assignments (Step 39b — Quiz Library).
  -- When a quiz has any assignment rows, ONLY those students can see and attempt it.
  -- Quizzes without assignment rows follow normal published visibility (all students).
  CREATE TABLE IF NOT EXISTS quiz_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(quiz_id, student_id),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Ordered list of questions belonging to a quiz.
  -- points_override: if set, overrides the question's own max_points for this quiz.
  CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    points_override INTEGER,           -- NULL = use question.max_points
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(quiz_id, question_id)
  );

  -- One row per student attempt at a quiz.
  -- status: in_progress | submitted | graded
  -- score / max_score are populated on submit (auto-graded questions) and updated
  -- when teacher grades remaining open answers.
  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress | submitted | graded
    score REAL,                        -- NULL until submitted
    max_score REAL,                    -- total points available in this attempt
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    submitted_at TEXT,                 -- NULL until submitted
    graded_at TEXT,                    -- NULL until fully graded
    option_orders TEXT,                -- JSON: { question_id: [option_id, ...] } — shuffled order per question
    -- teacher_feedback: overall exam feedback written by teacher after reviewing attempt
    teacher_feedback TEXT,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- One row per question per attempt.
  -- answer_data: JSON — shape depends on question type:
  --   true_false / mcq:   { "option_ids": [42] }
  --   fill_blank:         { "text": "2H2O" }
  --   short_answer:       { "text": "Because entropy increases..." }
  --   chem_equation:      { "text": "2H2 + O2 -> 2H2O" }
  -- is_correct / points_earned are set during grading (auto or manual).
  -- ai_suggested_points / ai_feedback are set by the AI grading service.
  CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_data TEXT NOT NULL DEFAULT '{}',  -- JSON
    is_correct INTEGER,                -- NULL = not yet graded; 1 = correct; 0 = wrong
    points_earned REAL,                -- NULL until graded
    graded_at TEXT,
    graded_by INTEGER,                 -- NULL = auto/AI graded; user id = teacher
    ai_suggested_points REAL,          -- what the AI suggested (may differ from final)
    ai_feedback TEXT,                  -- AI explanation / feedback for the student
    ai_graded_at TEXT,                 -- when AI graded this answer
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(attempt_id, question_id)
  );

  -- Logs teacher overrides of AI grades.
  -- Used to improve AI suggestions over time (few-shot context for future calls).
  CREATE TABLE IF NOT EXISTS ai_grading_corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    answer_text TEXT NOT NULL,
    ai_points REAL NOT NULL,
    teacher_points REAL NOT NULL,
    teacher_feedback TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  -- ─── Progress Tracking (Step 38) ────────────────────────────────────────────

  -- Records a student's progress on each lesson.
  -- One row per (student, lesson) pair — upserted as student advances.
  -- status: in_progress | completed
  -- time_spent_seconds accumulates across all sessions (never reset).
  CREATE TABLE IF NOT EXISTS lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    -- status: in_progress | completed  (can only advance, never go backward)
    status TEXT NOT NULL DEFAULT 'in_progress',
    first_opened_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,                   -- NULL until status = 'completed'
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    UNIQUE(student_id, lesson_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
  );

  -- ─── Messaging (Phase 7) ────────────────────────────────────────────────────

  -- Direct 1-to-1 messages between a student and the teacher.
  -- sender_role = 'student' | 'teacher'
  -- read_at is NULL until the recipient reads the message.
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'student',
    text TEXT NOT NULL,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ─── Certificates (Step 39) ─────────────────────────────────────────────────

  -- Issued when a student: (1) completes all published lessons in a topic AND
  -- (2) submits a topic_quiz for that topic scoring >= 70% of max_score.
  -- One certificate per (student, topic) — UNIQUE constraint prevents duplicates.
  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    quiz_attempt_id INTEGER,             -- the attempt that triggered issuance
    issued_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, topic_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id) ON DELETE SET NULL
  );

  -- Course enrollments — created when a student buys a packet and picks a course.
  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  -- ─── Notifications (S12) ────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title_hr TEXT NOT NULL,
    title_en TEXT NOT NULL,
    body_hr TEXT,
    body_en TEXT,
    action_url TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ─── Migrations ───────────────────────────────────────────────────────────────

const migrations = [
  // Add exam_date and notes fields to users
  `ALTER TABLE users ADD COLUMN exam_date TEXT`,
  `ALTER TABLE users ADD COLUMN admin_notes TEXT`,
  // Lesson fork model: a fork points back to the master lesson it was copied from
  `ALTER TABLE lessons ADD COLUMN master_lesson_id INTEGER`,
  // Bilingual: each lesson is authored in one language; its translation is a separate
  // linked copy. translation_of points to the source lesson (NULL = original).
  `ALTER TABLE lessons ADD COLUMN lang TEXT NOT NULL DEFAULT 'hr'`,
  `ALTER TABLE lessons ADD COLUMN translation_of INTEGER`,
  // Flag the hidden system course that holds the master lesson library
  `ALTER TABLE courses ADD COLUMN is_library INTEGER NOT NULL DEFAULT 0`,
  // Block-level visibility: public (everyone) | basic (basic+premium) | premium (premium only)
  `ALTER TABLE lesson_blocks ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'`,
  // S01 — Student portal: enrollment lifecycle
  `ALTER TABLE enrollments ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`,
  `ALTER TABLE enrollments ADD COLUMN unenrolled_at TEXT`,
  `ALTER TABLE enrollments ADD COLUMN access_until TEXT`,
  // S01 — Student portal: message file attachments + type
  `ALTER TABLE messages ADD COLUMN file_url TEXT`,
  `ALTER TABLE messages ADD COLUMN file_name TEXT`,
  `ALTER TABLE messages ADD COLUMN file_size INTEGER`,
  `ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'message'`,
  // S01 — Student portal: onboarding flag
  `ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0`,
  // S10 — Sessions table
  `CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    zoom_url TEXT,
    prep_note TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming',
    summary_message_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (summary_message_id) REFERENCES messages(id) ON DELETE SET NULL
  )`,
  // R31 — Tutoring packages
  `CREATE TABLE IF NOT EXISTS tutoring_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hours INTEGER NOT NULL,
    price_eur REAL NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS student_hours (
    student_id INTEGER NOT NULL PRIMARY KEY,
    hours_remaining REAL NOT NULL DEFAULT 0,
    hours_total REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `ALTER TABLE sessions ADD COLUMN hours_deducted INTEGER NOT NULL DEFAULT 0`,
  // R29a — Broadcasts
  `CREATE TABLE IF NOT EXISTS broadcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body_hr TEXT,
    body_en TEXT,
    audience_filter TEXT NOT NULL DEFAULT '{}',
    created_by INTEGER NOT NULL,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS broadcast_recipients (
    broadcast_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (broadcast_id, user_id),
    FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  // R27a — Groups / Cohorts
  `CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    PRIMARY KEY (group_id, student_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  // R17 — Homeworks
  `CREATE TABLE IF NOT EXISTS homeworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    instruction_html TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS homework_questions (
    homework_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (homework_id, question_id),
    FOREIGN KEY (homework_id) REFERENCES homeworks(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS homework_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    homework_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    group_id INTEGER,
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'assigned',
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    submitted_at TEXT,
    corrected_at TEXT,
    FOREIGN KEY (homework_id) REFERENCES homeworks(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS homework_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL UNIQUE,
    submitted_at TEXT NOT NULL,
    corrected_at TEXT,
    overall_score REAL,
    teacher_comment TEXT,
    FOREIGN KEY (assignment_id) REFERENCES homework_assignments(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS homework_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_text TEXT,
    file_url TEXT,
    score REAL,
    teacher_note TEXT,
    is_correct INTEGER,
    FOREIGN KEY (submission_id) REFERENCES homework_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
  )`,
  // R11a — Question multi-category tagging
  `CREATE TABLE IF NOT EXISTS question_categories (
    question_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    PRIMARY KEY (question_id, category),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  )`,
  // R11a — Per-category syllabus codes for questions
  `CREATE TABLE IF NOT EXISTS question_syllabus_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    code TEXT NOT NULL,
    UNIQUE (question_id, category, code),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  )`,
  // R11a — Performance stats on questions (updated by quiz grading)
  `ALTER TABLE questions ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE questions ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE questions ADD COLUMN avg_time_seconds REAL NOT NULL DEFAULT 0`,
  // R08a — Syllabus codes reference table (seeded per course type)
  `CREATE TABLE IF NOT EXISTS syllabus_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_type TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE(course_type, code)
  )`,
  // R08a — Lesson syllabus tag assignments
  `CREATE TABLE IF NOT EXISTS lesson_syllabus_tags (
    lesson_id INTEGER NOT NULL,
    syllabus_code_id INTEGER NOT NULL,
    PRIMARY KEY (lesson_id, syllabus_code_id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (syllabus_code_id) REFERENCES syllabus_codes(id) ON DELETE CASCADE
  )`,
  // R28 — Message thread archive flag per student (stored on the user row)
  `ALTER TABLE users ADD COLUMN messages_thread_archived INTEGER NOT NULL DEFAULT 0`,
  // R11b — Rich stem blocks stored as JSON
  `ALTER TABLE questions ADD COLUMN stem_blocks TEXT`,
  // Inline-chemistry compound library (searchable by HR/EN name → mhchem formula).
  // owner_id NULL = built-in seed; set = teacher's saved custom compound.
  `CREATE TABLE IF NOT EXISTS chem_compounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    name_hr TEXT NOT NULL,
    name_en TEXT,
    formula TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
];

for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
}

// ─── Syllabus codes seed data (R08a) ──────────────────────────────────────────

const SYLLABUS_SEED = {
  ib_sl: [
    ['1.1', 'Introduction to the particulate nature of matter'],
    ['1.2', 'The mole concept'],
    ['1.3', 'Reacting masses and volumes'],
    ['2.1', 'The nuclear atom'],
    ['2.2', 'Electron configuration'],
    ['3.1', 'The periodic table'],
    ['3.2', 'Periodic trends'],
    ['4.1', 'Ionic bonding and structure'],
    ['4.2', 'Covalent bonding'],
    ['4.3', 'Covalent structures'],
    ['4.4', 'Intermolecular forces'],
    ['4.5', 'Metallic bonding'],
    ['5.1', 'Measuring energy changes'],
    ['5.2', "Hess's law"],
    ['5.3', 'Bond enthalpies'],
    ['6.1', 'Collision theory and rates of reaction'],
    ['7.1', 'Equilibrium'],
    ['8.1', 'Theories of acids and bases'],
    ['8.2', 'Properties of acids and bases'],
    ['8.3', 'The pH scale'],
    ['8.4', 'Strong and weak acids and bases'],
    ['8.5', 'Acid deposition'],
    ['9.1', 'Oxidation and reduction'],
    ['9.2', 'Electrochemical cells'],
    ['10.1', 'Fundamentals of organic chemistry'],
    ['10.2', 'Functional group chemistry'],
    ['11.1', 'Uncertainties and errors in measurement'],
    ['11.2', 'Graphical techniques'],
    ['11.3', 'Spectroscopic identification of organic compounds'],
  ],
  ib_hl: [
    ['12.1', 'Electrons in atoms'],
    ['13.1', 'First-row d-block elements'],
    ['13.2', 'Coloured complexes'],
    ['14.1', 'Further aspects of covalent bonding and structure'],
    ['14.2', 'Hybridization'],
    ['15.1', 'Energy cycles'],
    ['15.2', 'Entropy and spontaneity'],
    ['16.1', 'Rate expression and reaction mechanism'],
    ['16.2', 'Activation energy'],
    ['17.1', 'The equilibrium law'],
    ['18.1', 'Lewis acids and bases'],
    ['18.2', 'Calculations involving acids and bases'],
    ['18.3', 'pH curves'],
    ['18.4', 'Salt hydrolysis'],
    ['18.5', 'Buffer solutions'],
    ['18.6', 'Acid-base indicators'],
    ['19.1', 'Electrochemical cells (HL)'],
    ['20.1', 'Types of organic reactions'],
    ['20.2', 'Nucleophilic substitution reactions'],
    ['20.3', 'Elimination reactions'],
    ['20.4', 'Condensation reactions'],
    ['21.1', 'Spectroscopic identification of organic compounds (HL)'],
  ],
  drzavna_matura: [
    ['M1', 'Uvod, mjerenja i sigurnost u laboratoriju'],
    ['M2', 'Građa atoma i periodni sustav'],
    ['M3', 'Kemijska veza'],
    ['M4', 'Stehiometrija i kemijsko računanje'],
    ['M5', 'Otopine i koloidni sustavi'],
    ['M6', 'Kemijska ravnoteža'],
    ['M7', 'Kiseline i baze'],
    ['M8', 'Oksidacijsko-redukcijske reakcije'],
    ['M9', 'Elektrokemija'],
    ['M10', 'Kinetika kemijskih reakcija'],
    ['M11', 'Termokemija'],
    ['M12', 'Organska kemija — alkani i halogeni derivati'],
    ['M13', 'Alkeni, alkini i aromatski spojevi'],
    ['M14', 'Alkoholi, eteri, aldehidi i ketoni'],
    ['M15', 'Karboksilne kiseline i esteri'],
    ['M16', 'Amini i amidi'],
    ['M17', 'Ugljikohidrati, lipidi i proteini'],
  ],
  prijemni: [
    ['P1', 'Struktura atoma i periodni sustav'],
    ['P2', 'Kemijska veza i struktura molekula'],
    ['P3', 'Stehiometrija i kemijsko računanje'],
    ['P4', 'Otopine i koligativna svojstva'],
    ['P5', 'Acidobazna ravnoteža'],
    ['P6', 'Oksido-redukcijski procesi'],
    ['P7', 'Elektrokemija'],
    ['P8', 'Kinetika i kataliza'],
    ['P9', 'Termokemija i termodinamika'],
    ['P10', 'Organska kemija — ugljikovodici'],
    ['P11', 'Organska kemija — funkcionalne skupine'],
    ['P12', 'Biokemija — ugljikohidrati'],
    ['P13', 'Biokemija — lipidi'],
    ['P14', 'Biokemija — proteini i enzimi'],
    ['P15', 'Biokemija — nukleinske kiseline'],
  ],
  medchem_1: [
    ['MC1-1', 'Struktura i reaktivnost organskih molekula'],
    ['MC1-2', 'Stereokemija'],
    ['MC1-3', 'Ugljikovodici i halogeni derivati'],
    ['MC1-4', 'Alkoholi, fenoli i eteri'],
    ['MC1-5', 'Karbonilna kemija — aldehidi i ketoni'],
    ['MC1-6', 'Karboksilne kiseline i derivati'],
    ['MC1-7', 'Amini i dušični spojevi'],
    ['MC1-8', 'Aromatski spojevi i heterocikli'],
    ['MC1-9', 'Ugljikohidrati — struktura i kemija'],
    ['MC1-10', 'Lipidi — struktura i kemija'],
  ],
  medchem_2: [
    ['MC2-1', 'Proteini i aminokiseline'],
    ['MC2-2', 'Enzimi — kinetika i mehanizmi'],
    ['MC2-3', 'Nukleotidi i nukleinske kiseline'],
    ['MC2-4', 'Metabolizam ugljikohidrata'],
    ['MC2-5', 'Metabolizam lipida'],
    ['MC2-6', 'Metabolizam dušičnih spojeva'],
    ['MC2-7', 'Energetski metabolizam i oksidativna fosforilacija'],
    ['MC2-8', 'Regulacija metabolizma i stanična signalizacija'],
    ['MC2-9', 'Vitamini i koenzimi'],
    ['MC2-10', 'Bioanorganska kemija'],
  ],
};

(function seedSyllabusCodes() {
  const existing = db.prepare('SELECT COUNT(*) as n FROM syllabus_codes').get();
  if (existing.n > 0) return;
  const insert = db.prepare(
    'INSERT OR IGNORE INTO syllabus_codes (course_type, code, title, position) VALUES (?, ?, ?, ?)'
  );
  const insertAll = db.transaction(() => {
    for (const [courseType, codes] of Object.entries(SYLLABUS_SEED)) {
      codes.forEach(([code, title], i) => insert.run(courseType, code, title, i));
    }
  });
  insertAll();
})();

// ─── Chemistry compound library seed ──────────────────────────────────────────
// Curated bilingual (HR/EN) starter set for the inline /ch picker. Formulas are
// mhchem source (rendered with \ce{…}). Teachers add their own on top of these.
const CHEM_SEED = [
  // [name_hr, name_en, mhchem formula]
  ['voda', 'water', 'H2O'],
  ['vodikov peroksid', 'hydrogen peroxide', 'H2O2'],
  ['ugljikov dioksid', 'carbon dioxide', 'CO2'],
  ['ugljikov monoksid', 'carbon monoxide', 'CO'],
  ['kisik', 'oxygen', 'O2'],
  ['vodik', 'hydrogen', 'H2'],
  ['dušik', 'nitrogen', 'N2'],
  ['ozon', 'ozone', 'O3'],
  ['amonijak', 'ammonia', 'NH3'],
  ['metan', 'methane', 'CH4'],
  ['etanol', 'ethanol', 'C2H5OH'],
  ['metanol', 'methanol', 'CH3OH'],
  ['glukoza', 'glucose', 'C6H12O6'],
  ['octena kiselina', 'acetic acid', 'CH3COOH'],
  ['sumporna kiselina', 'sulfuric acid', 'H2SO4'],
  ['solna (klorovodična) kiselina', 'hydrochloric acid', 'HCl'],
  ['dušična kiselina', 'nitric acid', 'HNO3'],
  ['fosforna kiselina', 'phosphoric acid', 'H3PO4'],
  ['ugljična kiselina', 'carbonic acid', 'H2CO3'],
  ['natrijev hidroksid', 'sodium hydroxide', 'NaOH'],
  ['kalijev hidroksid', 'potassium hydroxide', 'KOH'],
  ['kalcijev hidroksid', 'calcium hydroxide', 'Ca(OH)2'],
  ['amonijev klorid', 'ammonium chloride', 'NH4Cl'],
  ['natrijev klorid', 'sodium chloride', 'NaCl'],
  ['natrijev hidrogenkarbonat', 'sodium bicarbonate', 'NaHCO3'],
  ['natrijev karbonat', 'sodium carbonate', 'Na2CO3'],
  ['kalcijev karbonat', 'calcium carbonate', 'CaCO3'],
  ['kalcijev oksid', 'calcium oxide', 'CaO'],
  ['bakrov(II) sulfat', 'copper(II) sulfate', 'CuSO4'],
  ['srebrov nitrat', 'silver nitrate', 'AgNO3'],
  ['kalijev permanganat', 'potassium permanganate', 'KMnO4'],
  ['sulfatni ion', 'sulfate ion', 'SO4^2-'],
  ['nitratni ion', 'nitrate ion', 'NO3^-'],
  ['karbonatni ion', 'carbonate ion', 'CO3^2-'],
  ['amonijev ion', 'ammonium ion', 'NH4^+'],
  ['hidronijev ion', 'hydronium ion', 'H3O^+'],
  ['hidroksidni ion', 'hydroxide ion', 'OH^-'],
];

(function seedChemCompounds() {
  const existing = db.prepare('SELECT COUNT(*) as n FROM chem_compounds WHERE owner_id IS NULL').get();
  if (existing.n > 0) return;
  const insert = db.prepare(
    'INSERT INTO chem_compounds (owner_id, name_hr, name_en, formula) VALUES (NULL, ?, ?, ?)'
  );
  db.transaction(() => { for (const [hr, en, f] of CHEM_SEED) insert.run(hr, en, f); })();
})();

// ─── Master lesson library bootstrap ──────────────────────────────────────────
// The library is a hidden system course + topic. Master lessons live there as
// normal `lessons` rows, so the existing lesson editor works on them unchanged.
// Forking deep-copies a master lesson (+ its blocks) into a real course topic.

function getLibraryTopicId() {
  let course = db.prepare('SELECT id FROM courses WHERE is_library = 1').get();
  if (!course) {
    const slug = `__library__-${Date.now()}`;
    const info = db.prepare(`
      INSERT INTO courses (title, description, slug, status, is_library)
      VALUES (?, ?, ?, 'archived', 1)
    `).run('Biblioteka lekcija', 'Sustavna biblioteka master lekcija', slug);
    course = { id: info.lastInsertRowid };
  }
  let topic = db.prepare('SELECT id FROM topics WHERE course_id = ?').get(course.id);
  if (!topic) {
    const info = db.prepare(`
      INSERT INTO topics (course_id, title, status) VALUES (?, 'Sve lekcije', 'archived')
    `).run(course.id);
    topic = { id: info.lastInsertRowid };
  }
  return topic.id;
}

db.getLibraryTopicId = getLibraryTopicId;

module.exports = db;
