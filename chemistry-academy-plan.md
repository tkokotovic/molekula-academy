# Molekula Academy — Master Build Plan

**Academy:** Molekula Academy  
**Teacher:** Tomislav  
**Last updated:** June 2026  
**Version:** 3.1

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

## PHASE 4 — Content Management (Backend ✅, Teacher UI ⬜)
*All backend routes are complete. The teacher admin UI still needs to be built.*

| # | Step | Status | Notes |
|---|------|--------|-------|
| 30 | Course CRUD API | ✅ | `backend/src/routes/courses.js` — create, list, update, archive |
| 31 | Topic CRUD API | ✅ | `backend/src/routes/topics.js` — nested under courses |
| 32 | Lesson CRUD API | ✅ | `backend/src/routes/lessons.js` — scheduled publish, tags, prerequisites |
| 33 | Lesson blocks API | ✅ | `backend/src/routes/lesson_blocks.js` — text, equation, image, video, molecule3d, table, flashcard, PDF, link, summary |
| 34 | Question bank API | ✅ | `backend/src/routes/questions.js` — MCQ, T/F, fill-blank, short-answer, chem-equation; import batches; AI-generated pending approval |
| 35 | Quiz builder API | ✅ | `backend/src/routes/quizzes.js` — teacher creates quizzes from question bank, sets time limit, max attempts, shuffle, pass score |
| 36 | Mock exam API | ✅ | Part of quizzes route — timed windows, grace period, hand-picked student lists, example exams |
| 37 | File upload API | ✅ | `backend/src/routes/upload.js` — multer, stored on disk, tracked in `uploads` table |
| 38 | Quiz library / assignments API | ✅ | `backend/src/routes/quiz_library.js` — teacher saves quizzes as reusable templates; assigns to specific students |
| 39 | AI grading API | ✅ | `backend/src/routes/grading.js` — AI suggests score for open answers; teacher overrides logged to improve future suggestions |
| 40 | Teacher content UI | ⬜ | React pages: create/edit courses, topics, lessons, blocks, questions, quizzes |

---

## PHASE 5 — Student Progress Tracking (Backend ✅, Frontend ⬜)

| # | Step | Status | Notes |
|---|------|--------|-------|
| 41 | Lesson progress API | ✅ | `backend/src/routes/progress.js` — per-lesson status, time-spent, streak calculation |
| 42 | Progress analytics API | ✅ | Course completion %, quiz score history, topic strength/weakness, streak — all in `progress.js` |
| 43 | Certificate issuance API | ✅ | `backend/src/routes/certificates.js` — auto-issued when all lessons done + quiz ≥ 70%; UNIQUE constraint prevents duplicates |
| 44 | Teacher student overview API | ✅ | `backend/src/routes/progress.js` — teacher gets table of all students with stats |
| 45 | Progress frontend page | ⬜ | React page wired to the real API |
| 46 | Certificate download frontend | ⬜ | Download PDF from the API |

---

## PHASE 6 — Student-Facing Frontend (React App)
*The React app is started but thin. Most pages need to be built.*

| # | Step | Status | Notes |
|---|------|--------|-------|
| 47 | Login / register page | ✅ | `frontend/src/pages/LoginPage.jsx` — wired to `/api/auth` |
| 48 | Courses list page | ✅ | `frontend/src/pages/CoursesPage.jsx` — fetches published courses |
| 49 | Course detail page | ✅ | `frontend/src/pages/CourseDetailPage.jsx` — shows topics + lessons list |
| 50 | Lesson viewer page | ✅ | `frontend/src/pages/LessonPage.jsx` — all block types rendered (text, equation/KaTeX, image, video, keypoint, summary, table, flashcard, pdf, link, molecule3d), sticky sidebar outline, mark-as-complete, prev/next navigation, breadcrumb |
| 51 | Quiz flow page | ✅ | `frontend/src/pages/QuizPage.jsx` — start screen, all 5 question types (MCQ, T/F, fill-blank, short-answer, chem-equation), countdown timer with auto-submit, dot navigation, results screen with score ring + per-question feedback |
| 52 | Dashboard home | ✅ | `frontend/src/pages/DashboardPage.jsx` — greeting + time-of-day, streak badge (flame, colour-coded), 4-stat row (lessons, time, quizzes, avg score), continue-learning card with progress bar, course progress list, quick links grid, Zoom session card |
| 53 | Progress page | ✅ | `frontend/src/pages/ProgressPage.jsx` — completion rings (SVG), quiz history bar chart (pure SVG), topic strength heatmap, certificate download |
| 54 | Messages / chat page | ✅ | `frontend/src/pages/MessagesPage.jsx` — chat thread, day dividers, teacher/student bubbles, compose bar, Premium gate for Basic users |
| 55 | Schedule / booking page | ✅ | `frontend/src/pages/SchedulePage.jsx` — upcoming session card, monthly quota badge (1/month Premium), Calendly inline embed, Basic upsell overlay |
| 56 | Settings / account page | ✅ | `frontend/src/pages/SettingsPage.jsx` — profile edit, password change, subscription status, language/theme toggles, logout · `PATCH /api/auth/profile` backend endpoint |

---

## PHASE 7 — Communication
*Goal: Student and teacher can communicate. Teacher is notified instantly.*

| # | Step | Status | Notes |
|---|------|--------|-------|
| 57 | Chat system with permanent history | ⬜ | Database tables + API for private chat threads; stored permanently |
| 58 | Email notification to teacher on new message | ✅ | Nodemailer service in `backend/src/services/email.js`; dev-mode logs, prod via SMTP env vars |
| 59 | Automated student emails | ✅ | Welcome on register, certificate earned, teacher-reply notification; inactivity nudge skipped (needs cron) |
| 60 | Session scheduling | ⬜ | Cal.com or Calendly integration; Zoom link auto-sent by email; Premium = 1 free/month |

