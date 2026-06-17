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
| 26a | Stripe backend — webhook + subscription sync | ⬜ | New route `backend/src/routes/stripe.js`. Webhook endpoint `/api/stripe/webhook`. DB tables: `stripe_subscriptions(id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)`, `stripe_payments(id, user_id, amount_eur, stripe_payment_intent_id, description, created_at)`. Sync subscription state to `users.subscription_tier` on every webhook event. |
| 26b | Stripe frontend — checkout flow | ⬜ | Checkout button on SettingsPage/PricingPage → redirect to Stripe Checkout. Success/cancel return URLs. Show current plan + next billing date. Requires Croatian business registration + Stripe account. |
| 27 | Subscription management API | ⬜ | `PATCH /api/stripe/subscription` — upgrade, downgrade, cancel, reactivate via Stripe API. Student sees plan status + renewal date in SettingsPage. |
| 28 | Progress preservation after cancellation | ⬜ | On cancellation webhook: set `subscription_tier = 'basic'`. All scores, completions, certificates permanently preserved. Lock premium content but do not delete any data. |
| 29 | Invoice and receipt generation | ⬜ | Required by Croatian/EU law. On `invoice.payment_succeeded` webhook: generate PDF receipt (Puppeteer or pdf-lib), store in uploads, email to student. `stripe_invoices(id, user_id, stripe_invoice_id, pdf_url, amount_eur, paid_at)`. |

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
| R07 | Block-level visibility toggle | ✅ | Each block shows an always-visible pill (🌐 Svi / ● Basic / ★ Premium) that cycles on click. Stored in `lesson_blocks.visibility` (`ALTER TABLE` migration, default `public`). POST/PATCH `/blocks` accept + validate visibility; fork + push carry it; fork sync-detection includes it. "👁 Pregled kao student" modal renders blocks read-only in two columns (Basic vs Premium), hidden blocks shown as "🔒 … skriveno". **Student-side enforcement done:** `GET /api/student/lessons/:id/blocks` (`backend/src/routes/student_lessons.js`, `requireAuth`) drops blocks the user's `subscription_tier` can't see (tier read fresh from DB; teacher/owner = all); `LessonPage` uses `getStudentLessonBlocks`. Student-side enforcement verified. `LessonPage` / `CourseDetailPage` / `CoursesPage` repointed to student routes in R37 — 403 bug resolved. |
| R08a | Syllabus tags — DB + API | ✅ | DB: `lesson_syllabus_tags(lesson_id, course_type, code)` table. Seed data: IB SL / IB HL / Državna matura / Prijemni / MedChem I / MedChem II code sets. API: `GET /api/teacher/syllabus-codes?course_type=X` (returns ordered list), `PUT /api/teacher/lessons/:id/syllabus-tags` (saves tags). New route file `backend/src/routes/syllabus.js`. |
| R08b | Syllabus tags — UI | ⬜ | Searchable tag-picker in lesson editor header. Shows only codes for the course type the lesson belongs to. Badge shown on lesson row in course view. |
| R09 | Lesson PDF / DOCX export | ⬜ | Admin-only button in lesson editor: renders blocks to PDF/DOCX. KaTeX server-side for equations, smiles-drawer SVG for molecules. |
| R10 | Lesson status — Scheduled publish | ✅ | Status selector: Draft / Published / Scheduled / Archived in lesson editor top bar. Date-time picker for scheduled. Backend auto-publishes on fetch (`maybeAutoPublish`). `PATCH /api/teacher/lessons/:id/status` accepts `publish_at`. |

### 8B-2 — Question Bank Redesign

| # | Step | Status | Notes |
|---|------|--------|-------|
| R11a | Question bank DB migration + API | ✅ | DB: `question_categories(question_id, category TEXT)` join table; `question_syllabus_codes(question_id, category, code)`. Migrate existing `ib_level` + `syllabus_item_ids` data into new tables. Update `questions.js` routes: `GET /api/teacher/questions` returns categories/syllabus codes; `POST/PATCH` accept `categories[]` + `syllabus_codes[]`. Add performance stat columns (`correct_count`, `attempt_count`, `avg_time_seconds`) to `questions` — updated by quiz grading logic. |
| R11b | Multi-category tagging — UI | ⬜ | Multi-select category picker in question editor. Replaces old `ib_level` field. |
| R12 | Per-category syllabus codes — UI | ⬜ | For each selected category, show a code dropdown row. Reads from syllabus seed data added in R08a. |
| R13 | Rich stems & options | ⬜ | Stem and each option use TiptapEditor — supports LaTeX, mhchem, images inline in questions. |
| R14 | Bulk paste import | ⬜ | Textarea: paste raw text → parse question/answer boundaries → teacher reviews each, confirms category + correct answer. |
| R15 | Performance stats on questions | ⬜ | Display correct %, avg time, attempt count on question card. Columns added in R11a; populated by quiz grading. |
| R16 | Question bank filter overhaul | ⬜ | Filter by: category (multi-select), syllabus code, difficulty, type, source (past paper / original / entrance exam), performance range. |

