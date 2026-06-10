# Molekula Academy — Master Build Plan

**Academy:** Molekula Academy  
**Teacher:** Tomislav  
**Last updated:** June 2026  
**Version:** 4.0

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🔄 | In progress / partially done |
| ⬜ | Not started |
| 🚫 | Blocked — requires external input (photos, decisions, payments setup) |

---

## PHASE 1 — Design Prototype
*Goal: A clickable, visual prototype of every screen. No real data.*

| # | Step | Status | Notes |
|---|------|--------|-------|
| 01 | Navigation bar | ✅ | Bilingual HR/EN, sticky, responsive |
| 02 | Hero section (3 variants) | ✅ | Split, centered, equation — switchable via Tweaks |
| 03 | Trust bar | ✅ | Stats: 50+ students, 95% pass rate, since 2008 |
| 04 | Who it's for | ✅ | IB, Medical/Dental entrance, University |
| 05 | How it works | ✅ | 3-step dark section |
| 06 | Features overview | ✅ | 8-feature element-tile grid |
| 07 | About the teacher | ✅ | Tomislav — MD, 15+ years, quote, credentials |
| 08 | Pricing / plans | ✅ | Basic €19 / Premium €39, feature lists |
| 09 | Testimonials | ✅ | 3 student quotes (sample — replace at launch) |
| 10 | FAQ | ✅ | 6 questions, accordion |
| 11 | Footer | ✅ | Links, language toggle, social icons |
| 12 | Real photos | 🚫 | **Tomislav must supply:** portrait photo + hero/lab image |
| 13 | Login / signup page | ✅ | `login-bundle.html` — Login + Register tabs, plan picker, dark mode, bilingual |
| 14 | Student dashboard home | ✅ | HTML prototype — greeting, stats, Zoom card, courses, deadlines |
| 15 | Lesson / module page | ✅ | HTML prototype — video slot, prose, keypoint, equation, sidebar |
| 16 | Quiz & test flow | ✅ | HTML prototype — questions → feedback → results with score ring |
| 17 | Progress page | ✅ | HTML prototype — ring, stat tiles, sparkline, heat grid, certificates |
| 18 | Schedule page | ✅ | HTML prototype — calendar grid, sessions, book button |
| 19 | Messages / chat screen | ✅ | HTML prototype — chat thread UI, compose, teacher avatar |
| 20 | Settings / account screen | ✅ | HTML prototype — profile, subscription, language/theme/accent |

---

## PHASE 2 — Infrastructure
*Goal: A real working backend. Users can register, log in, and have their data saved permanently.*

| # | Step | Status | Notes |
|---|------|--------|-------|
| 21 | Choose tech stack | ✅ | React + Node.js + SQLite decided June 2026 |
| 22 | User authentication | ✅ | Register, login, JWT tokens, protected routes — `backend/src/routes/auth.js` |
| 23 | Student and teacher user roles | ✅ | `requireTeacher` middleware + `/api/admin/*` gated routes — `backend/src/middleware/auth.js` |
| 24 | Register domain name | 🚫 | e.g. molekula-academy.hr — Tomislav to register |
| 25 | Set up hosting | ⬜ | Hetzner VPS (~€50/yr), deploy backend + frontend |

---

## PHASE 3 — Billing
*Goal: Students can pay, subscriptions are managed automatically, Croatian/EU compliance met.*

| # | Step | Status | Notes |
|---|------|--------|-------|
| 26 | Stripe integration | ⬜ | Credit card payments, recurring billing, webhook for payment events |
| 27 | Subscription management | ⬜ | Student can upgrade, downgrade, cancel, or pause from account page |
| 28 | Progress preservation after cancellation | ⬜ | Lock new content; permanently preserve all scores, completions, certificates |
| 29 | Invoice and receipt generation | ⬜ | Required by Croatian/EU law. Auto-generate PDF on each payment, send by email |

---

## PHASE 4 — Content Management Backend ✅ COMPLETE

