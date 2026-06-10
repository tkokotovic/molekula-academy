# Molekula Academy

## What it is
A bilingual (Croatian + English) online chemistry tutoring academy. Primary market is Croatia; English version planned for international expansion later.

**Owner:** Boris (the teacher)
**Built by:** Tomislav (TK)
**Launch timeline:** 3–6 months (per design brief, written ~June 2026)

## Target audience
- IB Chemistry students (HL & SL), ages 16–18
- Medical/dental school applicants, ages 18–22
- Medicine & dentistry university students, ages 19–25

## Structure
- Public marketing site: home, pricing, blog, about, contact, legal
- Student platform (behind login): dashboard, learning modules, lessons, quizzes, mock exams, progress, chat (Premium), session booking, account/billing
- Teacher admin panel: student list/progress, content editor, chat inbox, session calendar, revenue dashboard

## Subscription tiers
- **Basic** (€25–30/mo): lessons, practice problems, quizzes, progress tracking, certificates
- **Premium** (€55–65/mo, most popular): everything in Basic + teacher chat, 1 live Zoom session/month, mock exam feedback, priority response

## Tech stack (actual direction — NOT WordPress)
Custom build: Node/Express backend (JWT auth, better-sqlite3) + React (JSX) frontend. The WordPress/LearnDash/WooCommerce/Astra/Elementor stack from the original design brief was the initial plan but is no longer the direction — superseded by the custom stack.

Still relevant from the brief: Stripe + Corvuspay (payments), Tawk.to (chat), Calendly (scheduling), Zoom (video sessions), MathJax (formula rendering) — these may still apply as integrations regardless of platform.

## Status as of June 2026 (from design brief)
- Done: business plan, design brief
- Not yet: academy name finalized, domain registered, WordPress/platform setup, landing page copy, first course module

## Key files
- `website-design-brief.md` — full design brief
- `sections/` — HTML sections for landing page (hero, trust bar, pricing, FAQ, etc.)
- `design-system/` — tokens, components, design system reference
- `app/` — student platform screens (dashboard, lessons, quizzes, progress, schedule, messages, settings)
- `backend/` — Node/Express backend
