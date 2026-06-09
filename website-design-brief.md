# Chemistry Academy — Website Design Brief
**For use in Claude / design tools — standalone reference**

---

## 1. Project Overview

A bilingual (Croatian + English) online chemistry tutoring academy. Primary market is Croatia; English version planned for future international expansion.

**Business type:** Online education / subscription SaaS  
**Owner:** Boris (the teacher — solo for now, team later)  
**Launch timeline:** 3–6 months  

---

## 2. Target Audience

| Segment | Age | Pain Point |
|---|---|---|
| IB Chemistry students (HL & SL) | 16–18 | High-pressure final exams, need structured help |
| Medical / dental school applicants | 18–22 | Competitive entrance exams, chemistry is a barrier |
| Medicine & dentistry university students | 19–25 | Biochemistry / organic chemistry at university level |

**Persona:** A motivated Croatian 17-year-old preparing for IB Chemistry HL. Stressed, willing to pay (parents pay), looking for someone who explains things clearly — not another textbook.

---

## 3. Brand & Tone

**Tone:** Smart, warm, direct. Like a brilliant older student explaining things — not a cold institution. Confident but approachable.

**NOT:** Childish, corporate, overly formal, generic "e-learning" look.

**Chemistry visual language ideas:**
- Molecular structures / hexagonal patterns (benzene ring motif)
- Periodic table elements as design accents
- Clean lab aesthetic: white + one strong accent color
- Formulas and equations rendered elegantly