| # | Step | Status | Notes |
|---|------|--------|-------|
| 30 | Course CRUD API | ✅ | `backend/src/routes/courses.js` — create, list, update, archive |
| 31 | Topic CRUD API | ✅ | `backend/src/routes/topics.js` — nested under courses |
| 32 | Lesson CRUD API | ✅ | `backend/src/routes/lessons.js` — scheduled publish, tags, prerequisites |
| 33 | Lesson blocks API | ✅ | `backend/src/routes/lesson_blocks.js` — 18 block types |
| 34 | Question bank API | ✅ | `backend/src/routes/questions.js` — MCQ, T/F, fill-blank, short-answer, chem-equation |
| 35 | Quiz builder API | ✅ | `backend/src/routes/quizzes.js` — teacher creates quizzes from question bank |
| 36 | Mock exam API | ✅ | Part of quizzes route — timed windows, hand-picked student lists |
| 37 | File upload API | ✅ | `backend/src/routes/upload.js` — multer, stored on disk, tracked in `uploads` table |
| 38 | Quiz library / assignments API | ✅ | `backend/src/routes/quiz_library.js` — reusable templates, assign to students |
| 39 | AI grading API | ✅ | `backend/src/routes/grading.js` — AI suggests score; teacher overrides logged |

---

## PHASE 5 — Student Progress Tracking Backend ✅ COMPLETE

| # | Step | Status | Notes |
|---|------|--------|-------|
| 41 | Lesson progress API | ✅ | `backend/src/routes/progress.js` — per-lesson status, time-spent, streak |
| 42 | Progress analytics API | ✅ | Course completion %, quiz score history, topic strength/weakness, streak |
| 43 | Certificate issuance API | ✅ | `backend/src/routes/certificates.js` — auto-issued on completion + quiz ≥ 70% |
| 44 | Teacher student overview API | ✅ | Teacher gets table of all students with stats |

---

## PHASE 6 — Student-Facing Frontend ✅ COMPLETE

| # | Step | Status | Notes |
|---|------|--------|-------|
| 47 | Login / register page | ✅ | `frontend/src/pages/LoginPage.jsx` — wired to `/api/auth` |
| 48 | Courses list page | ✅ | `frontend/src/pages/CoursesPage.jsx` — fetches published courses |
| 49 | Course detail page | ✅ | `frontend/src/pages/CourseDetailPage.jsx` — topics + lessons list |
| 50 | Lesson viewer page | ✅ | `frontend/src/pages/LessonPage.jsx` — all block types, KaTeX, molecules, sidebar outline |
| 51 | Quiz flow page | ✅ | `frontend/src/pages/QuizPage.jsx` — 5 question types, countdown timer, results |
| 52 | Dashboard home | ✅ | `frontend/src/pages/DashboardPage.jsx` — streak, 4-stat row, continue-learning card |
| 53 | Progress page | ✅ | `frontend/src/pages/ProgressPage.jsx` — rings, bar chart, topic heatmap, certificates |
| 54 | Messages / chat page | ✅ | `frontend/src/pages/MessagesPage.jsx` — real API, optimistic send, Premium gate |
| 55 | Schedule / booking page | ✅ | `frontend/src/pages/SchedulePage.jsx` — Calendly embed, Basic upsell |
| 56 | Settings / account page | ✅ | `frontend/src/pages/SettingsPage.jsx` — profile edit, password change, subscription |

---

## PHASE 7 — Communication

| # | Step | Status | Notes |
|---|------|--------|-------|
| 57 | Chat system with permanent history | ✅ | `messages` table, full student/teacher API |
| 58 | Email notification to teacher on new message | ✅ | `backend/src/services/email.js` — Nodemailer, dev-mode logs |
| 59 | Automated student emails | ✅ | Welcome on register, certificate earned, teacher-reply notification |
| 60 | Session scheduling | ⬜ | Calendly webhook → email student Zoom link; Premium = 1 free/month |

---

## PHASE 8 — Teacher Admin Panel v1 ✅ COMPLETE