---

## PHASE 8 — Teacher Admin Panel
*Goal: Tomislav can run the entire academy from one place.*

| # | Step | Status | Notes |
|---|------|--------|-------|
| 61 | Student roster UI | ✅ | `frontend/src/pages/admin/AdminStudentsPage.jsx` — table with search, plan badge (clickable upgrade/downgrade), lessons/quizzes/avg score/last active columns |
| 62 | Individual student view UI | ✅ | `frontend/src/pages/admin/AdminStudentDetailPage.jsx` — profile header, course progress rings, quiz history, certificates, plan switcher |
| 63 | Revenue dashboard UI | ✅ | `frontend/src/pages/admin/AdminRevenuePage.jsx` — MRR estimate, Premium/Basic counts, plan split bar, 6-month signup chart |
| 64 | Content management UI | ⬜ | Create/edit/reorder/unpublish lessons, quizzes, questions — teacher-facing React pages (see Step 40) |

---

## PHASE 9 — Launch
*Goal: First real paying students.*

| # | Step | Status | Notes |
|---|------|--------|-------|
| 65 | Legal pages | ⬜ | Privacy Policy, Terms of Service (GDPR + Croatian law required before real signups) |
| 66 | Full end-to-end test | ⬜ | Simulate: land → sign up → pay → complete lesson → take quiz → message → teacher replies → cancel → resubscribe → progress preserved |
| 67 | Beta launch — invite known students | ⬜ | 5–10 students you know. Free or discounted first month. Collect feedback, fix critical issues, ask for testimonials |
| 68 | Replace sample testimonials | ⬜ | Swap 3 placeholder quotes in `content.js` with real beta student quotes |
| 69 | Public launch | ⬜ | Post on social media, Facebook groups for IB Croatia and medical applicants. Consider: first 20 students get 20% off forever |

---

## Summary

| Phase | Steps | Done | Status |
|-------|-------|------|--------|
| Phase 1 — Design Prototype | 01–20 | 19/20 | ✅ (Step 12 blocked on photos) |
| Phase 2 — Infrastructure | 21–25 | 3/5 | 🔄 (hosting + domain outstanding) |
| Phase 3 — Billing | 26–29 | 0/4 | ⬜ |
| Phase 4 — Content Management (backend) | 30–40 | 10/11 | 🔄 (teacher UI outstanding) |
| Phase 5 — Progress Tracking (backend) | 41–46 | 4/6 | 🔄 (frontend pages outstanding) |
| Phase 6 — Student Frontend | 47–56 | 10/10 | ✅ Complete |
| Phase 7 — Communication | 57–60 | 0/4 | ⬜ |
| Phase 8 — Teacher Admin Panel | 61–64 | 3/4 | 🔄 (content UI outstanding) |
| Phase 9 — Launch | 65–69 | 0/5 | ⬜ |
| **Total** | **69 steps** | **42/69** | |

---

## Where we are now

**Last session completed (June 2026):** Steps 54–56 — Messages page, Schedule page, Settings page. Phase 6 (Student Frontend) now 100% complete.

### What was built this session
- `frontend/src/pages/MessagesPage.jsx` — chat thread, day dividers, compose bar, Premium gate
- `frontend/src/pages/SchedulePage.jsx` — upcoming sessions, monthly quota, Calendly embed (`&locale=hr/en`), Basic upsell
- `frontend/src/pages/SettingsPage.jsx` — profile edit, password change, subscription badge, language/dark mode toggles, logout
- `backend/src/routes/auth.js` — added `PATCH /api/auth/profile` (name, email, password change with bcrypt verify)
- `frontend/src/api/client.js` — added `updateProfile()`, fixed `getMe()` (backend returns user directly, not wrapped)
- `.claude/launch.json` — Vite preview server config
- Node 24 native module fixes: frontend `npm install` (rolldown), backend `npm rebuild better-sqlite3`

### Next step to build
**Phase 3 — Billing (Step 26 — Stripe integration)**
- Stripe Checkout for new subscriptions (Basic €19/mo, Premium €39/mo)
- Webhook handler for `payment_intent.succeeded`, `customer.subscription.deleted`, etc.
- Update `subscription_tier` in DB on payment events

### After that
1. Step 27–29 — Subscription management, progress preservation, invoices
2. Phase 7 — Communication backend (real chat API, email notifications)
3. Phase 8 — Teacher admin panel

**To resume:** Open the Instrukcije folder in Cowork and say "read this folder and continue where we stopped".

---

## Key decisions still open

1. **Domain name** (Step 24) — molekula-academy.hr? molekulaacademy.com?
2. **Photos** (Step 12) — Portrait photo of Tomislav + hero image (student at desk, lab, or similar)
3. **Hosting** (Step 25) — Hetzner VPS recommended; needs to be provisioned before beta launch
4. **Premium price** — Currently €39/month in the prototype. Original plan suggested €55–65. Confirm before launch.
5. **Fiscal / legal setup** — Croatian business registration, VAT number, accountant. Required before taking real payments.
6. **Video hosting** — YouTube embed vs. self-hosted (Bunny.net or Cloudflare Stream)
7. **Chat system** — Build custom vs. embed Tawk.to or Crisp (custom preferred for full history in DB)

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

*Plan maintained with Claude (Anthropic) — Cowork mode*
