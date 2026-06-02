import { DemoSession, ScoringMode } from '../types';

/**
 * Sample AE session for dashboard demonstration.
 * James Fletcher / Robinson Roofing — 68/100, At Risk tier.
 * Strong process scores but gaps in closing, pricing strategy, and ROI quantification.
 */
export const SAMPLE_AE_SESSION: DemoSession = {
  id: 'sample_james_robinson_roofing_mar2026',
  userId: 'sample',
  createdAt: new Date('2026-03-18T14:00:00Z'),
  completedAt: new Date('2026-03-18T14:45:00Z'),
  transcript: '',
  mode: ScoringMode.AI_ONLY,
  selectedProvider: 'openai',
  callDeliveredBy: 'James Fletcher',
  rubricType: 'AE',
  status: 'complete',
  aiScoring: {
    role: 'AI',
    vertical: 'Construction',
    executiveSummary:
      'James ran a technically strong demo for Robinson Roofing — a 45-person roofing contractor in the South East — and built genuine rapport with the director, Craig Robinson. Discovery was thorough on process: quoting workflow, WIP management, and subcontractor scheduling were all surfaced. However, the call stalled at the commercial conversation. Price was introduced before ROI had been anchored, and when Craig pushed back on cost, James offered a discount immediately rather than defending value with specific numbers. The 1-10 trial close was never attempted, leaving the deal in an ambiguous follow-up state. The opening lacked the Circle of Life business observation — it moved straight to rapport questions — and two discovery gates (stakeholder mapping and vision) were missed entirely. **Priority coaching: hold on price until two ROI numbers are locked in, attempt the trial close before any commercial discussion, and open every call with a genuine observation about the prospect\'s business.**',
    topWins: [
      '**Strong demo execution** — scenario-built around Robinson\'s own quoting process; Craig said "that\'s exactly how we work" twice',
      '**Rapport and tone** — warm, unhurried, and knowledgeable throughout; Craig was engaged for the full 45 minutes',
      '**Positioning tied to outcomes** — consistently linked features to revenue impact: "that\'s three hours of admin back per job"',
    ],
    topFixes: [
      '**Anchor ROI before price** — get two specific numbers from Craig\'s data (hours saved × team size, or quote-to-job conversion uplift) before the commercial slide appears',
      '**Attempt the trial close** — "On a scale of 1 to 10, how confident are you that Simpro Group solves the problem we\'ve been discussing?" must happen before price every time',
      '**Map the stakeholder picture** — Craig mentioned his Operations Manager twice; confirm whether she\'s involved in the decision before the next step is agreed',
    ],
    scores: [
      {
        criterionId: 'gs_discovery',
        score: 7,
        reasoning: 'Surfaced the core pain (paper-based quoting, manual WIP board, WhatsApp for subcontractor scheduling) with strong open questions. Did not quantify pain in dollar or time terms — "that sounds frustrating" rather than "what does that cost you monthly?".',
        coaching: 'After every pain point, ask: "What does that cost you — in hours, or in jobs lost?" Don\'t leave the discovery section without at least one number attached to the problem. That number becomes the anchor for your ROI conversation later.',
      },
      {
        criterionId: 'gs_objection_handling',
        score: 6,
        reasoning: 'Pre-empted the "we\'re happy with our current process" and "we\'re too small for software" objections well — both were inoculated in the opening. The "it\'s too expensive" objection was handled reactively with a discount offer rather than a value reframe.',
        coaching: 'When price objections arise, respond with: "Before we talk numbers, let me show you what the ROI looks like for a business your size." Then anchor to the specific numbers from discovery. Discounting signals that you don\'t believe in the value yourself.',
      },
      {
        criterionId: 'gs_positioning',
        score: 8,
        reasoning: 'Consistently linked product capabilities to business outcomes. "Automated quoting = three hours back per job" and "live WIP dashboard = no more end-of-day catch-up calls" were both strong. One feature (document storage) was presented as a capability without a business outcome.',
        coaching: 'Apply the "so that" test to every feature: "Simpro Group does X, so that your business achieves Y." If you can\'t complete the sentence for a feature, don\'t mention it in the demo.',
      },
      {
        criterionId: 'gs_closing',
        score: 4,
        reasoning: 'No 1-10 trial close attempted at any point. The call ended with "I\'ll send you a proposal" — no calendar invite booked, no commitment to a specific next action from Craig.',
        coaching: 'Before revealing price, always ask: "On a scale of 1 to 10, how confident are you that Simpro Group solves the problem we\'ve been discussing today?" Anything below an 8 means objections are still unresolved. Above an 8, you have permission to close. Then book the next step on the call — do not leave without a date in the diary.',
      },
      {
        criterionId: 'gs_price_as_weapon',
        score: 5,
        reasoning: 'Price was introduced as the third slide after a brief ROI summary — before specific ROI numbers had been anchored in Craig\'s terms. When Craig said "that\'s more than I expected", James offered a 10% discount rather than defending the investment with data.',
        coaching: 'Reverse the sequence: ROI anchored in prospect\'s numbers first, then price. "Based on what we\'ve discussed — 3 hours saved per job, 40 jobs per month — that\'s 120 hours a month. At your labour rate, Simpro Group pays for itself in the first two months." Then price feels like a bargain, not a burden.',
      },
      {
        criterionId: 'gs_roi_quantification',
        score: 6,
        reasoning: 'One ROI figure was cited (time saved on quoting: ~3 hours per job). A second ROI number was started but abandoned when Craig asked a product question. The framework requires at least two specific figures using the prospect\'s own data.',
        coaching: 'Prepare two ROI calculations before every demo using the data gathered in discovery. For Robinson Roofing: (1) quoting time saved × jobs per month × labour rate = monthly saving, (2) WIP visibility improvement → jobs completed per month uplift × average job value = revenue gain. Have both ready before you open the commercial conversation.',
      },
      {
        criterionId: 'ps_opening',
        score: 6,
        reasoning: 'Opened with a strong introduction and quickly established credibility by naming two construction clients. The Circle of Life business observation was not used — James moved straight to rapport questions ("how long have you been running Robinson Roofing?") rather than anchoring a specific observation about their business.',
        coaching: 'The Circle of Life opener requires a specific observation about their business before any rapport questions: "I had a look at your website before the call — you\'ve doubled your team in the last two years. That kind of growth usually creates workflow pressure before the systems catch up. Is that something you\'re feeling?" This sets the agenda on your terms from the first sentence.',
      },
      {
        criterionId: 'ps_discovery_gates',
        score: 5,
        reasoning: 'Four of six gates were cleared: current process, pain, budget range, and timeline. Two gates were missed: stakeholder mapping (Craig\'s Operations Manager was mentioned twice but her role in the decision was not explored) and vision (what does success look like in 12 months was never asked).',
        coaching: 'Build a discovery gate checklist into your prep: (1) Current state, (2) Pain/cost, (3) Stakeholder map, (4) Vision/success criteria, (5) Budget, (6) Timeline. If any gate is still open when you reach the demo, you\'re flying blind on the close.',
      },
      {
        criterionId: 'ps_value_mirror',
        score: 7,
        reasoning: 'Strong discovery recap delivered before the demo: "So what I\'m hearing is — quoting is manual and slow, your WIP board is a whiteboard, and your subs are managed over WhatsApp. The business impact is delays, callbacks, and admin overload." Craig confirmed this. The win condition ("what would success look like for you?") was not confirmed.',
        coaching: 'Add one sentence to the value mirror: "If we solve those three things today, what does that mean for Robinson Roofing over the next 12 months?" Craig\'s answer becomes your close anchor — use his words, not yours, when you ask for the business.',
      },
      {
        criterionId: 'ps_demo_execution',
        score: 7,
        reasoning: 'Demo was mostly prospect-specific: quoting workflow was built around Robinson\'s scenario, WIP dashboard used their job types. One section (reporting module) used a generic "ABC Roofing" demo account rather than switching to Robinson\'s data, which broke immersion briefly.',
        coaching: 'Zero generic screens in a demo. If you haven\'t set up the prospect\'s data in advance, skip that section or narrate: "Imagine this is your team, your jobs, your data." A generic screen says to the prospect that you\'re showing them a product, not solving their problem.',
      },
      {
        criterionId: 'ps_close_next_steps',
        score: 7,
        reasoning: 'Confirmed 80/20 fit clearly: "Based on what we\'ve covered today, Simpro Group handles about 90% of what Robinson Roofing needs out of the box." The buying signal question ("is there anything you\'ve seen today that doesn\'t fit how you work?") was asked and Craig had no blockers. Admin follow-up — confirming Craig\'s email for the proposal — was not verified on the call.',
        coaching: 'Before ending every call: (1) confirm next step date/time in the calendar, (2) verify the correct email and CC for the proposal, (3) confirm who else from Craig\'s team should be on the next call. These three take 90 seconds and prevent a week of "just checking in" emails.',
      },
    ],
  },
};
