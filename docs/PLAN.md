# Plan: Sinhala Awurudu Uthsawaya Game Management Web App

## TL;DR
Build a mobile-responsive Next.js web app to manage games, participants, scheduling, scoring, voting, and photo sharing at a Sinhala New Year festival. Firebase (free tier) for real-time data, auth, and photo storage. Hosted on Vercel. Bilingual (Sinhala + English). Admin-only auth with public viewing via QR code. Deadline: ~24 hours before May 2, 2026 event.

---

## UX Design

### Visual Style (from Shutterstock reference images)
- **Clean & minimal** layout with traditional Sri Lankan vector art accents
- Art style from references: flat vector illustrations with warm gradient backgrounds (sunset orange-to-gold), traditional Sinhala motifs:
  - Oil lamp (pol thel pahana) as a recurring icon/logo element
  - Kokis/sweets, clay pot (kiri hatti), drums, traditional masks
  - Sunrise/sun motifs with radiating rays
  - Floral borders with traditional Sri Lankan patterns (lotuses, vines)
  - Stylized Sinhala calligraphy for headers ("සුභ අලුත් අවුරුද්දක් වේවා")
  - Characters in traditional sarong/saree attire (flat vector, faceless or minimal detail)
- SVG illustrations per game (e.g., pot for kiri kaweema, spoon for tomato race, rope for kamba adeema)
- Rounded card UI with subtle shadow, inspired by Mentimeter's clean card-based layout