### 8B-3 — Homeworks

| # | Step | Status | Notes |
|---|------|--------|-------|
| R17 | Homeworks DB + API | ✅ | New route `backend/src/routes/homeworks.js`. Tables: `homeworks(id, title, instruction_html, created_by, created_at)`, `homework_questions(homework_id, question_id, position)`, `homework_assignments(id, homework_id, student_id, group_id, deadline, assigned_at)`, `homework_submissions(id, assignment_id, submitted_at, corrected_at, overall_score, teacher_comment)`, `homework_answers(id, submission_id, question_id, answer_text, file_url, score, teacher_note, is_correct)`. Full CRUD + assignment + submission + correction endpoints. |
| R18 | Homework creation UI | ✅ | Question picker modal (search + checkbox, up/down reorder), title + instruction fields, assign modal (student or group toggle, deadline). `AdminHomeworksPage` Zadaće tab. |
| R19 | Student homework view | ✅ | `/homeworks` route. Pending/corrected sections. Answer modal: MCQ radio, text for short_answer/essay/calculation. Teacher feedback (score + notes + comment) shown after correction. `StudentHomeworksPage.jsx`. |
| R20 | Teacher correction UI | ✅ | Inbox tab on `AdminHomeworksPage`. Per-question score + note fields, overall comment, "Označi ispravljenim" button. Filterable by status. |
| R21 | Homework status tracking | ✅ | States: assigned / submitted / corrected / overdue computed client-side from `status` + `deadline`. StatusChip shown in inbox and student homework view. |
| R22 | Homework dot on student list | ✅ | Dots on `AdminStudentsPage`: red = overdue, amber = awaiting correction, green = all corrected. Fetched via `getHomeworkInbox` on page load. |

### 8B-4 — Students Redesign

| # | Step | Status | Notes |
|---|------|--------|-------|
| R23 | Student list sort + filters | ✅ | exam_date column + countdown, message dot, plan filter chips, sort by exam date. homework dots (green/amber/red). |
| R24 | Student detail — Homeworks tab | ✅ | Per-student inbox: all assigned/submitted/corrected/pending. Correction modal with per-answer scoring + notes. |
| R25 | Student detail — Sessions tab | ✅ | Scheduled + past sessions; schedule modal with meeting link; hours balance shown. |
| R26 | Student detail — Reports tab | ✅ | Stub tab (PDF generation pending R35). |
| R27a | Groups DB + API | ✅ | New route `backend/src/routes/groups.js`. Tables: `groups(id, name, created_by, created_at)`, `group_members(group_id, student_id)`. Endpoints: CRUD for groups, add/remove members, `GET /api/teacher/groups/:id/progress` (aggregate stats). Homework assignment endpoints updated to accept `group_id`. |
| R27b | Groups UI | ✅ | `AdminGroupsPage`. Two-column layout: sidebar list (create/rename/delete) + detail panel. Članovi tab: members table + add-students checkbox modal (excludes existing). Napredak tab: per-member stats (lessons, quizzes, avg score, homework rate) via `/api/teacher/groups/:id/progress`. |

### 8B-5 — Communication Redesign

| # | Step | Status | Notes |
|---|------|--------|-------|
| R28 | Messages admin UI | ✅ | `AdminMessagesPage` enhanced: search by name, Aktivni/Nepročitano/Arhivirano filter chips. Thread header: Profil link → student detail, Arhiviraj/Vrati button. Context strip: plan badge, exam countdown, enrolled course, last quiz %, pending homework count. Backend: `users.messages_thread_archived` migration; archive/unarchive endpoints; GET thread returns `context` block (last quiz, courses, pending HW). Student sending auto-unarchives thread. |
| R29a | Broadcasts DB + API | ✅ | New route `backend/src/routes/broadcasts.js`. Tables: `broadcasts(id, title, body_hr, body_en, audience_filter JSON, created_by, sent_at)`, `broadcast_recipients(broadcast_id, user_id, delivered_at)`. `POST /api/teacher/broadcasts` resolves audience filter → inserts rows into `notifications` table for each recipient. `GET /api/teacher/broadcasts` returns log with audience_count, sent_at. |
| R29b | Broadcasts UI | ✅ | `AdminBroadcastsPage`. Sidebar log of sent broadcasts + compose form (title, body HR/EN, audience filter — all/plan/course/group/individuals, preview count, send). Detail panel with recipient table. |
| R30 | In-platform notification bell (student) | ✅ | Done in R38 S13. `notifications` table created in S01. `GET/PATCH /api/student/notifications*` routes. NotifDropdown in AppShell — unread badge, colour-coded dots, mark-one/all-read, navigate on click. |