| # | Step | Status | Notes |
|---|------|--------|-------|
| 61 | Student roster UI | ✅ | `AdminStudentsPage.jsx` — search, plan toggle, enrollment column |
| 62 | Individual student view UI | ✅ | `AdminStudentDetailPage.jsx` — tabs, rings, quiz history, exam date, admin notes |
| 63 | Revenue dashboard UI | ✅ | `AdminRevenuePage.jsx` — MRR estimate, plan split bar, 6-month chart |
| 64 | Lesson editor (Notion-style WYSIWYG) | ✅ | `LessonEditorPage.jsx` — 18 block types, Tiptap, DnD, SMILES, KaTeX, auto-save |
| 65 | Admin shell redesign | ✅ | `TeacherShell.jsx` — 9-section sidebar, teacher profile card |
| 66 | Dashboard redesign | ✅ | `AdminDashboardPage.jsx` — stat cards, exam timeline, content health, action strips |
| 67 | Enrollment system | ✅ | `enrollments` table, admin list shows course + date |

---

## PHASE 8B — Admin Panel Redesign
*Recommended build order: R01–R10 → R11–R16 → R17–R22 → R23–R27 → R28–R30 → R31–R33 → R34–R36*

### 8B-1 — Courses & Lessons

| # | Step | Status | Notes |
|---|------|--------|-------|
| R01 | Course list view | ✅ | `AdminCoursesPage.jsx` — card grid: name, topic/lesson/enrolled counts, clickable status badge, Uredi/Obriši/Otvori. Create course modal. Backend `GET /api/teacher/courses` returns counts; hidden library course excluded. |
| R02 | Course detail — student-perspective view | ✅ | In-page detail: topic accordions (status badge, rename, delete), lesson rows with ✏️→editor, rename, delete, status cycling. Inline "+ Nova lekcija" / "+ Iz biblioteke" / "+ Novo poglavlje". |
| R03 | Master lesson library | ✅ | "⑂ Biblioteka lekcija" tab in `AdminCoursesPage`. Lists all master lessons (search, create, ✏️ edit content, block + fork counts). Master lessons stored under a hidden system course (`courses.is_library=1`) so the existing editor works on them unchanged. |
| R04 | Lesson fork model — DB + API | ✅ | `lessons.master_lesson_id` column (no separate table needed). `POST /api/teacher/lessons/:id/fork` deep-copies lesson + all blocks into target topic as `draft`. `GET` endpoints join `master_title`. `getLibraryTopicId()` bootstrap in `db.js`. |
| R05 | Lesson fork model — UI | ✅ | Fork = full independent copy. Course rows show "⑂ iz biblioteke" badge. Two entry points: course→topic "⑂ Iz biblioteke" picker, and library→"+ Dodaj u kolegij" course/topic picker. Editing fork does NOT change master (separate rows + blocks). Full block add/edit/**delete**/reorder via existing `LessonEditorPage`. |
| R06 | Push-changes-to-forks flow | ✅ | Library row shows "⟳ Ažuriraj kopije" when forks exist → modal lists each fork (course · topic · lesson · block count) with per-fork sync chip ("Usklađeno" / "Razlikuje se", by comparing block content arrays). Differing forks pre-selected; "Ažuriraj odabrane (N)" replaces selected forks' blocks with master's. `GET /api/teacher/lessons/:id/forks` + `POST /api/teacher/lessons/:id/push`. |
| R07 | Block-level visibility toggle | ✅ | Each block shows an always-visible pill (🌐 Svi / ● Basic / ★ Premium) that cycles on click. Stored in `lesson_blocks.visibility` (`ALTER TABLE` migration, default `public`). POST/PATCH `/blocks` accept + validate visibility; fork + push carry it; fork sync-detection includes it. "👁 Pregled kao student" modal renders blocks read-only in two columns (Basic vs Premium), hidden blocks shown as "🔒 … skriveno". **Student-side enforcement done:** `GET /api/student/lessons/:id/blocks` (`backend/src/routes/student_lessons.js`, `requireAuth`) drops blocks the user's `subscription_tier` can't see (tier read fresh from DB; teacher/owner = all); `LessonPage` uses `getStudentLessonBlocks`. ⚠️ But `LessonPage` still also calls `getLesson` + `getLessonsByTopic` on **teacher** routes (403 for students) — page won't render end-to-end for a student yet. Tracked in Phase 8B-8. |
| R08 | Syllabus tags per lesson | ⬜ | Searchable dropdown in lesson editor header. One tag set per course type: IB SL / IB HL / Državna matura / Prijemni / MedChem I / MedChem II. `syllabus_codes` table seeded per course. |
| R09 | Lesson PDF / DOCX export | ⬜ | Admin-only button in lesson editor: renders blocks to PDF/DOCX. KaTeX server-side for equations, smiles-drawer SVG for molecules. |
| R10 | Lesson status — Scheduled publish | ⬜ | Status selector: Draft / Published / Scheduled (date-time picker). Backend cron or check-on-fetch publishes at scheduled time. |

