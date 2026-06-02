import { DemoSession, ScoringMode } from '../types';

/**
 * Sample BDR session for dashboard demonstration.
 * Based on Florida Ferizolli / Wessex Garage Doors — 28/46 pts, Grade B.
 * Used by BdrDashboard to let managers preview the scorecard format before real calls are scored.
 */
export const SAMPLE_BDR_SESSION: DemoSession = {
  id: 'sample_florida_wessex_mar2026',
  userId: 'sample',
  createdAt: new Date('2026-03-25T10:00:00Z'),
  completedAt: new Date('2026-03-25T10:30:00Z'),
  transcript: '',
  mode: ScoringMode.AI_ONLY,
  selectedProvider: 'anthropic',
  callDeliveredBy: 'Florida Ferizolli',
  rubricType: 'BDR',
  bdrRepEmail: 'florida.ferizolli@simpro.co.uk',
  stage6Checklist: [false, false, false, false, false],
  status: 'complete',
  aiScoring: {
    role: 'AI',
    prospectCompany: 'Wessex Garage Doors',
    contactName: 'Mark Edmonds',
    callDuration: '~8.7 minutes',
    demoBooked: true,
    executiveSummary:
      'Florida secured a demo (Monday at 10am, Mark Edmonds at Wessex Garage Doors) from an inbound rewarm—a solid outcome. Against the updated Gold Standard, her Open stage scores well: no permission ask, no filler language, and a clean inbound anchor. Discovery was strong on breadth—full tech stack, 35-year workflow pain, clear fit profile—but lacked depth: the cost-of-inaction question was never asked, and pain wasn\'t compounded across personal and team dimensions. The Mirror stage is the clearest development gap: Florida moved to pitch before reflecting Mark\'s language back, missing both the verbal summary and the "hours back" reflection that builds urgency from the prospect. The Ops Manager reframe was the call highlight—genuine commercial instinct. Priority coaching: **lead with a proactive insight hook, compound pain across all three dimensions, and always mirror before the demo ask**.',
    topWins: [
      '**Demo booked**—Monday at 10am confirmed; moved prospect from "not ready" to booked in one call',
      '**Ops Manager bridge**—reframed the April hire as a reason to demo now, not wait; smart commercial instinct',
      '**No permission seeking**—correct Gold Standard open; moved directly into the call without handing an easy exit',
      '**Deep tech-stack discovery**—uncovered FileMaker, Sage, Google Sheets, team structure, and 35-year workflow pain',
      '**Tone throughout**—warm, composed, and energetic; "sounds like work is busy, which is really good" landed well',
    ],
    topFixes: [
      '**Lead with an insight angle**—don\'t wait for discovery to surface pain. Open with one of the four hooks: admin burden, efficiency, cash flow, or case study',
      '**Compound the pain**—always ask at least two of: "how does that affect the business / you personally / your team?" before moving on',
      '**Ask cost-of-inaction**—"What happens if this doesn\'t change?" creates urgency from Mark, not from Florida. This was not asked.',
      '**Mirror before the demo ask**—always summarise back: "Based on what you\'ve told me—the paperwork, the FileMaker issue—those are areas we can help with."',
      '**Use the hours mirror**—"If we gave you those hours back, what would you do?"—highly effective for admin-heavy prospects like Mark',
    ],
    scores: [
      {
        criterionId: 'bdr_b1',
        score: 1,
        reasoning: 'Introduced herself as "Florida" only; Gold Standard requires full name to signal confidence and level up credibility.',
        coaching: 'Always open with your full name: "Hi, it\'s Florida Ferizolli calling from Simpro Group." One extra word, significantly more authority.',
      },
      {
        criterionId: 'bdr_b2',
        score: 2,
        reasoning: 'No submissive filler language detected throughout the call—maintained confident, direct tone from the start.',
        coaching: 'Gold Standard maintained. Keep this habit on every call.',
      },
      {
        criterionId: 'bdr_b3',
        score: 2,
        reasoning: 'Moved directly into the reason for the call without handing the prospect an easy exit—correct Gold Standard approach.',
        coaching: 'Gold Standard maintained. The absence of "is it a good time?" is a competitive differentiator.',
      },
      {
        criterionId: 'bdr_b4',
        score: 2,
        reasoning: 'Clearly referenced the form received at end of February—inbound rewarm hook used well and naturally.',
        coaching: 'Perfect use of the rewarm anchor. On cold calls, adapt to: "You came up as a strong fit based on X."',
      },
      {
        criterionId: 'bdr_b5',
        score: 1,
        reasoning: 'Gave a product overview when asked but it was delivered as a monologue rather than a tight, rehearsed one-liner. Needs a sharper 10-second response for cold calls.',
        coaching: 'Drill a 10-second one-liner: "We help field service companies like yours run scheduling, job management, and invoicing in one place—so teams stop chasing paperwork." Practice until automatic.',
      },
      {
        criterionId: 'bdr_b6',
        score: 1,
        reasoning: 'Pain emerged reactively through discovery rather than being proactively planted as an insight angle. No numbers used, but no purposeful hook led with.',
        coaching: 'Lead next call with a hook before discovery: "A lot of companies your size tell us their biggest issue is the gap between the job card and the invoice—sound familiar?"',
      },
      {
        criterionId: 'bdr_b7',
        score: 1,
        reasoning: 'The admin burden angle was right for Wessex Garage Doors, but it was arrived at through discovery rather than led with as a deliberate hook.',
        coaching: 'Pre-call research: garage door companies = field-heavy, paper-based, scheduling pain. Lead with admin burden hook every time for this vertical.',
      },
      {
        criterionId: 'bdr_b8',
        score: 1,
        reasoning: 'Moved quickly through the opener into questions without a clear purposeful pause after any insight statement. Prospect engagement was reactive rather than invited.',
        coaching: 'After delivering your hook, stop talking. Count to three in your head if needed. The pause creates space—and the prospect will fill it.',
      },
      {
        criterionId: 'bdr_b9',
        score: 2,
        reasoning: 'Uncovered full tech stack (FileMaker/Claris, Sage, Google Sheets) using accessible, conversational language throughout.',
        coaching: 'Gold Standard maintained. "What are you currently using to manage jobs?" is a clean, jargon-free entry point—keep using it.',
      },
      {
        criterionId: 'bdr_b10',
        score: 2,
        reasoning: 'Surfaced 35-year paper-based workflow, outdated FileMaker version, and disjointed scheduling across multiple tools—all genuine pain.',
        coaching: 'Gold Standard maintained. The 35-year workflow reveal was a standout moment—you let Mark paint the picture rather than assuming it.',
      },
      {
        criterionId: 'bdr_b11',
        score: 1,
        reasoning: 'Found strong business-level pain but didn\'t systematically explore personal or team-level impact. "How does that affect your engineers on the road?" was not asked.',
        coaching: 'After surfacing business pain, always ask two follow-ons: "How does that affect you personally?" and "What does that mean for your team day-to-day?"',
      },
      {
        criterionId: 'bdr_b12',
        score: 0,
        reasoning: 'No cost-of-inaction question asked at any point. This is the most important discovery question—it creates urgency from the prospect, not the BDR.',
        coaching: 'Before moving to the mirror, always ask: "What happens if this doesn\'t change over the next twelve months?" Let Mark articulate the cost—it\'s far more powerful than you describing it.',
      },
      {
        criterionId: 'bdr_b13',
        score: 0,
        reasoning: 'Moved into product pitch (scheduling, Sage integration, field mobility) before completing discovery or mirroring pain back. Pitch landed before urgency was fully built.',
        coaching: 'When the prospect shows interest, resist the urge to pitch. Instead, deepen discovery: "Tell me more about how that affects things." The demo is the pitch—your job is to make them want it.',
      },
      {
        criterionId: 'bdr_b14',
        score: 0,
        reasoning: 'Moved directly to the demo ask after pitching, without reflecting Mark\'s language back. "Based on what you told me—the paperwork, the FileMaker issue—" was never said.',
        coaching: 'Always mirror before asking for the demo: "Based on what you\'ve told me—the 35-year paper system, the FileMaker issue, the scheduling gap—those are exactly the areas we help with. Worth showing you?" Watch conversion rates climb.',
      },
      {
        criterionId: 'bdr_b15',
        score: 0,
        reasoning: 'No time-based mirror deployed. Given the 35-year admin workflow pain, this would have been highly effective with Mark and is a missed opportunity.',
        coaching: 'After discovery, ask: "If we gave you those admin hours back, what would you do with them?" For field service businesses, the answer is always more jobs, less stress. Then tie the demo to that outcome.',
      },
      {
        criterionId: 'bdr_b16',
        score: 1,
        reasoning: 'Florida stayed warm and amiable throughout. However, no proper summary was delivered before the pivot, limiting credit here.',
        coaching: 'Warmth alone isn\'t enough—the emotional summary must be spoken. One sentence: "So it sounds like the real issue is that the business has outgrown its systems, and that\'s affecting everyone." Then pause.',
      },
      {
        criterionId: 'bdr_b17',
        score: 2,
        reasoning: 'Cleverly reframed "waiting for Ops Manager" into a reason to demo before April—so both Mark and the incoming hire benefit. Strong, natural bridge.',
        coaching: 'Gold Standard. This is exactly how a demo bridge should work—using the prospect\'s context, not a generic "let me show you." Keep this in your toolkit.',
      },
      {
        criterionId: 'bdr_b18',
        score: 2,
        reasoning: 'Mark detailed FileMaker issues, 35-year paper-based workflow, and disjointed scheduling unprompted. Real operational pain clearly articulated in his own language.',
        coaching: 'Gold Standard. The pain was real and self-described—that\'s the best possible position to be in before asking for a demo.',
      },
      {
        criterionId: 'bdr_b19',
        score: 0,
        reasoning: 'Mark\'s decision authority not confirmed. Incoming Ops Manager mentioned but his role in the purchase decision was not explored before booking the demo.',
        coaching: 'Before booking, always ask: "Would you be the main decision-maker on something like this, or would others need to be involved?" Knowing this before the demo changes how the AE runs it.',
      },
      {
        criterionId: 'bdr_b20',
        score: 2,
        reasoning: '11 engineers, ~6 office staff across two companies (retail and trade). Strong fit profile for Simpro Group—well established during discovery.',
        coaching: 'Gold Standard. Size and structure confirmed and appropriate. Note the two-company structure for the AE handoff.',
      },
      {
        criterionId: 'bdr_b21',
        score: 2,
        reasoning: 'New Operations Manager starting in April—a clear, time-bound event and compelling reason to act before he joins. Well identified and used.',
        coaching: 'Gold Standard. Event-driven urgency is the strongest kind—you identified it and used it to close. This is the model.',
      },
      {
        criterionId: 'bdr_b22',
        score: 2,
        reasoning: 'Monday at 10am confirmed with Mark Edmonds. Demo booked for a 30-minute intro with a consultant—specific, agreed, and appropriately low-pressure.',
        coaching: 'Gold Standard. Specific time confirmed, low-pressure framing appropriate for first contact. Ensure calendar invite sent within 30 minutes.',
      },
      {
        criterionId: 'bdr_b23',
        score: 1,
        reasoning: 'Demo was proposed and accepted but language leaned toward low-pressure offer rather than assertive Gold Standard framing. "How does Monday morning look?" would be stronger.',
        coaching: 'Replace "Would you be open to a quick look?" with "When have you got 30 minutes this week—how does Monday morning look for you?" Assertive framing closes faster.',
      },
    ],
  },
};
