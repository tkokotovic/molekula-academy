# Student Portal — Design & Build Plan
*Authored June 2026 from interview with Tomislav. This is the authoritative spec for R38 (student-facing redesign).*

---

## Product decisions

### Enrollment model
- **One active course per student at all times.** Chosen during onboarding (first login).
- **All course switches go through Tomislav manually.** He approves or declines via the admin student detail page.
- **ToS clause required:** switching is at Tomislav's discretion; abusive or pattern switching will be refused.
- **Content lock on switch:** when a student's active enrollment changes, the previous course's lesson content becomes read-locked immediately. The student retains their completion %, quiz scores, and time-studied stats — permanently — but cannot re-open individual lessons.
- **Temporary access grant:** Tomislav can set an `access_until` date on a previous enrollment (e.g., "allow access to SL IB until July 15") so a transitioning student can refresh knowledge. Auto-locks when the date passes.
- **Subscription lapse:** progress records are preserved forever. Content locks while unsubscribed, unlocks when they re-subscribe (same course, or pick a new one).
- **Catalogue browsing:** all published courses are visible to all logged-in students. Non-enrolled courses show as locked ("Nije upisano — kontaktiraj nas"). No mystery — transparent catalogue builds trust and is a natural upsell.
- **Plan tiers (Basic / Premium):** always one course regardless of tier. Tier affects depth within the course — Premium-visibility lesson blocks, monthly session count — not the number of courses.
- **Multiple courses over a lifetime:** a student who does SL IB → Prijemni → MKBK1 → MKBK2 over several years has a "Prethodni kolegiji" history in their profile. Each past course shows final completion % and is locked. On re-subscribe, they pick any course (new or previous).

---

### Dashboard
- **Primary CTA:** "Nastavi učiti" → last unfinished lesson in active course. If brand new: "Počni učiti — Lekcija 1". This is the single most important element on the page.
- **Exam countdown:** shown only if student has set their exam date. Format: *"47 dana do ispita · 12% završeno"* with a thin progress arc. Calm teal colour, never red. Not dominant — motivating, not anxiety-inducing. If no date set: soft prompt "Dodaj datum ispita →".
- **Homework card:** visible only when there is unsubmitted homework assigned by Tomislav. Hidden (not an empty section) when nothing is assigned.
- **Streak:** small 🔥 badge next to the greeting. Nice-to-have, not a featured widget.
- **Stats row:** lessons completed, time studied this week, quiz average. Below the fold.
- **Previous courses strip:** if student has past enrollments, a compact row at the bottom shows each past course with their completion % — locked, read-only, but a satisfying record of progress.
- **Next session card:** shows upcoming booked session with date/time + Zoom link. "Nije zakazana" if nothing booked.

---

### Course outline (CourseDetailPage — student version)
- **Full syllabus visible upfront.** No topic locking or progressive gating. Students legitimately need to jump ahead for exam prep.
- **Recommended path is syllabus order** (lessons numbered 1, 2, 3…). Free navigation allowed — student can open any lesson at any time.
- **Per lesson row:** number, title, difficulty badge, completion checkmark (✓ when done), "Novo" badge when Tomislav publishes something new. No duration shown for now.
- **No teacher controls.** No "+ Nova tema", no "Obriši", no status badges. Students see only content.
- **Enrolled course** is the prominent view. Other courses accessible via the course catalogue but locked.

---

### Quizzes
- **Post-lesson prompt:** after a student completes a lesson, a non-blocking suggestion appears at the bottom: "Provjeri znanje — uzmi kviz za ovu lekciju →". Not forced, not modal. Student can ignore and continue.
- **Retakes:** unlimited. **Best score** shown as official record on the lesson/quiz list. Full attempt history (all attempts with timestamps and scores) is visible to Tomislav in admin.
- **Quizzes tied to individual lessons.** Each lesson may have one associated quiz.
- **Mock exams:** assigned by Tomislav to one student or a group. Timed, simulates the real IB/Prijemni format. Separate tab on the Kvizovi page.
- **Kvizovi page:** Tab 1 — all lesson quizzes in enrolled course, grouped by topic, showing score or "Nije rješeno". Tab 2 — assigned mock exams (pending and past).

---

### Messages
- **File attachments supported:** photos of handwritten work, chemistry structures, exam scans. Shown inline in the thread as thumbnails (tap/click to expand).
- **Message types:**
  - `message` — standard student↔Tomislav exchange
  - `broadcast` — Tomislav sends to all students or a group; appears in each student's inbox with a 📢 indicator
  - `session_summary` — flagged message after a session; appears highlighted in the thread with a 📋 label and can have attached homework
- **Async feel:** 24–48h response time. Clear sent/read timestamps. Not a live chat UI — closer to a structured inbox.
- **Read receipts:** student sees when Tomislav has read their message.

---