### 8B-2 — Question Bank Redesign

| # | Step | Status | Notes |
|---|------|--------|-------|
| R11 | Multi-category tagging | ⬜ | Questions can belong to multiple categories: IB SL, IB HL, Državna matura, Prijemni, MedChem I, MedChem II. DB: `question_categories` join table. |
| R12 | Per-category syllabus codes | ⬜ | For each assigned category, a separate syllabus code. UI: per-category row with code dropdown. DB: `question_syllabus_codes(question_id, category, code)`. |
| R13 | Rich stems & options | ⬜ | Stem and each option use TiptapEditor — supports LaTeX, mhchem, images inline in questions. |
| R14 | Bulk paste import | ⬜ | Textarea: paste raw text → parse question/answer boundaries → teacher reviews each, confirms category + correct answer. |
| R15 | Performance stats on questions | ⬜ | Auto-computed: correct %, avg time, attempt count. Shown on question card. Populated from `quiz_attempts` data. |
| R16 | Question bank filter overhaul | ⬜ | Filter by: category (multi-select), syllabus code, difficulty, type, source (past paper / original / entrance exam), performance range. |

### 8B-3 — Homeworks

| # | Step | Status | Notes |
|---|------|--------|-------|
| R17 | Homeworks DB + API | ⬜ | Tables: `homeworks`, `homework_questions`, `homework_assignments`, `homework_submissions`, `homework_answers`. |
| R18 | Homework creation UI | ⬜ | Pick questions from filtered bank, drag to reorder. Instruction text (rich text). Assign to: individual student OR group. Set deadline. |
| R19 | Student homework view | ⬜ | Student sees assigned homeworks with deadline. MCQ/T/F auto-graded. Short answer: text OR image upload. |
| R20 | Teacher correction UI | ⬜ | Inbox sorted by deadline / submission / course. Per short-answer: score + inline note. Overall comment. Mark corrected → student notified. |
| R21 | Homework status tracking | ⬜ | States: Not assigned / Assigned pending / Submitted awaiting correction / Corrected / Overdue. Auto-warn teacher. Shown on student detail tab. |
| R22 | Homework dot on student list | ⬜ | Green = all corrected, Amber = awaiting correction, Red = overdue. Visible on `AdminStudentsPage`. |

### 8B-4 — Students Redesign

| # | Step | Status | Notes |
|---|------|--------|-------|
| R23 | Student list sort + filters | ⬜ | Default sort: exam date closest first, then needs-attention. Filters: course, plan, exam proximity. Export CSV. |
| R24 | Student detail — Homeworks tab | ⬜ | All assigned/submitted/corrected/pending. Click to open correction view. |
| R25 | Student detail — Sessions tab | ⬜ | Scheduled + past sessions. Meeting code visible. Hours balance shown. |
| R26 | Student detail — Reports tab | ⬜ | Generate parent PDF report button (triggers R35). |
| R27 | Groups / Cohorts | ⬜ | Named groups (e.g. "IB HL 2026"). Assign students. Assign homeworks to entire group. Group-level progress view. DB: `groups`, `group_members`. |

### 8B-5 — Communication Redesign