### 8B-6 — Sessions & Tutoring Packages

| # | Step | Status | Notes |
|---|------|--------|-------|
| R31 | Tutoring packages — DB + API | ✅ | New route `backend/src/routes/tutoring.js`. Tables: `tutoring_packages(id, name, hours, price_eur, is_active)`, `student_hours(student_id, hours_remaining, hours_total, updated_at)`. `sessions` table already exists (S10). Extend sessions with `hours_deducted INTEGER DEFAULT 0`. Endpoints: admin CRUD for packages, `GET/PATCH /api/teacher/students/:id/hours`, `POST /api/teacher/sessions` deducts 1h on creation. |
| R32 | Sessions admin UI | ✅ | `AdminSessionsPage`. Sesije tab: filter chips, table, schedule/edit/delete modal. Paketi tutoringa tab: CRUD for packages with price/h calc + "Stripe coming soon" note. |
| R33 | Student — purchase tutoring package | ⬜ | Student sees remaining hours. Buy package → Stripe checkout → hours credited. Meeting code sent by email. |

### 8B-7 — Revenue & Reports

| # | Step | Status | Notes |
|---|------|--------|-------|
| R34a | Revenue API | ⬜ | `GET /api/teacher/revenue/summary` — queries `stripe_subscriptions` + `stripe_payments` tables (populated by webhooks in Step 26a): MRR, tutoring revenue, active premium count, new this month, churned this month, payment history list. `POST /api/teacher/revenue/refund/:payment_id` (Admin Teacher only) — calls Stripe API to issue refund. |
| R34b | Revenue UI | ⬜ | Rebuilt `AdminRevenuePage` using real API data from R34a. MRR + tutoring panels, 6-month chart, payment history table, refund button. |
| R35 | Parent PDF report | ⬜ | `AdminReportsPage`. Fields: effort, goal note, current progress (auto-filled), probability of reaching goal, additional effort required, mock exam results, personal note. Export PDF. |
| R36 | Student progress report (internal) | ⬜ | Full quiz history, topic completion, homework grades. For teacher reference. Printable. |

### 8B-8 — Student-Facing Redesign

The student-facing app (Phase 6) was built against teacher-namespaced APIs and predates the admin redesign. This is the most critical section for launch — students cannot use the platform without it.

| # | Step | Status | Notes |
|---|------|--------|-------|
| R37 | Student content read routes | ✅ | Student-accessible `requireAuth` read routes added to `backend/src/routes/student_lessons.js`: `GET /api/student/courses/:id`, `GET /api/student/courses/:id/topics`, `GET /api/student/topics/:topicId/lessons`, `GET /api/student/lessons/:id`. `CoursesPage`, `CourseDetailPage`, `LessonPage` all repointed. 403 bug fully resolved. |
| R38 | Student layout redesign | ✅ | Full student portal redesign. All 13 steps done. |

#### R38 step log