### Sessions & schedule
- **Booking:** Calendly link for now — in-app styled card with a "Zakaži sesiju" button that opens Calendly. Will become native booking when scheduling system is built.
- **Before session:** card shows date/time, Zoom link, and optional prep note from Tomislav ("Pripremi se: Alkeni, poglavlje 3").
- **After session:** Tomislav sends a session summary message (type `session_summary`) in the student's thread — highlighted, with optional attached follow-up homework.
- **Session history:** past sessions listed in the SchedulePage with date, topic discussed (from Tomislav's note), and link to the follow-up message.

---

### Mobile & language
- **Mobile-first** responsive design. Fully functional on mobile.
- **Desktop nudge:** one-time dismissible banner on the LessonPage on mobile — *"Za bolji doživljaj učenja, preporučamo desktop / For the best study experience, we recommend desktop."* Dismissed permanently per device.
- **Bilingual HR/EN throughout.** Every label, button, heading — both languages available via the existing toggle. Uploaded materials are labeled with their language (HR / EN flag tag on files).

---

### Onboarding (first login)
Three screens shown once, before dashboard:
1. **Pick your course** — card grid of all published courses, student selects one. "Nemožeš se odlučiti? Kontaktiraj Tomislava →"
2. **Set your exam date** — optional date picker. Can skip ("Postavi kasnije").
3. **Welcome** — personalised: "Dobrodošao/la, [Name]! Tvoj kolegij [Course] je spreman." with a "Počni učiti →" CTA.

`users.onboarding_completed` flag ensures this shows only once.

---

### Settings page
- Name, email, password change
- Language preference (HR / EN)
- Exam date (set or update)
- Notification preferences (email on: Tomislav replied / new homework / new lesson published)
- **Cancel subscription** — in-app flow with a confirmation step and a final "Žao nam je što odlaziš" screen. Sends Tomislav a notification.

---

### Notifications
- **In-app bell** in the topbar with unread dot/count.
- **Email notifications** for: Tomislav replied to a message, new homework assigned, new lesson published in their course.
- Student can toggle each type in Settings.
- Notification bell opens a dropdown panel with recent notifications; "Označi sve kao pročitano" action.

---

### Privacy
Fully private and individual. Students never see other students, other enrollments, or any aggregate data about who else is on the platform.

---

## Database changes needed

| Table | Change |
|-------|--------|
| `enrollments` | Add `status` TEXT DEFAULT `'active'` (active \| paused \| completed), `unenrolled_at` DATETIME, `access_until` DATETIME |
| `messages` | Add `file_url` TEXT, `file_name` TEXT, `file_size` INTEGER, `message_type` TEXT DEFAULT `'message'` (message \| broadcast \| session_summary) |
| `users` | Add `onboarding_completed` INTEGER DEFAULT 0 |
| `notifications` (new) | `id`, `user_id`, `type` TEXT, `title_hr` TEXT, `title_en` TEXT, `body_hr` TEXT, `body_en` TEXT, `action_url` TEXT, `read_at` DATETIME, `created_at` DATETIME |

---

## Build steps

| # | Step | Scope | Notes |
|---|------|-------|-------|
| S01 | DB migrations | Backend | All 4 DB changes above. Migration in `db.js` as always. |
| S02 | Enrollment API (student) | Backend | `GET /api/student/enrollment` — returns active enrollment with course data, `access_until` on previous enrollments. Middleware helper `requireEnrolled(courseId)` for content access gating. |
| S03 | OnboardingPage | Frontend | 3-step flow on first login. Picks course → `POST /api/student/enrollment`. Sets exam date → `PATCH /api/auth/profile`. Sets `onboarding_completed = 1`. |
| S04 | CourseDetailPage redesign | Frontend | Remove all teacher controls. Clean student course outline: topic accordions, lesson rows (number + title + difficulty + completion + Novo badge). No status badges. |
| S05 | LessonPage improvements | Frontend | Fix breadcrumb (topic title not ID). Post-lesson quiz suggestion banner. One-time mobile desktop nudge. |
| S06 | CoursesPage update | Frontend | Highlight active enrolled course. Locked catalogue state for others. "Prethodni kolegiji" section at bottom. |
| S07 | DashboardPage updates | Frontend | Primary "Nastavi učiti" CTA. Exam countdown widget. Homework card (conditional). Streak badge. Previous courses strip. |
| S08 | QuizzesPage | Frontend | Replaces stub. Tab 1: lesson quizzes by topic with scores. Tab 2: mock exams. |
| S09 | MessagesPage — file attachments | Frontend + Backend | File upload to `/api/student/messages` (multipart). Inline thumbnail display. Message type rendering (broadcast 📢, session_summary 📋). Read receipts. |
| S10 | SchedulePage | Frontend + Backend | Calendly card. Next session display. Session history list. Prep note display. Session summary link from thread. |
| S11 | SettingsPage | Frontend | Exam date field. Notification prefs. Cancel subscription flow. |
| S12 | Notifications — in-app bell | Frontend + Backend | `notifications` table. Bell icon with unread count. Dropdown panel. Auto-create notifications on: new message, new homework, new lesson published. |
| S13 | Email notifications | Backend | Nodemailer (or similar). Triggered by same events as S12. Respects per-student preferences. |

**Total: 13 steps.** S01–S05 are the critical path (unblock content access + onboarding + course view). S06–S08 fill out the core experience. S09–S13 are the communication and notification layer.

---

## Build priority

**Ship-blocking (before first real student):** S01, S02, S03, S04, S05
**Core experience:** S06, S07, S08
**Communication layer:** S09, S10, S11
**Nice-to-have for launch:** S12, S13

---

*Companion documents: `chemistry-academy-plan.md` (master plan), `admin-panel-plan.md` (teacher side)*