| # | Step | Status | Notes |
|---|------|--------|-------|
| R28 | Messages redesign — quiz-context threads | ⬜ | Messages attached to quiz results only. 24h student reply window after corrections. Thread locks for student after 24h. Quiz questions shown inline. |
| R29 | Broadcasts | ⬜ | `AdminBroadcastsPage`. Filter audience: all / by course / by plan / by group / individuals. In-platform delivery. Log with date, audience size, content. DB: `broadcasts`, `broadcast_recipients`. |
| R30 | In-platform notification bell | ⬜ | Bell icon in student nav. Unread badge count. Dropdown list. Mark as read. DB: `notifications(id, student_id, text, link, read_at, created_at)`. |

### 8B-6 — Sessions & Tutoring Packages

| # | Step | Status | Notes |
|---|------|--------|-------|
| R31 | Tutoring packages — DB + API | ⬜ | Tables: `tutoring_packages(id, name, hours, price_eur)`, `student_hours(student_id, hours_remaining, hours_total)`, `sessions`. Admin sets package prices. |
| R32 | Sessions admin UI | ⬜ | `AdminSessionsPage`. Schedule session → deducts 1h. Online: paste meeting link → student notified. In-person: mark as in-person. Session history. |
| R33 | Student — purchase tutoring package | ⬜ | Student sees remaining hours. Buy package → Stripe checkout → hours credited. Meeting code sent by email. |

### 8B-7 — Revenue & Reports

| # | Step | Status | Notes |
|---|------|--------|-------|
| R34 | Revenue redesign (Stripe data) | ⬜ | Rebuilt with real Stripe data: MRR + tutoring revenue separate, active premium count, new vs churn, payment history, refund button (Admin Teacher only). |
| R35 | Parent PDF report | ⬜ | `AdminReportsPage`. Fields: effort, goal note, current progress (auto-filled), probability of reaching goal, additional effort required, mock exam results, personal note. Export PDF. |
| R36 | Student progress report (internal) | ⬜ | Full quiz history, topic completion, homework grades. For teacher reference. Printable. |

### 8B-8 — Student-Facing Redesign

The student-facing app (Phase 6) was built against teacher-namespaced APIs and predates the admin redesign. It needs its own pass — both to unblock content viewing and to refresh the layout. Do this alongside / after the admin work.