### Color Palette (extracted from reference images)
- **Primary:** Deep maroon/burgundy (#8B1A1A) & rich gold (#D4A843)
- **Gradient backgrounds:** Warm sunset orange (#F4845F) → golden yellow (#F7DC6F) (used in hero/banners)
- **Surface:** Cream/off-white (#FFF8F0) for card backgrounds
- **Accents:** Terracotta (#C0392B), forest green (#2D6A4F) for age group badges
- **Text:** Dark charcoal (#2C2C2C) on light, cream (#FFF8F0) on dark
- Light mode only

### UX Inspiration
- **Mentimeter/Slido** — clean live polling/voting interface (for Wikata Adum voting)
- **FotMob/Scoreboard** — clean real-time scoring UI
- **Kahoot** — engaging reveal moments (for vote results)

### Navigation
- **Bottom tab bar** (mobile app feel) — 5 tabs: Home, Schedule, Games, Gallery, More
- Admin has a separate top-level nav within `/admin`

### Key UX Principles
- Touch targets ≥ 44px on mobile
- Clear visual hierarchy with game illustrations
- Sinhala font: Noto Sans Sinhala (Google Fonts)
- Animations: subtle transitions, celebratory confetti on winner reveal

---

## Data Model (derived from CSV data)

### Participants (~58 people in 2026)
- id, name, type (adult | teen[11+] | kid[5-10] | toddler[2-5] | infant)
- familyGroup (string), avatarUrl/photoUrl (avatar choice or uploaded photo)
- participationStatus, kidsNames[]

### Games (13 games in 2026)
- id, name, responsiblePersons[], eligibleGroups (booleans: adults, teens, kids)
- scoringType: "judge" | "vote" (only Wikata Adum uses "vote")
- status: "upcoming" | "active" | "voting" | "completed"
- votingOpen: boolean (only for vote-type games)

### Schedule (26 items in 2025 template)
- itemNumber, name, startTime, durationMins
- applicableTo: { kids, teens, adults }
- screen, music, responsible, remarks

### Scores (for judge-scored games)
- id, gameId, participantId, position (1 | 2 | 3), points (3 | 2 | 1)
- judgedBy (admin userId), timestamp

### Votes (for Wikata Adum only)
- id, gameId, participantId (voted for), voterId (device fingerprint or session ID)
- timestamp
- Constraint: 1 vote per device per game

### Media (photos only, max 2 per user per game)
- id, gameId, uploadedByName, photoUrl, caption, timestamp
- uploaderSessionId (to enforce 2-photo limit)

### Tasks (organizational)
- id, name, responsible[], status

---

## Scoring System

### Judge-Scored Games (12 of 13 games)
- Admin/judge selects the game → sees eligible participants
- Taps to assign 1st place (Gold, 3 pts), 2nd place (Silver, 2 pts), 3rd place (Bronze, 1 pt)
- Results publish to leaderboard in real-time

### Audience-Voted Game: Wikata Adum
- Admin opens voting for this game (sets `votingOpen: true`)
- All attendees see a voting page (live during the game)
- Each device can cast ONE vote for their favorite participant
- Vote counts are HIDDEN during voting (surprise reveal)
- Admin closes voting → triggers reveal animation
- 1st/2nd/3rd decided by vote count → same points (3/2/1)
- Anti-fraud: session-based vote limiting (one vote per browser session)

### Overall Leaderboard
- Aggregates points across all games: Gold=3, Silver=2, Bronze=1
- Shows per-participant total with breakdown by game
- Real-time updates via Firestore listeners

---

## QR Code Access

- Dedicated `/qr` admin page that displays a full-screen QR code linking to the app URL
- QR code auto-generates from the deployed Vercel URL
- Also available as downloadable PNG for printing
- QR projected on the hall screen during the event
- Library: `qrcode.react` for generation

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 14+ (App Router) | React-based, SSR, API routes built-in |
| UI | Tailwind CSS + shadcn/ui | Rapid development, mobile-responsive |
| Database | Firebase Firestore | Free tier, real-time updates for live scoring/voting |
| Auth | Firebase Auth (email/password) | Admin-only login |
| Storage | Firebase Cloud Storage | Photo uploads (no videos) |
| Hosting | Vercel | Free tier, optimized for Next.js |
| i18n | next-intl | Bilingual Sinhala + English |
| PWA | next-pwa | Mobile app-like experience |
| QR | qrcode.react | QR code generation |
| Testing | Vitest + Playwright | Unit + automated E2E frontend tests |

---

## Phases & Steps

### Phase 1: Project Setup & Infrastructure (Steps 1-3)

1. **Initialize Next.js project** with TypeScript, Tailwind CSS, shadcn/ui
   - Configure PWA manifest for mobile home screen install
   - Set up project structure: `app/`, `components/`, `lib/`, `types/`
   - Install: `next-intl`, `qrcode.react`, `firebase`, `next-pwa`
   - Configure Tailwind with Awurudu color palette (gold, maroon, cream)
   - Add Noto Sans Sinhala font via next/font

2. **Set up Firebase project** (*parallel with step 1*)
   - Create Firestore collections: `participants`, `games`, `schedule`, `scores`, `votes`, `media`, `tasks`
   - Configure Firebase Auth (email/password for admins)
   - Set up Firebase Storage bucket for photos
   - Firestore security rules:
     - Public read on all collections
     - Admin-only write on `participants`, `games`, `schedule`, `scores`, `tasks`
     - Public write on `votes` (with validation: 1 vote per session per game)
     - Public write on `media` (with validation: max 2 photos per session per game, photos only)
     - Storage rules: max file size 5MB, image/* mime types only

3. **Set up i18n** with next-intl (*depends on step 1*)
   - Create message files: `messages/en.json`, `messages/si.json`
   - Language switcher component in bottom nav "More" tab
   - All UI strings externalized

### Phase 2: Data Seeding & Core Data Layer (Steps 4-5)

4. **Create data seeding script** (`scripts/seed.ts`) (*depends on steps 1-2*)
   - Parse 2026 CSV data and seed Firestore with:
     - 13 games with eligible age groups + scoringType ("vote" for Wikata Adum)
     - ~58 participants with family groupings and age categories
     - Schedule items based on 2025 template
     - Task assignments
   - Create admin user in Firebase Auth

5. **Create Firebase service layer** (*parallel with step 4, depends on steps 1-2*)
   - `lib/firebase.ts` — Firebase app initialization
   - `lib/db.ts` — Firestore CRUD for each collection + real-time listeners
   - `lib/auth.ts` — Admin authentication helpers + route protection
   - `lib/storage.ts` — Photo upload with 2-per-user-per-game limit enforcement
   - `lib/voting.ts` — Vote submission + session-based deduplication

### Phase 3: Public Pages (Steps 6-10, parallelizable, depends on Phase 2)

6. **Home/Dashboard page** (`/`)
   - Event banner with Awurudu vector illustration
   - Current/next game highlight (real-time from Firestore)
   - Quick links to schedule, games, participants, leaderboard
   - Bottom tab bar navigation

7. **Schedule page** (`/schedule`) (*parallel with step 6*)
   - Vertical timeline view of all event items
   - Color-coded pills by age group (kids=green, teens=blue, adults=maroon)
   - Current time indicator with "NOW" badge
   - Expandable cards with responsible person, screen/music details

8. **Participants page** (`/participants`) (*parallel with step 6*)
   - Grid view of participants with avatars/photos
   - Filter tabs: All | Adults | Teens | Kids
   - Family grouping accordion view
   - Self-registration form: name, age group, family, choose avatar OR upload photo
   - ~15 pre-made Awurudu-themed avatar options (SVGs)

9. **Games & Leaderboard page** (`/games`) (*parallel with step 6*)
   - Game cards with vector illustration per game, eligible age group badges
   - Per-game results: gold/silver/bronze winners with photos
   - Overall leaderboard: ranked participant list with point totals
   - Real-time updates via Firestore `onSnapshot`

10. **Voting page for Wikata Adum** (`/games/wikata-adum/vote`) (*parallel with step 6*)
    - Shows participants in the game with photos/avatars
    - Large tap target cards to select your vote
    - Confirmation dialog before submitting
    - "Vote submitted!" state with no counts shown
    - Results reveal page (triggered by admin) with count-up animation + confetti

### Phase 4: Admin & Scoring (Steps 11-14)

11. **Admin login page** (`/admin/login`) (*depends on step 5*)
    - Firebase Auth email/password login
    - Protected admin routes via Next.js middleware

12. **Admin dashboard** (`/admin`) (*depends on step 11*)
    - Manage participants (CRUD, approve self-registrations)
    - Manage games and schedule (edit times, responsible persons)
    - Manage tasks and assignments
    - Quick stats: total participants, games completed, photos uploaded

13. **Judge scoring interface** (`/admin/scoring`) (*depends on step 11*)
    - Select active game from list (excludes Wikata Adum)
    - Shows eligible participants for that game
    - Tap-to-assign: large 🥇🥈🥉 buttons per participant
    - Confirm & publish → real-time leaderboard update
    - Mobile-optimized with large touch targets

14. **Voting control for Wikata Adum** (`/admin/voting`) (*depends on step 11*)
    - "Open Voting" button → sets `votingOpen: true`
    - Live vote count visible to admin only (hidden from public)
    - "Close Voting & Reveal Results" button → triggers results reveal
    - Results auto-calculate 1st/2nd/3rd from vote counts → writes to scores

### Phase 5: QR Code & Media (Steps 15-17)

15. **QR Code pages** (*depends on step 1*)
    - `/qr` — Full-screen QR code pointing to app URL (for projection)
    - Download button for printable PNG version
    - Auto-detects production URL from `NEXT_PUBLIC_APP_URL` env var

16. **Photo upload** (*depends on step 5*)
    - Upload button on each game's detail page
    - Max 2 photos per user per game (tracked by browser sessionStorage + Firestore)
    - Client-side image compression before upload (max 1MB)
    - Firebase Storage with game-tagged paths: `photos/{gameId}/{sessionId}/{filename}`
    - Admin can delete photos from admin dashboard

17. **Photo gallery** (`/gallery`) (*depends on step 16*)
    - Masonry grid of all photos grouped by game
    - Lightbox viewer with swipe navigation
    - Lazy loading with blur placeholders (Next.js Image)

### Phase 6: Automated Testing (Steps 18-21)

18. **Unit tests with Vitest** (*parallel with development, incremental*)
    - Data layer: Firestore CRUD operations, score calculations, vote tallying
    - Utility functions: CSV parsing, point aggregation, vote deduplication
    - Component tests with React Testing Library:
      - `ScoreEntry` — correct rank assignment
      - `VoteCard` — vote submission flow
      - `LeaderboardTable` — correct sorting and point display
      - `LanguageSwitcher` — language toggle
    - Run: `npm test`

19. **E2E tests with Playwright** (*depends on phases 3-5*)
    - Automated frontend test scenarios:
      1. Public flow: Home → Schedule → view game details → see leaderboard
      2. Self-registration: Fill form → choose avatar → submit → appears in list
      3. Admin scoring: Login → select game → assign 1st/2nd/3rd → verify leaderboard update
      4. Voting flow: Open voting (admin) → vote (public) → close voting → verify results reveal
      5. Photo upload: Select game → upload photo → appears in gallery → upload 3rd photo blocked
      6. i18n: Switch language → verify all text changes
      7. QR code: `/qr` page renders QR code correctly
    - Mobile viewport testing: 375px (iPhone), 414px (iPhone Plus), 360px (Android)
    - Run: `npx playwright test`
    - CI-ready: can run in GitHub Actions on push

20. **Automated UX testing** (*depends on step 19*)
    - **Visual regression:** Playwright screenshot comparison at 3 mobile viewports + desktop per page
      - Baseline screenshots captured once, compared on each run
      - Catches broken layouts, misaligned elements, font rendering issues
    - **Accessibility (a11y):** axe-core integration via @axe-core/playwright
      - Automated WCAG 2.1 checks on every page: color contrast, ARIA labels, focus order, touch target size
      - Sinhala text rendering verification (font loaded, no tofu/boxes)
    - **Lighthouse CI:** automated performance/accessibility scoring
      - Performance budget: LCP < 2.5s, FID < 100ms, CLS < 0.1
      - Accessibility score ≥ 90
      - Run on each page at mobile viewport
    - **Interaction tests (Playwright):**
      - Touch target size validation: all interactive elements ≥ 44×44px
      - Scroll behavior: bottom tab bar stays fixed, content scrolls beneath
      - Language switch: all visible text changes, no layout shifts
      - Image/avatar loading: placeholders shown, no layout jumps (CLS check)
      - Voting card tap feedback: visual state change within 100ms
    - Run: `npm run test:ux` (wraps Playwright visual + axe + Lighthouse)

21. **Concurrent load simulation** (*depends on step 19*)
    - Playwright multi-context test: spawn 20 browser contexts simultaneously
      - All load home page → navigate to leaderboard → verify renders
      - 10 contexts vote simultaneously on Wikata Adum → verify all votes counted, no duplicates
      - Admin scores in one context → 19 others verify leaderboard update within 3 seconds
    - Firebase Emulator Suite for local load testing without hitting production limits
    - Monitors: Firestore read/write counts logged per test run
    - Run: `npm run test:load`

### Phase 7: Performance Hardening & Risk Mitigation (Steps 22-24)

22. **Firestore optimization** (*depends on phases 3-5*)
    - **Caching strategy:**
      - Static data (schedule, games list, participant list): fetch once with SWR/React Query, staleTime=5min
      - Semi-static data (scores/leaderboard): real-time listener only on `/games` page, not globally
      - Volatile data (votes): no real-time listener for public (votes hidden anyway)
    - **Read reduction:**
      - Use Firestore `enablePersistence()` for offline cache — prevents re-reads on page navigation
      - Composite queries to fetch game + scores in fewer reads
      - Leaderboard: single aggregated document updated on score write (1 read instead of N) via Cloud Function or admin write
    - **Write optimization:**
      - Batch vote writes
      - Debounce photo metadata writes
    - **Estimated daily usage (60 users):**
      - Reads: ~15,000-25,000 / 50,000 limit (50% headroom)
      - Writes: ~2,000-3,000 / 20,000 limit (85% headroom)
      - Storage uploads: ~200-500 / 5,000 monthly limit

23. **Venue network resilience** (*parallel with step 22*)
    - **Minimize payload:**
      - Next.js static generation for schedule, participant list (ISR with revalidate)
      - SVG illustrations (< 5KB each vs. raster images)
      - Compress all assets, enable Vercel edge caching
      - Target < 200KB initial JS bundle
    - **Image optimization:**
      - Client-side photo compression to ≤ 500KB before upload (browser-image-compression lib)
      - Next.js Image with blur placeholder + lazy loading
      - Gallery thumbnails at 300px width, full-size on tap
    - **Graceful degradation:**
      - Optimistic UI for vote submission (show success immediately, sync in background)
      - Queue failed photo uploads for retry
      - Loading skeletons so UI doesn't feel broken during slow loads
      - Error boundary with "Retry" button per section, not full-page crash

24. **Deploy to production**
    - Push to GitHub repo
    - Connect to Vercel for auto-deployment
    - Set environment variables (Firebase config, `NEXT_PUBLIC_APP_URL`)
    - Verify production build
    - Run seed script against production Firestore
    - Generate QR code with production URL
    - Share URL + QR code with organizers for final testing
    - **Post-deploy monitoring:** Firebase console open during event to watch read/write quotas

---

## Project Structure

```
sinhala-awurudu-uthsawaya/
├── app/
│   ├── layout.tsx             — Root layout with i18n, fonts, PWA, bottom tab bar
│   ├── page.tsx               — Home dashboard
│   ├── schedule/page.tsx      — Schedule timeline
│   ├── participants/page.tsx  — Participant list + self-registration
│   ├── games/
│   │   ├── page.tsx           — Games list + overall leaderboard
│   │   └── [gameId]/
│   │       ├── page.tsx       — Game detail + results + photo upload
│   │       └── vote/page.tsx  — Voting page (Wikata Adum only)
│   ├── gallery/page.tsx       — Photo gallery
│   ├── qr/page.tsx            — Full-screen QR code display
│   ├── admin/
│   │   ├── login/page.tsx     — Admin login
│   │   ├── page.tsx           — Admin dashboard
│   │   ├── scoring/page.tsx   — Judge scoring interface
│   │   └── voting/page.tsx    — Voting control (open/close/reveal)
│   └── api/                   — API routes if needed
├── components/
│   ├── ui/                    — shadcn/ui components
│   ├── layout/
│   │   ├── BottomTabBar.tsx   — Mobile bottom navigation
│   │   └── Header.tsx         — App header with language switcher
│   ├── LanguageSwitcher.tsx
│   ├── GameCard.tsx           — Game card with illustration
│   ├── ParticipantCard.tsx    — Participant with avatar
│   ├── ScoreEntry.tsx         — Judge scoring UI (1st/2nd/3rd)
│   ├── VoteCard.tsx           — Voting card for Wikata Adum
│   ├── VoteReveal.tsx         — Vote results reveal with animation
│   ├── PhotoUpload.tsx        — Photo upload with 2-limit
│   ├── LeaderboardTable.tsx   — Points leaderboard
│   ├── ScheduleTimeline.tsx   — Timeline component
│   ├── QRDisplay.tsx          — Full-screen QR code
│   └── AvatarPicker.tsx       — Avatar selection grid
├── lib/
│   ├── firebase.ts            — Firebase initialization
│   ├── db.ts                  — Firestore CRUD + real-time listeners
│   ├── auth.ts                — Auth helpers + middleware
│   ├── storage.ts             — Photo upload/retrieval with limits
│   └── voting.ts              — Vote submission + deduplication
├── types/
│   └── index.ts               — TypeScript interfaces for all entities
├── messages/
│   ├── en.json                — English translations
│   └── si.json                — Sinhala translations
├── scripts/
│   └── seed.ts                — Data seeding from CSV
├── public/
│   ├── avatars/               — 15 pre-made Awurudu-themed SVG avatars
│   ├── illustrations/         — Game vector illustrations (SVGs)
│   └── manifest.json          — PWA manifest
├── tests/
│   ├── unit/                  — Vitest unit tests
│   └── e2e/                   — Playwright E2E tests
├── playwright.config.ts       — Playwright configuration
├── vitest.config.ts           — Vitest configuration
└── docs/                      — Source CSV data (existing)
```

### Existing data files
- `docs/අවුරුදු උළෙල - 2026 - attendence+activity 2026.csv` — 2026 participants (58) + 13 games
- `docs/අවුරුදු උළෙල - 2026 - attendence+activity 2025.csv` — 2025 reference (78 participants)
- `docs/අවුරුදු උළෙල - 2026 - Schedule 2025.csv` — 2025 schedule template (26 items, 9:30-15:25)

---

## Verification

1. **Unit tests:** `npm test` — Vitest tests for Firestore CRUD, score aggregation, vote tallying, photo limit enforcement
2. **E2E tests:** `npx playwright test` — 7 automated frontend test scenarios covering all critical flows
3. **UX tests:** `npm run test:ux` — Visual regression (screenshot diff), accessibility (axe-core WCAG 2.1), Lighthouse CI (perf/a11y scores), touch target validation (≥44px)
4. **Load tests:** `npm run test:load` — 20 concurrent Playwright contexts simulating simultaneous usage
5. **Real-time test:** Playwright two-context test: admin scores in one context → leaderboard updates in second context within 3s
6. **Voting test:** Playwright: open voting → cast vote → attempt duplicate vote (blocked) → close → verify reveal
7. **Photo limit test:** Playwright: upload 2 photos → attempt 3rd (blocked)
8. **i18n test:** Playwright: toggle language on each page → verify no untranslated strings
9. **Security test:** Attempt to access `/admin/*` without login → redirected; attempt direct Firestore write → denied
10. **QR test:** Scan QR code with phone → lands on app URL
11. **Quota monitoring:** Firebase console dashboard open during event — watch reads/writes vs. limits

---

## Risk Analysis: 50-70 Concurrent Users

### Risk 1: Firestore Read Quota (50,000 reads/day) — MEDIUM
**Scenario:** 60 users with real-time listeners. Each score update triggers 60 reads (one per listener). Page navigation triggers document reads.
**Estimate:** ~15,000-25,000 reads for a full event day (50% of quota).
**Mitigation:**
- Enable Firestore offline persistence (`enablePersistence()`) — prevents re-reads on page navigation
- Use SWR/React Query with staleTime for static data (schedule, participant list)
- Real-time listeners ONLY on leaderboard page, not globally
- Pre-aggregate leaderboard into a single document (1 read vs. N participant reads)
- Monitor via Firebase Console during event

### Risk 2: Venue WiFi Congestion — HIGH
**Scenario:** 50-70 devices on same WiFi network. Bandwidth saturation, high latency, packet loss.
**Mitigation:**
- Target < 200KB initial JS bundle (Next.js code splitting)
- SVG illustrations (< 5KB each) instead of raster images
- Client-side photo compression to ≤ 500KB before upload
- Gallery thumbnails at 300px width, full-size only on tap
- Vercel edge caching + static generation for read-heavy pages
- Optimistic UI (show success immediately, sync in background)
- Loading skeletons so UI feels responsive even on slow network

### Risk 3: Firebase Storage Upload Limits (5,000 Class A ops/month) — LOW
**Scenario:** 60 users × 2 photos × 13 games = 1,560 uploads max (31% of monthly quota).
**Mitigation:** Already within limits. Client-side compression reduces upload time on slow WiFi.

### Risk 4: Simultaneous Voting Race Condition — MEDIUM
**Scenario:** 60 people vote on Wikata Adum within seconds. Firestore write conflicts or double-votes.
**Mitigation:**
- Use voter session ID as document ID in `votes` collection (Firestore deduplicates by doc ID — second write to same ID fails)
- Optimistic UI: show "Vote submitted!" immediately
- Server-side: Firestore security rule rejects write if document already exists for that session

### Risk 5: QR Code Initial Load Spike — LOW
**Scenario:** Admin projects QR code → 60 people scan simultaneously → burst of 60 initial page loads.
**Mitigation:**
- Next.js static generation for landing pages (served from Vercel CDN edge, no server compute)
- Vercel handles burst traffic well for static pages
- PWA service worker caches assets after first load

### Risk 6: Photo Gallery Performance — MEDIUM
**Scenario:** Gallery page with 100+ photos, 60 users scrolling and loading images simultaneously.
**Mitigation:**
- Lazy loading with intersection observer (only load visible images)
- Blur placeholders via Next.js Image
- Thumbnails (300px) in grid, full-size only on lightbox open
- Firebase Storage CDN handles concurrent downloads well

### Risk 7: Session-Based Vote Fraud — LOW (acceptable)
**Scenario:** Someone opens incognito to vote again.
**Mitigation:** Acceptable for a community event. Session ID + Firestore doc ID deduplication makes casual fraud inconvenient. Not worth adding login requirement for one game.

### Risk 8: Firestore Write Quota (20,000/day) — VERY LOW
**Estimate:** ~2,000-3,000 writes total (scores: 39, votes: ~60, registrations: ~60, photo metadata: ~500, misc: ~500). Well within limits.

---

## Decisions

- **2026 event only** — no multi-year support
- **No offline mode** — internet available at venue
- **Admin-only auth** — spectators/participants view publicly via QR code
- **Self-registration open** — admin can approve/moderate
- **Photos only, no videos** — conserve Firebase Storage (5GB free tier)
- **Max 2 photos per user per game** — enforced by session ID + Firestore validation
- **Judge scoring for 12 games** — admin assigns 1st/2nd/3rd directly
- **Audience voting for Wikata Adum only** — live voting, hidden counts, surprise reveal
- **Points system:** Gold=3, Silver=2, Bronze=1 across all games for overall leaderboard
- **PWA approach** — installable on home screen, no native app
- **Free tier hosting** — Firebase Spark + Vercel Hobby
- **Light mode only** — no dark mode
- **Bottom tab bar** navigation on mobile
- **Gold & maroon** color palette with clean minimal layout
- **Automated frontend testing** — Vitest + Playwright, CI-ready
