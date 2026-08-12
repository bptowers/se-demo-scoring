# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React + TypeScript + Vite application, deployed on Firebase as project `se-demo-scoring`. It started life as an AE (Account Executive) discovery-call scorer and was subsequently repurposed into an **SE (Solutions Engineer) demo call scorer** — AI (Gemini, via Firebase Cloud Functions) analyzes call transcripts against a 100-point SE rubric based on Simpro Group's internal scoring framework. AE V1/V2 and BDR scoring code paths still exist in the codebase (some routes/components are now dead or unreachable — see "Legacy domains" below) but the live, routed product surface is SE-first.

## Development Commands

```bash
npm install          # Install dependencies (project root)
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build
npm run preview      # Preview production build locally
firebase deploy      # Deploy hosting + functions + firestore rules
```

Cloud Functions live in `functions/` as a **separate npm project** with its own `package.json`/`tsconfig.json`:

```bash
cd functions
npm install
npm run build        # tsc compile to lib/
npm run serve        # build + run functions emulator
npm run shell        # build + firebase functions:shell (interactive)
npm run deploy        # firebase deploy --only functions
npm run logs          # firebase functions:log
```

`firebase.json` builds `functions/` via a `predeploy` hook, so `firebase deploy` alone also rebuilds and deploys the functions codebase (named `se-demo-scoring`).

No test framework is configured in either project.

## Environment Configuration

Copy `.env.example` to `.env.local`:

**LLM provider keys (at least one required client-side):**
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- In practice only the Gemini path is exercised for the live SE (and AE V2) flows, and that path doesn't even read this client env var — Gemini calls happen server-side in Cloud Functions via Secret Manager (`defineSecret("GEMINI_API_KEY")` in `functions/src/index.ts`). The client-side `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` only power the legacy **AE V1** flow's direct-from-browser OpenAI/Anthropic calls.

**Firebase (optional — falls back to demo mode):**
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