| # | Step | Status | Notes |
|---|------|--------|-------|
| R37 | Student content read routes | ⬜ | **Bug:** `LessonPage` calls `getLesson` + `getLessonsByTopic`, which hit `requireTeacher` routes → **403 for real students**, so the lesson page can't render for a student at all. Add student-accessible (`requireAuth`) read endpoints for a single lesson + a topic's lesson list (published-only, no `teacher_notes`), and repoint `LessonPage`. Audit `CoursesPage` / `CourseDetailPage` for the same teacher-route reliance. (Block visibility already enforced via R07's `/api/student/lessons/:id/blocks`.) |
| R38 | Student layout redesign | ⬜ | Refresh student shell + lesson/course/dashboard layouts to match the new brand + admin redesign. Keep colour/font identity (see admin-panel-plan visual identity note). Scope to define when reached. |

---

## PHASE 9 — Launch
*Goal: First real paying students.*

| # | Step | Status | Notes |
|---|------|--------|-------|
| L01 | Legal pages | ✅ | `PrivacyPage.jsx` + `TermsPage.jsx`, public routes /privacy + /terms, linked from login + settings |
| L02 | Full end-to-end test | ⬜ | Simulate: land → sign up → pay → lesson → quiz → message → cancel → resubscribe → progress preserved |
| L03 | Beta launch — invite known students | ⬜ | 5–10 students you know. Free or discounted first month. Collect feedback, fix critical issues, ask for testimonials |
| L04 | Replace sample testimonials | ⬜ | Swap 3 placeholder quotes in `content.js` with real beta student quotes |
| L05 | Public launch | ⬜ | Post on social media, Facebook groups for IB Croatia and medical applicants. Consider: first 20 students get 20% off forever |

---

## Summary

| Phase | Steps | Done | Status |
|-------|-------|------|--------|
| Phase 1 — Design Prototype | 01–20 | 19/20 | ✅ (Step 12 blocked on photos) |
| Phase 2 — Infrastructure | 21–25 | 3/5 | 🔄 (hosting + domain outstanding) |
| Phase 3 — Billing | 26–29 | 0/4 | ⬜ |
| Phase 4 — Content Management Backend | 30–39 | 10/10 | ✅ |
| Phase 5 — Progress Tracking Backend | 41–44 | 4/4 | ✅ |
| Phase 6 — Student Frontend | 47–56 | 10/10 | ✅ |
| Phase 7 — Communication | 57–60 | 3/4 | 🔄 (session scheduling outstanding) |
| Phase 8 — Admin Panel v1 | 61–67 | 7/7 | ✅ |
| Phase 8B-1 — Courses & Lessons | R01–R10 | 7/10 | 🔄 |
| Phase 8B-2 — Question Bank Redesign | R11–R16 | 0/6 | ⬜ |
| Phase 8B-3 — Homeworks | R17–R22 | 0/6 | ⬜ |
| Phase 8B-4 — Students Redesign | R23–R27 | 0/5 | ⬜ |
| Phase 8B-5 — Communication Redesign | R28–R30 | 0/3 | ⬜ |
| Phase 8B-6 — Sessions & Tutoring | R31–R33 | 0/3 | ⬜ |
| Phase 8B-7 — Revenue & Reports | R34–R36 | 0/3 | ⬜ |
| Phase 8B-8 — Student-Facing Redesign | R37–R38 | 0/2 | ⬜ (R37 = student lesson page 403 bug) |
| Phase 9 — Launch | L01–L05 | 1/5 | 🔄 |
| **Total** | **~107 steps** | **~57** | |

---

## Recommended next build order

1. **R01–R10** — Courses & Lessons (fork model is the architectural foundation)
2. **R11–R16** — Question Bank redesign (needed before homeworks)
3. **R17–R22** — Homeworks full flow (depends on question bank)
4. **R23–R27** — Students redesign + Groups
5. **R28–R30** — Communication redesign + broadcasts + notifications
6. **26–29** — Stripe billing (needed for tutoring packages + subscriptions)
7. **R31–R33** — Sessions & tutoring packages (needs Stripe)
8. **R34–R36** — Revenue (Stripe) + Reports PDF
9. **60** — Session scheduling (Calendly webhook)
10. **R37–R38** — Student-facing redesign (R37 first if students start viewing lessons before launch — fixes the 403 bug)
11. **L02–L05** — Beta + public launch

---

## Key decisions still open

1. **Domain name** (Step 24) — molekula-academy.hr? molekulaacademy.com?
2. **Photos** (Step 12) — Portrait photo of Tomislav + hero image
3. **Hosting** (Step 25) — Hetzner VPS; needs provisioning before beta launch
4. **Premium price** — Currently €39/month. Original plan suggested €55–65. Confirm before launch.
5. **Fiscal / legal setup** — Croatian business registration, VAT number, accountant. Required before taking real payments.
6. **Video hosting** — YouTube embed vs. self-hosted (Bunny.net or Cloudflare Stream)

---

## Key design decisions already locked

- **Brand name:** Molekula Academy
- **Colors:** Deep teal `#0b343c`, accent teal `#0f8f86`, bright teal `#1ec8b6`
- **Fonts:** Bricolage Grotesque (headings) · DM Sans (body) · Space Mono (labels, formulas)
- **Languages:** Croatian primary, English secondary — live toggle on every page
- **Basic plan:** €19/month — lessons, practice, progress tracking, no chat
- **Premium plan:** €39/month — everything + video, quizzes, chat, 1 Zoom/month, feedback
- **First week free** — excludes mock exams and live sessions
- **Monthly billing only** for now
- **Tech stack:** React + Vite (frontend), Node.js + Express (backend), SQLite → PostgreSQL at scale
- **Separator character:** always `&middot;`

---

## How to resume

1. Open project in `/Users/tomislavkokotovic/Claude projects/Molekula Academy/`
2. Start backend: `cd backend && /usr/local/bin/node src/index.js &`
3. Start frontend via preview tool (`.claude/launch.json`)
4. Owner login: tomislav@molekula.hr / admin1234
5. Student login: student@test.com / test1234 (Premium)

---

*Plan maintained with Claude (Anthropic) — Cowork mode*