**Suggested color direction:**
- Primary: Deep teal or navy blue (trustworthy, scientific)
- Accent: Bright teal or electric blue (modern, digital)
- Background: White or very light grey
- Text: Near-black (#1a1a2e or similar)

**Typography direction:**
- Headings: Modern sans-serif (e.g. Inter, Outfit, or DM Sans) — bold, confident
- Body: Clean, readable sans-serif
- Equations/formulas: Monospace or specialized math font

---

## 4. Website Structure

### 4A. Public Website (visible to all)

#### Page 1: Landing Page (Home)

**Section 1 — Hero**
- Big headline: e.g. *"Chemistry explained so it finally makes sense"*
- Sub-headline: *"Structured lessons, quizzes, and live tutoring for IB, medical & dental school students"*
- Two CTA buttons: "Start for Free" (Basic trial) and "See Plans"
- Visual: Clean illustration or photo — student studying, molecular background, or abstract chemistry motif

**Section 2 — Social Proof / Trust Bar**
- "Trusted by IB, medical, and dental school students across Croatia"
- Could show logos of IB, Croatian medical schools, or simple student count: "50+ students · 95% pass rate"

**Section 3 — Who This Is For**
- 3 cards:
  - IB Chemistry (HL & SL)
  - Medical & Dental School Entrance
  - University Medicine & Dentistry
- Each card: icon + 2-line description + "Learn more" link

**Section 4 — How It Works**
- 3-step flow (icons + short text):
  1. Choose your plan (Basic or Premium)
  2. Study at your own pace (lessons, quizzes, mock exams)
  3. Get personalized help (chat + live Zoom sessions)

**Section 5 — Features Overview**
- Icon grid: Written lessons · Video lessons · Practice quizzes · Mock exams · Progress tracking · Teacher chat · Session booking · Certificates
- Brief 1-line description under each

**Section 6 — About the Teacher**
- Photo of Boris
- Short bio: credentials, years of teaching, why he started this academy
- Warm, personal tone — not a CV

**Section 7 — Testimonials**
- 3–4 student testimonials (to be added after beta launch)
- Placeholder design for now

**Section 8 — Pricing**
- Two cards: Basic and Premium (see Section 6 of this brief for details)
- "Most popular" badge on Premium
- Monthly billing, cancel anytime note
- CTA button on each card

**Section 9 — FAQ**
- 6–8 questions, accordion-style, e.g.:
  - Is this good for IB Chemistry HL?
  - How do live sessions work?
  - Can I switch plans?
  - What if I fall behind?
  - Is there a free trial?
  - What language is the content in?

**Section 10 — Final CTA**
- "Ready to stop struggling with chemistry?" headline
- Single "Get Started" button

**Footer**
- Logo + tagline
- Links: Home · Pricing · Blog · About · Contact
- Legal: Privacy Policy · Terms of Service · Cookie Policy
- Language toggle: HR | EN
- Social media icons

---

#### Page 2: Pricing Page
- Same two-card layout as landing page section 8, but with full feature comparison table
- FAQ below the cards
- Trust signals (money-back guarantee, cancel anytime)

#### Page 3: Blog / Free Resources
- Article grid layout
- Categories: IB Chemistry · Entrance Exam Tips · University Chemistry · Study Tips
- SEO-focused content to drive organic traffic

#### Page 4: About
- Expanded teacher bio
- Mission statement for the academy
- Photo(s)

#### Page 5: Contact
- Simple form
- Email address
- Note about response time

#### Page 6: Legal (Privacy Policy, Terms, Cookies)
- Standard layout, minimal design

---

### 4B. Student Platform (behind login — authenticated users only)

#### Dashboard (Home Screen after Login)
**Components:**
- Welcome back greeting with student name
- Progress summary widget: "You have completed X% of [current module]"
- Last quiz score + quick "retry" button
- Streak counter: "🔥 5-day study streak"
- Upcoming session widget (if booked)
- Notification bell (new content, chat messages)
- Quick access buttons: Continue Learning · Take a Quiz · Chat with Teacher

#### Learning Modules Page
- Course list organized by category:
  - IB Chemistry HL
  - IB Chemistry SL
  - Entrance Exam Prep (Medical/Dental)
  - University Chemistry
- Each course shows: title, % completed, number of lessons, locked/unlocked status
- Progress bar per course

#### Single Module / Lesson Page
- Lesson title + estimated reading time
- Theory content (text, images, chemical formulas rendered with MathJax)
- Worked examples section
- Practice problems (inline, self-marking)
- "Mark as complete" button
- Navigation: ← Previous Lesson · Next Lesson →
- Related quiz button

#### Quiz Page
- Clean, focused UI — one question at a time or all on one scroll (decide in design phase)
- Question types: multiple choice, fill in the blank, calculation input
- Immediate feedback after each answer: correct (green) / incorrect (red) with explanation
- Score summary at end: "You scored 7/10 — great work on stoichiometry, review redox!"
- Option to retry or move on

#### Mock Exam Page
- Exam list with: name, question count, time limit, difficulty
- Timer visible during exam
- Submit confirmation dialog
- Results page with score, breakdown by topic, comparison to previous attempts

#### Progress Page
- Visual charts: overall completion, quiz scores over time, topic strength/weakness heatmap
- Module-by-module breakdown
- Certificates earned (downloadable PDF)

#### Chat Page (Premium only)
- Simple messaging interface: student on right, teacher on left
- Timestamps, read receipts
- "Premium feature" lock overlay shown to Basic users with upgrade CTA

#### Session Booking Page (Premium priority, Basic add-on)
- Calendar showing Boris's available slots
- Click to book → confirmation email with Zoom link sent automatically
- Upcoming sessions list
- Session history

#### Account & Billing Page
- Profile settings (name, email, password, photo)
- Current subscription: plan name, renewal date, price
- Upgrade / downgrade / cancel buttons
- Invoice download history

---

### 4C. Teacher Admin Panel (Boris only)

- Student list with progress stats
- Content editor: create/edit lessons, quizzes, exams
- Chat inbox: all student conversations
- Session calendar: set availability, view bookings
- Revenue dashboard: subscribers, MRR, churn

---

## 5. Navigation Structure

### Public (logged out)
```
Logo | Home | About | Blog | Pricing | [Login] [Start Free]
```

### Student (logged in)
```
Logo | Dashboard | My Courses | Quizzes | Progress | [Chat icon] [Schedule icon] [Account avatar]
```

### Mobile
- Hamburger menu for public nav
- Bottom tab bar for student platform: Home · Courses · Progress · Chat · Account

---

## 6. Subscription Tiers (Design Reference)

### Basic — €25–30/month
✓ All written theory notes & lessons  
✓ All practice problems (self-marking)  
✓ Quizzes with instant feedback  
✓ Progress dashboard & tracking  
✓ Completion certificates  
✗ Teacher chat (locked)  
✗ Session booking (locked — available as one-off add-on)  

### Premium — €55–65/month ⭐ Most Popular
✓ Everything in Basic  
✓ Direct chat with the teacher  
✓ 1 live Zoom session per month included  
✓ Mock exam written feedback from teacher  
✓ Priority response time  
✓ Additional sessions bookable as add-ons  

---

## 7. Key UX Principles

- **Mobile-first** — most students will use phones
- **Friction-free learning** — student should be in a lesson within 2 clicks of logging in
- **Progress visibility** — always show where the student is and where they're going
- **Upgrade prompts** — Basic users see Premium features locked (not hidden), encouraging upgrades
- **Chemistry-appropriate** — the platform must render formulas, equations, and structures correctly (MathJax / KaTeX)
- **Bilingual** — every public-facing string needs a Croatian and English version

---

## 8. Technical Stack (for developer reference)

| Layer | Technology |
|---|---|
| CMS / Platform | WordPress |
| LMS | LearnDash |
| Subscriptions | WooCommerce + WooCommerce Subscriptions |
| Payments | Stripe (+ Corvuspay for local Croatian cards) |
| Chat | Tawk.to |
| Scheduling | Calendly (embedded) |
| Video sessions | Zoom |
| Formula rendering | MathJax |
| Theme | Astra Pro + Elementor |
| Hosting | Hostinger or SiteGround |

---

## 9. Content Inventory (what needs to be created)

### Written content needed:
- Homepage copy (all 10 sections)
- About page (teacher bio)
- Pricing page copy
- FAQ answers (8–10 questions)
- Privacy Policy (GDPR-compliant, Croatian law)
- Terms of Service
- Email templates: welcome, receipt, session reminder, inactivity nudge
- First 3 chemistry modules (lessons + quizzes)
- First mock exam

### Visual assets needed:
- Logo
- Teacher photo (professional or clean casual)
- Hero image or illustration
- Icons for features section
- Course cover images (one per topic)

---

## 10. Return Notes (for coming back to this project)

When returning to this project in a new Claude session, paste this brief and say:

> "I am building a chemistry online academy. Here is the design brief. I want to continue from where I left off — [describe what you last worked on]."

**Progress so far (as of June 2026):**
- ✅ Business plan complete (see `chemistry-academy-plan.md`)
- ✅ Design brief complete (this file)
- ⬜ Academy name — not yet decided
- ⬜ Domain — not yet registered
- ⬜ WordPress setup — not started
- ⬜ Landing page content written — not started
- ⬜ First course module created — not started

---

*Generated with Claude (Anthropic) — Cowork mode, June 2026*