**ElevenLabs AI Demo Coach widget:**
- `VITE_ELEVENLABS_AGENT_ID` — public, non-secret (access is controlled by a domain allowlist in the ElevenLabs agent's own security settings, not by hiding this ID)

**Environment variable notes:**
- LLM keys use `process.env.{KEY_NAME}` (injected via `vite.config.ts:define` at build time)
- Firebase/ElevenLabs config uses `import.meta.env.VITE_*`
- `@/*` resolves to project root (not `src/`) — configured in both `vite.config.ts` and `tsconfig.json`

## Project Structure

Files live at the **project root**, not inside a `src/` directory. `functions/` is a separate TypeScript project (own `tsconfig.json`, compiles to `functions/lib/`).

```
App.tsx                    # HashRouter, routes, ProtectedRoute / ManagerRoute / RubricRoute
index.tsx                  # React mount point
types.ts                   # All TypeScript interfaces + all rubric constants (AE V1/V2, BDR, SE)
components/
  Button.tsx, Layout.tsx   # Shared shell/nav
  Ae*.tsx                  # AE V1 scorecard + AeSessionScorecard (V1/V2 branch), AE V2 scorecard/reveal/coaching
  Bdr*.tsx                 # BDR scorecard (component built, but BDR is unreachable from the UI — see below)
  Se*.tsx                  # SE scorecard, reveal, coaching summary, category radar
context/
  AuthContext.tsx           # Auth state via React Context
pages/
  Login.tsx                # Google OAuth or demo-mode login
  DemoScoringApp.tsx        # Main scoring workflow at `/` — drives the SE flow (see "SE scoring" below)
  TrendReport.tsx           # Historical trend charts across AE V1/V2/SE/BDR sessions
  AeDashboard.tsx           # Routed at /se-dashboard — despite the name, this IS the SE dashboard (personal + manager team view)
  ManagerDashboard.tsx      # Manager view of an AE/SE's sessions; add/edit manager scoring
  CallHistory.tsx           # Session list/search; reachable only via direct /history URL (not in nav)
  SeRubricGuide.tsx         # Static SE rubric reference; gated to a hardcoded admin allowlist, /se-rubric
  AiDemoCoach.tsx           # ElevenLabs Conversational AI widget for unscored practice rehearsal, /ai-coach
  BdrDashboard.tsx          # BDR team leaderboard — fully built but UNROUTED (dead from the UI)
  Dashboard.tsx             # App-picker card grid — UNROUTED (dead code)
services/
  llmService.ts             # Factory: returns correct LLM provider
  llmServiceInterface.ts    # LLMService interface + AE V1 SYSTEM_INSTRUCTION prompt
  geminiService.ts          # Gemini provider — delegates to Firebase Callable Functions, not a direct API call
  openaiService.ts          # GPT-4 Turbo provider — implements AE V1 only; throws on V2/SE
  anthropicService.ts       # Claude provider — implements AE V1 only; throws on V2/SE
  aeV2SystemInstruction.ts  # Client-side reference copy of the AE V2 prompt (the real one is inlined server-side)
  bdrSystemInstruction.ts   # BDR prompt text
  clariService.ts           # Calls Clari-import Cloud Functions; both currently stubbed (throw failed-precondition)
  fileProcessingService.ts  # Text extraction: .txt/.md, .pdf (pdfjs-dist), .docx (mammoth)
  firebase.ts                # Firebase init + Google OAuth + domain allowlist
  firestoreService.ts       # Firestore CRUD for DemoSession, dual-writes, UserGoal
config/
  managerConfig.ts          # Manager email → region → directReports[]; "sees all" sentinel for global managers
  bdrUsers.ts                # BDR team roster + manager gates (isBdrUser/isBdrManager/isBdrDashboardManager)
  rubricAccess.ts            # Hardcoded 2-email allowlist gating /se-rubric
utils/
  scoringHelpers.ts          # Score math + interpretation helpers (see below)
  sampleAeSession.ts, sampleBdrSession.ts, sampleSeSession.ts  # Demo/seed data per domain
functions/
  src/index.ts               # Firebase Cloud Functions backend — see "Why a backend" below
```

## Application Architecture

### Routing (`App.tsx`)
Uses `HashRouter` for Firebase Hosting compatibility.

| Path | Renders | Guard |
|---|---|---|
| `/login` | `Login` | none |
| `/` | `DemoScoringApp` | `ProtectedRoute` |
| `/trends` | `TrendReport` | `ProtectedRoute` |
| `/manager` | `ManagerDashboard` | `ManagerRoute` — `getManagerConfig(user.email)` truthy |
| `/se-dashboard` | `AeDashboard` | `ProtectedRoute` |
| `/history` | `CallHistory` | `ProtectedRoute` (URL-only, not in nav) |
| `/se-rubric` | `SeRubricGuide` | `RubricRoute` — `canViewSeRubric(user.email)` |
| `/ai-coach` | `AiDemoCoach` | `ProtectedRoute` |
| `/bdr`, `/ae-dashboard` | — | redirect to `/` and `/se-dashboard` respectively (dead routes kept as redirects) |

Access control is three independent hardcoded email allowlists (`config/managerConfig.ts`, `config/bdrUsers.ts`, `config/rubricAccess.ts`) — not Firebase Auth custom claims/roles. There is no shared abstraction between them; adding a new gated area means adding a new allowlist file/pattern.

### Authentication
Two modes, determined by `services/firebase.ts:isFirebaseConfigured()`:
- **Firebase mode**: Google OAuth with a client-side domain allowlist (`bigchange.com`, `clockshark.com`, `simprogroup.com`, `simpro.co.uk`, `simpro.com`, `simpro.com.au`, `simpro.us`) enforced post-sign-in in `signInWithGoogle()`.
- **Demo mode**: Mock user, no backend required

### Scoring domains
`DemoSession` (`types.ts`) is the central session record and can carry results from **any or all** of three independent scoring domains simultaneously (`aiScoring`, `aiV2`, `seScoring` are all optional fields), distinguished by `rubricType: 'AE' | 'BDR'` and `rubricVersion: 'AE_V1' | 'AE_V2'`.

**SE scoring — the live, primary flow.** `DemoScoringApp.tsx` at `/` always calls `analyzeTranscriptSE(...)` (the `rubricType` state is hardcoded to `'AE'` with no setter, and the SE path is taken whenever that's true — a leftover from cloning the AE app). Rubric: `types.ts:SE_SCORING_RUBRIC` — 10 categories across 4 sections (Core SE Performance 48pt, Business Fit 20pt, Conversation Quality 21pt, Deal Advancement 11pt = 100pt, pass threshold 75). Result type `SeScorerProfile` supports multiple SE evaluations per call. The prompt (`SE_SYSTEM_INSTRUCTION`) and rubric are **Gemini-only and server-side-only** — inlined in `functions/src/index.ts`, no client-side copy exists. `OpenAIService`/`AnthropicService` both throw if asked for SE analysis.

**AE V2 — still live for AE-branded sessions.** Rubric: `types.ts:AE_V2_SCORING_RUBRIC` (P1–P5 Process + GS1–GS6 Gold Standard, 0–5 each, max 55). Adds `SeTriggersV2` (10 binary escalation triggers → NO_SE/FLAG_FOR_REVIEW/MANDATORY_SE) and `NonNegotiableViolationsV2` (score-capping violations), plus a server-recomputed `ragRating`. Prompt is canonically inlined in `functions/src/index.ts` (client copy in `services/aeV2SystemInstruction.ts` is a reference only — keep both in sync per the comment in `functions/src/index.ts`). Gemini-only; other providers throw.

**AE V1 — legacy fallback.** Rubric: `types.ts:SCORING_RUBRIC` (11 criteria, 100pt: Gold Standard 60/Process 40). Rendered by `AeCallScorecard.tsx` only when a session lacks `aiV2` (branch in `AeSessionScorecard.tsx`). Prompt: `SYSTEM_INSTRUCTION` in `services/llmServiceInterface.ts`. This is the **only domain implemented directly in-browser** for OpenAI/Anthropic (no Cloud Function needed) — Gemini still goes through the Cloud Function for V1 too.

**BDR — built but disabled.** Rubric: `types.ts:BDR_SCORING_RUBRIC` (23 behaviours, 5 scored stages, 46pt max). Scorecard, prompt, Firestore dual-write (`bdrSessions` collection), and `BdrDashboard.tsx` are all fully implemented, but nothing in `App.tsx`/`Layout.tsx` routes to them — `/bdr` redirects to `/`, and `DemoScoringApp.tsx`'s `rubricType` can never become `'BDR'` from the current UI. Treat as intact-but-dormant infrastructure, not something to casually delete.

`getWhyItMatters` and `getGenericCoachingFix` maps in `utils/scoringHelpers.ts` key off AE V1 criterion IDs — any AE V1 rubric change needs matching entries there. The SE/AE V2 rubrics carry their own explanation text as part of the AI-generated result rather than a lookup map.

### Why a Cloud Functions backend (`functions/src/index.ts`)
Client-side LLM calls (as still used for AE V1 with OpenAI/Anthropic) don't scale to the SE/AE V2 flows because: the Gemini key must stay server-side (Secret Manager, never shipped in the bundle); the V2/SE prompts require large structured-output JSON schemas; and score math (category clamping, cap enforcement, RAG/trigger recomputation) is deliberately redone server-side after the model call rather than trusted from the model's own output. All 5 exports are `onCall` HTTPS-callable functions (no Firestore/scheduled triggers): `analyzeTranscript` (AE V1/BDR), `analyzeTranscriptV2` (AE V2), `analyzeSeTranscript` (SE), and `getClariCalls`/`getClariTranscript` (Clari call-recording import — currently stubbed, throws `failed-precondition` pending Clari secrets). A `resolveGeminiModel` gate restricts non-default Gemini models to a single hardcoded tester email.

### Firestore Data Model
- `users/{userId}/evaluations/{sessionId}` — every session, owned by the scoring user (primary write path).
- `aeSessions/{sessionId}` — dual-written for any non-BDR session once it has AI results, enabling manager cross-team queries (`getAeSessionsForManager`) and SE lookup-by-name (`getAeSessionsByName`, matched on `callDeliveredBy`).
- `bdrSessions/{sessionId}` — dual-written when `rubricType === 'BDR'`, so BDR managers can query the whole ~20-person team in one query (works around Firestore's 10-item `in` cap).
- `users/{uid}/goals/{goalId}` — per-user `UserGoal` records, unrelated to session storage.

`DemoSession` dates are stored as Firestore `Timestamp`, converted on read/write in `firestoreService.ts`. Demo mode silently skips all writes. `firestore.rules` mirrors the above: evaluations are owner-only; `aeSessions` is any-authenticated-user-readable (app-layer filters by name); `bdrSessions` is readable by the hardcoded BDR dashboard managers or by matching `bdrRepEmail`.

### AE Attribution
`DemoSession.callDeliveredBy?: string` captures who actually conducted the call (may differ from the logged-in scorer). Set via text input on the upload screen; defaults to the logged-in user's display name.

### AI Demo Coach (`/ai-coach`)
Unscored voice rehearsal: embeds the ElevenLabs Conversational AI widget (`@elevenlabs/convai-widget-embed` from unpkg) as a custom element, with an idempotent script-loader guard against double-`customElements.define` on HashRouter remounts. Practice sessions are not persisted and don't appear in Trends/Call History.

### Styling
Tailwind CSS via CDN (no build step). Custom brand tokens `brand-navy` and `brand-yellow` defined in `index.html`. No component library.

## Common Extension Patterns

**Adding a new LLM provider:** implement `LLMService` in `services/newProvider.ts`, register in `services/llmService.ts` factory. Note this only covers the AE V1 path in practice — AE V2 and SE are Gemini/Cloud-Function-only by design, so a new provider needs explicit V2/SE support added in `functions/src/index.ts` to be more than a V1-only option.

**Modifying a scoring rubric:** edit the relevant constant in `types.ts` (`SCORING_RUBRIC` / `AE_V2_SCORING_RUBRIC` / `BDR_SCORING_RUBRIC` / `SE_SCORING_RUBRIC`) and the matching system-instruction prompt. For AE V1, that's `services/llmServiceInterface.ts:SYSTEM_INSTRUCTION`. For AE V2/BDR/SE, the prompt that actually runs is **inlined in `functions/src/index.ts`** — update it there (and its client-side reference copy, for AE V2/BDR, to keep them from drifting). AE V1 also needs matching entries added to `getWhyItMatters`/`getGenericCoachingFix` in `utils/scoringHelpers.ts`.

**Persisting new data:** follow the pattern in `firestoreService.ts` — check `isFirebaseConfigured()` first and return gracefully in demo mode.

**Deploying a Cloud Function change:** `functions/` builds independently; either `cd functions && npm run deploy`, or run `firebase deploy` from the root (which triggers the same build via the `predeploy` hook in `firebase.json`).
