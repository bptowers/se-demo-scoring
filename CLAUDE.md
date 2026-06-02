# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React + TypeScript + Vite application for scoring Account Executive discovery/sales calls. AI (Gemini/OpenAI/Anthropic) analyzes call transcripts against a 100-point rubric based on Simpro Group's internal Sales Call Scoring Framework.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build
npm run preview      # Preview production build locally
firebase deploy      # Deploy to Firebase Hosting
```

No test framework is configured.

## Environment Configuration

Copy `.env.example` to `.env.local`:

**LLM providers (at least one required):**
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

**Firebase (optional — falls back to demo mode):**
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

**Environment variable notes:**
- LLM keys use `process.env.{KEY_NAME}` (injected via `vite.config.ts:define` at build time)
- Firebase config uses `import.meta.env.VITE_*`
- `@/*` resolves to project root (not `src/`) — configured in both `vite.config.ts` and `tsconfig.json`

## Project Structure

Files live at the **project root**, not inside a `src/` directory:

```
App.tsx                    # HashRouter, routes, ProtectedRoute
index.tsx                  # React mount point
types.ts                   # All TypeScript interfaces + SCORING_RUBRIC constant
components/
  Button.tsx               # Shared button component
  Layout.tsx               # Nav shell wrapping protected routes
  ScoreReveal.tsx          # Screen 1 of results: score + tier + trend vs. user average
  CoachingSummary.tsx      # Screen 2: top improvements + strengths
  ImprovementCard.tsx      # Card component used by CoachingSummary
context/
  AuthContext.tsx           # Auth state via React Context
pages/
  Login.tsx                # Google OAuth or demo-mode login
  DemoScoringApp.tsx       # Main scoring workflow (upload → analyze → results)
  TrendReport.tsx          # Historical trend charts across sessions
  Dashboard.tsx            # (In progress)
services/
  llmService.ts            # Factory: returns correct LLM provider
  llmServiceInterface.ts   # LLMService interface + SYSTEM_INSTRUCTION prompt
  geminiService.ts         # Gemini 2.0 Flash provider
  openaiService.ts         # GPT-4 Turbo provider
  anthropicService.ts      # Claude Sonnet provider
  fileProcessingService.ts # Text extraction: .txt, .pdf (pdfjs-dist), .docx (mammoth)
  firebase.ts              # Firebase init + Google OAuth + domain validation
  firestoreService.ts      # Firestore CRUD for DemoSession
utils/
  scoringHelpers.ts        # Score math + interpretation helpers (see below)
```

## Application Architecture

### Routing
Uses `HashRouter` for Firebase Hosting compatibility. Routes: `/login`, `/` (DemoScoringApp), `/trends`. All non-login routes are protected by `ProtectedRoute` which checks `AuthContext`.

### Authentication
Two modes, determined by `services/firebase.ts:isFirebaseConfigured()`:
- **Firebase mode**: Google OAuth with domain allowlist (`bigchange.com`, `simprogroup.com`, `simpro.co.uk`, `simpro.com`) enforced post-sign-in in `signInWithGoogle()`. Domain check is client-side only.
- **Demo mode**: Mock user, no backend required

### Results Flow (three-screen progressive reveal)
After AI analysis completes, `DemoScoringApp` transitions through:
1. **`reveal`** — `ScoreReveal` component: total score, tier badge, trend vs. user average, vs. last call
2. **`coaching`** — `CoachingSummary` component: top 3 priority improvements + strengths
3. **`details`** — Full rubric breakdown inline in `DemoScoringApp`

State is `ResultsScreen = 'reveal' | 'coaching' | 'details'` and resets to `'reveal'` on new upload.

### Scoring System
- **Rubric** (`types.ts:SCORING_RUBRIC`): 11 criteria totalling 100 points across 2 sections:
  - **Gold Standard** (60 pts): Discovery, Objection Handling, Positioning, Closing, Price as a Weapon, ROI Quantification — 10 pts each
  - **Process** (40 pts): Opening, 6 Discovery Gates, Value Mirror, Demo Execution, Close & Next Steps — 8 pts each
- **Score interpretation** (`utils/scoringHelpers.ts`): >70 = Gold Standard, 40–70 = At Risk, <40 = Critical
- **`prioritizeImprovements()`**: ranks criteria by point gap (max − current), returns top N
- **`extractStrengths()`**: criteria at ≥90% of max points
- **`calculateTrend()`**: linear regression slope over recent scores → `'improving' | 'steady' | 'declining'`

### AE Attribution
`DemoSession.callDeliveredBy?: string` captures the AE who conducted the call (may differ from the logged-in scorer). Set via text input on the upload screen; defaults to the logged-in user's display name. Passed as a prop to `ScoreReveal` and `CoachingSummary`.

### LLM Service Architecture
Each provider implements `LLMService` from `llmServiceInterface.ts`:
- `analyzeTranscript(transcript): Promise<ScorerProfile>` — returns per-criterion `Score[]` with `reasoning` and `coaching` fields
- `isConfigured(): boolean`
- `getProviderName(): string`

`SYSTEM_INSTRUCTION` in `llmServiceInterface.ts` defines the full DiscoveryCoachAI prompt including all 11 criteria with 1/3/5 scoring anchors. The AI outputs actual point values (0–10 for Gold Standard, 0–8 for Process), not the 1–5 scale.

`DemoSession.mode` is `ScoringMode.AI_ONLY | MANUAL_PEER | HYBRID`. `ScorerProfile.role` is `'AI' | 'AE' | 'MANAGER'`.

### Firestore Data Model
Stored under `users/{userId}/evaluations/{sessionId}` (subcollection per user, not a top-level collection). `DemoSession` dates stored as Firestore `Timestamp`; converted on read/write in `firestoreService.ts`. Demo mode silently skips all writes.

### Styling
Tailwind CSS via CDN (no build step). Custom brand tokens `brand-navy` and `brand-yellow` defined in `index.html`. No component library.

## Common Extension Patterns

**Adding a new LLM provider:** implement `LLMService` in `services/newProvider.ts`, register in `services/llmService.ts` factory, add key to `.env.example`.

**Modifying the scoring rubric:** edit `types.ts:SCORING_RUBRIC` and update `services/llmServiceInterface.ts:SYSTEM_INSTRUCTION` to match. The `getWhyItMatters` and `getGenericCoachingFix` maps in `utils/scoringHelpers.ts` also need new entries for any added criterion IDs.

**Persisting new data:** follow the pattern in `firestoreService.ts` — check `isFirebaseConfigured()` first and return gracefully in demo mode.