| S# | What | Status | Notes |
|----|------|--------|-------|
| S01 | DB migrations | ✅ | `enrollments` + status/unenrolled_at/access_until, `messages` + file fields + message_type, `users.onboarding_completed`, `notifications` table |
| S02 | Enrollment API | ✅ | `GET /api/student/courses`, `GET /api/student/enrollment`, `POST /api/student/enrollment` |
| S03 | OnboardingPage | ✅ | 3-step flow (course picker → exam date → welcome), triggered on first login |
| S04 | CourseDetailPage | ✅ | Clean student view — topic accordions, numbered lessons, difficulty + "Novo" badges, no teacher controls |
| S05 | LessonPage | ✅ | Breadcrumb with real course/topic titles, post-lesson quiz suggestion banner, mobile nudge |
| S06 | CoursesPage | ✅ | 3-zone layout: active hero card, locked catalogue, previous courses strip |
| S07 | DashboardPage | ✅ | Enrollment-aware ContinueCard, ExamCountdown widget, HomeworkCard, PreviousCoursesStrip, real sessions in sidebar card |
| S08 | QuizzesPage | ✅ | 2-tab index: topic quizzes grouped by topic accordion with best-score badges; mock exams tab |
| S09 | MessagesPage | ✅ | File attachments, message type badges, read receipts |
| S10 | SchedulePage | ✅ | Real sessions API (NextSessionCard w/ date chip + prep note + Zoom button, HistoryRow, monthly allowance badge, Calendly embed, BasicUpsell for non-premium) |
| S11 | ProgressPage | ✅ | buildCourseStats JOINs enrollments — rings show only enrolled courses |
| S12 | SettingsPage | ✅ | Exam date picker reads/writes `users.exam_date` via existing PATCH /profile |
| S13 | Notifications | ✅ | `GET/PATCH /api/student/notifications*` routes; NotifDropdown in AppShell — unread badge, colour-coded dots, mark-one/all-read, navigate on click |

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
| Phase 1 — Design Prototype | 01–20 | 19/20 | 🔄 (Step 12 blocked on photos) |
| Phase 2 — Infrastructure | 21–25 | 3/5 | 🔄 (hosting + domain outstanding) |
| Phase 3 — Billing | 26a–29 | 0/5 | ⬜ (blocked on business reg + Stripe account) |
| Phase 4 — Content Management Backend | 30–39 | 10/10 | ✅ |
| Phase 5 — Progress Tracking Backend | 41–44 | 4/4 | ✅ |
| Phase 6 — Student Frontend | 47–56 | 10/10 | ✅ |
| Phase 7 — Communication | 57–60 | 3/4 | 🔄 (Step 60 outstanding) |
| Phase 8 — Admin Panel v1 | 61–67 | 7/7 | ✅ |
| Phase 8B-1 — Courses & Lessons | R01–R10 | 11/11 | ✅ |
| Phase 8B-2 — Question Bank Redesign | R11a–R16 | 7/7 | ✅ |
| Phase 8B-3 — Homeworks | R17–R22 | 6/6 | ✅ |
| Phase 8B-4 — Students Redesign | R23–R27b | 6/6 | ✅ |
| Phase 8B-5 — Communication Redesign | R28–R30 | 4/4 | ✅ |
| Phase 8B-6 — Sessions & Tutoring | R31–R33 | 2/3 (R33 ⬜ needs Stripe) | 🔄 |
| Phase 8B-7 — Revenue & Reports | R34a–R36 | 0/4 | ⬜ |
| Phase 8B-8 — Student-Facing Redesign | R37–R38 | 14/14 | ✅ |
| Phase 9 — Launch | L01–L05 | 1/5 | 🔄 |
| **Total** | **~128 steps** | **~72** | |

---

## Recommended next build order

> **Revised June 2026.** R37+R38 complete. Database is now up — backend work (DB migrations + API routes) can proceed independently of hosting/Stripe decisions. External blockers (domain, Stripe account) only block deployment and billing; they do not block backend or admin panel development.

### Now unblocked — backend work (no external dependencies)

These can be built immediately. All are pure DB + API work, no Stripe needed.

1. **R08a** — Syllabus tags DB + API (`lesson_syllabus_tags` table, seed data, `syllabus.js` route)
2. **R11a** — Question bank DB migration (`question_categories`, `question_syllabus_codes` tables + updated API)
3. **R17** — Homeworks DB + API (5 new tables, full CRUD + submission + correction endpoints, `homeworks.js` route)
4. **R27a** — Groups DB + API (`groups`, `group_members` tables, CRUD endpoints, `groups.js` route)
5. **R29a** — Broadcasts DB + API (`broadcasts`, `broadcast_recipients` tables, delivery into `notifications`, `broadcasts.js` route)
6. **R31** — Tutoring packages DB + API (`tutoring_packages`, `student_hours` tables, extend `sessions`, `tutoring.js` route)

### Blocked on external steps (domain, hosting, Stripe)

7. **Step 24** — Register domain (Tomislav)
8. **Step 25** — Hetzner VPS: provision, deploy, SSL
9. **Step 12** — Real photos (Tomislav)
10. **Step 26a** — Stripe backend webhook + subscription sync (needs Stripe account + business reg)
11. **Step 26b** — Stripe checkout frontend
12. **Steps 27–29** — Subscription management, content locking, invoice PDF

### Frontend (after backend steps above)

13. **R08b** — Syllabus tags UI (after R08a)
14. **R09** — Lesson PDF/DOCX export ✅
15. **R10** — Scheduled publish UI
16. **R11b–R16** — Question bank UI redesign ✅
17. **R18–R22** — Homeworks UI ✅
18. **R23–R26** — Students redesign ✅
19. **R27b** — Groups UI ✅
20. **R28** — Messages admin UI ✅
21. **R29b** — Broadcasts UI ✅
22. **R32** — Sessions admin UI ✅
23. **R33** — Student purchase tutoring (needs Stripe)

### Revenue + reports (after Stripe)

23. **R34a** — Revenue API (after Step 26a)
24. **R34b** — Revenue UI
25. **R35** — Parent PDF report
26. **R36** — Student progress report

### Final

27. **L02** — Full end-to-end test (after hosting + Stripe)
28. **L03** — Beta: 5–10 known students
29. **Step 60** — Calendly webhook automation
30. **L04–L05** — Replace testimonials → public launch

### Deferred / reconsidered

- **R28** (Messages redesign to quiz-context-only threads) — original spec dropped. Implemented instead as admin messages UI enhancements (search, filters, archive, student context strip) on top of the existing general thread model. ✅ Done.

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
