import { ScorerProfile, Score, SCORING_RUBRIC, BDR_SCORING_RUBRIC, ScoringCriterion, BdrGrade, DemoSession } from '../types';

/**
 * Score interpretation thresholds
 * Based on Simpro Group's Sales Call Scoring Framework
 */
export const SCORE_THRESHOLDS = {
  GOLD_STANDARD: 70,
  AT_RISK: 40,
  CRITICAL: 0,
} as const;

export type ScoreInterpretation = 'GOLD_STANDARD' | 'AT_RISK' | 'CRITICAL';

/**
 * Calculate interpretation label based on total score
 */
export function getScoreInterpretation(score: number): ScoreInterpretation {
  if (score > SCORE_THRESHOLDS.GOLD_STANDARD) return 'GOLD_STANDARD';
  if (score >= SCORE_THRESHOLDS.AT_RISK) return 'AT_RISK';
  return 'CRITICAL';
}

/**
 * Get display label for score interpretation
 */
export function getInterpretationLabel(interpretation: ScoreInterpretation): string {
  const labels: Record<ScoreInterpretation, string> = {
    GOLD_STANDARD: 'Gold Standard',
    AT_RISK: 'At Risk',
    CRITICAL: 'Critical',
  };
  return labels[interpretation];
}

/**
 * Get color class for score interpretation (Tailwind)
 */
export function getInterpretationColor(interpretation: ScoreInterpretation): string {
  const colors: Record<ScoreInterpretation, string> = {
    GOLD_STANDARD: 'text-green-600 bg-green-50 border-green-200',
    AT_RISK: 'text-amber-700 bg-amber-50 border-amber-200',
    CRITICAL: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[interpretation];
}

/**
 * Priority improvement with coaching guidance
 */
export interface PriorityImprovement {
  criterionId: string;
  criterionName: string;
  section: string;
  currentScore: number;
  maxScore: number;
  impact: number; // maxScore - currentScore
  whatHappened: string; // AI observation
  whyItMatters: string; // Business impact
  howToFix: string; // Coaching guidance
}

/**
 * Top strength to reinforce
 */
export interface Strength {
  criterionId: string;
  criterionName: string;
  section: string;
  score: number;
  maxScore: number;
  reasoning: string;
}

/**
 * Calculate total score from a scorer profile
 */
export function calculateTotalScore(profile: ScorerProfile | undefined): number {
  if (!profile || !profile.scores) return 0;
  return profile.scores.reduce((total, score) => total + score.score, 0);
}

/**
 * Rank improvements by point impact (gap between current and max)
 * Returns top N improvement areas that would yield the most points
 */
export function prioritizeImprovements(
  scorerProfile: ScorerProfile | undefined,
  topN: number = 3
): PriorityImprovement[] {
  if (!scorerProfile || !scorerProfile.scores) return [];

  const improvements: PriorityImprovement[] = scorerProfile.scores
    .map((score: Score) => {
      const criterion = SCORING_RUBRIC.find((c) => c.id === score.criterionId);
      if (!criterion) return null;

      const impact = criterion.maxPoints - score.score;

      // Only include items with room for improvement
      if (impact <= 0) return null;

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        section: criterion.section,
        currentScore: score.score,
        maxScore: criterion.maxPoints,
        impact,
        whatHappened: score.reasoning || 'No observation provided',
        whyItMatters: getWhyItMatters(criterion.id),
        howToFix: score.coaching || getGenericCoachingFix(criterion.id),
      };
    })
    .filter((item): item is PriorityImprovement => item !== null)
    .sort((a, b) => b.impact - a.impact); // Sort by impact descending

  return improvements.slice(0, topN);
}

/**
 * Extract top strengths (perfect or near-perfect scores)
 * Returns top N strengths to reinforce
 */
export function extractStrengths(
  scorerProfile: ScorerProfile | undefined,
  topN: number = 3
): Strength[] {
  if (!scorerProfile || !scorerProfile.scores) return [];

  const strengths: Strength[] = scorerProfile.scores
    .map((score: Score) => {
      const criterion = SCORING_RUBRIC.find((c) => c.id === score.criterionId);
      if (!criterion) return null;

      // Only include perfect or near-perfect scores (90%+ of max)
      const percentScore = (score.score / criterion.maxPoints) * 100;
      if (percentScore < 90) return null;

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        section: criterion.section,
        score: score.score,
        maxScore: criterion.maxPoints,
        reasoning: score.reasoning || 'Excellent execution',
      };
    })
    .filter((item): item is Strength => item !== null)
    .sort((a, b) => b.score - a.score); // Sort by score descending

  return strengths.slice(0, topN);
}

/**
 * Calculate trend based on recent scores
 * Returns 'improving', 'steady', or 'declining'
 */
export type TrendDirection = 'improving' | 'steady' | 'declining';

export function calculateTrend(recentScores: number[]): TrendDirection {
  if (recentScores.length < 2) return 'steady';

  // Calculate simple linear regression slope
  const n = recentScores.length;
  const xMean = (n - 1) / 2;
  const yMean = recentScores.reduce((sum, score) => sum + score, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = recentScores[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;

  // Classify trend based on slope
  // Threshold: 1 point per call = improving, -1 point = declining
  if (slope > 1) return 'improving';
  if (slope < -1) return 'declining';
  return 'steady';
}

/**
 * Get trend emoji for display
 */
export function getTrendEmoji(trend: TrendDirection): string {
  const emojis: Record<TrendDirection, string> = {
    improving: '📈',
    steady: '➡️',
    declining: '📉',
  };
  return emojis[trend];
}

/**
 * Get "Why It Matters" business impact for each criterion
 * Maps criterion ID to business impact explanation
 */
function getWhyItMatters(criterionId: string): string {
  const impacts: Record<string, string> = {
    gs_discovery:          'Quantifying pain in dollars creates urgency and separates Simpro Group from "nice to have" to "must have."',
    gs_objection_handling: 'Inoculating objections early prevents them from derailing later-stage conversations and builds trust.',
    gs_positioning:        'Revenue-led positioning makes the ROI case for you — the prospect connects the dots between features and profit.',
    gs_closing:            'A 1-10 trial close surfaces hidden objections and a calendar invite on the call prevents deal drift.',
    gs_price_as_weapon:    'Anchoring on multi-year contracts before discounting preserves ACV and sets the right negotiation floor.',
    gs_roi_quantification: 'Two specific ROI numbers using the prospect\'s own data make the business case undeniable and defensible internally.',
    ps_opening:            'A Circle of Life opener establishes authority immediately, making the AE the expert rather than just a presenter.',
    ps_discovery_gates:    'All 6 gates ensure you know the Boss, the Budget, and the Vision — without them, you\'re guessing.',
    ps_value_mirror:       'Recapping discovery and confirming the win condition locks in mutual understanding before the demo begins.',
    ps_demo_execution:     'A "day in the life" demo feels personal; generic demos feel like everyone else\'s pitch.',
    ps_close_next_steps:   'Confirming fit plus a buying signal question separates polite interest from real intent to move forward.',
    // BDR behaviours
    bdr_b1:  'A full name signals confidence and authority — first-name-only openers undermine credibility before the call has started.',
    bdr_b2:  '"Just" is a submissive filler that frames the call as an interruption rather than a valuable interaction — it hands control to the prospect.',
    bdr_b3:  'Asking permission invites rejection before the conversation has begun. Moving straight in keeps the BDR in control.',
    bdr_b4:  'Referencing the correct data source (inbound, prior contact, event) demonstrates preparedness and makes the call feel relevant, not random.',
    bdr_b5:  'A clean 10-second one-liner builds credibility and prevents the prospect from disengaging before hearing the hook.',
    bdr_b6:  'Leading with a purposeful insight positions the BDR as someone who understands the prospect\'s world — not just another vendor.',
    bdr_b7:  'The right angle (admin burden, efficiency, cash flow, case study) must match the prospect\'s context — a mismatched hook signals poor preparation.',
    bdr_b8:  'Silence after the hook creates space for the prospect to self-identify with the problem — rushing past it kills the moment.',
    bdr_b9:  'Jargon and job-type questions signal "product pitch" — process-focused questions sound like genuine curiosity and build rapport.',
    bdr_b10: 'A genuine frustration in the prospect\'s own words is the emotional anchor for the entire rest of the call and the demo.',
    bdr_b11: 'Pain explored across multiple dimensions (business, personal, team) creates a richer motivation to act — single-dimension pain is easy to deprioritise.',
    bdr_b12: 'Cost-of-inaction creates urgency from the prospect themselves — without it, "think about it" becomes the default answer.',
    bdr_b13: 'Pitching features before discovery is complete signals low listening skills and shifts the dynamic from consultative to transactional.',
    bdr_b14: 'Reflecting the prospect\'s own language back shows they were heard — it\'s the most powerful rapport-building move before the ask.',
    bdr_b15: 'A time-based mirror makes abstract savings tangible and personal — "hours back" is aspirational, not analytical.',
    bdr_b16: 'An emotional, amiable summary creates warmth and trust — an ROI calculation at this stage feels premature and transactional.',
    bdr_b17: 'A natural bridge grounded in the prospect\'s stated pain makes the demo ask feel logical, not pushy.',
    bdr_b18: 'A qualified demo requires confirmed real pain — without it, the demo becomes an expensive product tour with no emotional stake.',
    bdr_b19: 'Demoing to someone without purchase influence wastes pipeline — confirming authority protects conversion rates.',
    bdr_b20: 'Fit assessment protects demo capacity — pursuing a mis-sized opportunity is a lose-lose for both parties.',
    bdr_b21: 'Without a compelling reason to move now, the deal stalls — urgency identified on the call prevents it becoming a "maybe later."',
    bdr_b22: 'A concrete next step (specific date and time) is the only thing that separates a good conversation from a qualified pipeline entry.',
    bdr_b23: 'Assertive close language ("When have you got...") is more effective than passive alternatives because it frames the demo as the natural next step, not an optional extra.',
  };

  return impacts[criterionId] || 'This criterion directly impacts deal velocity and ACV — mastering it separates top AEs from the rest.';
}

/**
 * Get generic coaching fix if AI didn't provide specific guidance
 */
function getGenericCoachingFix(criterionId: string): string {
  const fixes: Record<string, string> = {
    gs_discovery:          'Ask "What does that cost you annually?" after every pain point. Don\'t leave without a dollar figure and the name of the person who signs the check.',
    gs_objection_handling: 'Surface likely blockers yourself: "One thing that sometimes comes up is contracts — is that something we should address today?"',
    gs_positioning:        'For each feature shown, immediately follow with: "For a business running [X] jobs a week, that typically means [specific outcome]."',
    gs_closing:            'Before hanging up: "On a scale of 1-10, how likely are you to move forward? What would make it a 10?" Then book the next step live.',
    gs_price_as_weapon:    'Hold price until you\'ve walked through at least two ROI numbers. Present multi-year as the default: "Most customers go with a 3-year term — here\'s why that works in your favour."',
    gs_roi_quantification: 'Use their numbers, not averages. "You said you run 200 jobs a week — at 15 minutes saved per job, that\'s 50 hours recovered every week."',
    ps_opening:            'Open with a business observation about their industry or company, not a product introduction. E.g. "I noticed you\'re expanding into [region] — scaling field ops there is a common challenge."',
    ps_discovery_gates:    'Use a physical or mental checklist: (1) Industry/size (2) Current software (3) Key pain (4) Stakeholders/DM (5) Vision of success (6) Tech adoption readiness. Don\'t demo until all 6 are cleared.',
    ps_value_mirror:       'Before the demo say: "Here\'s what I heard — you\'re struggling with [A], [B], [C]. If I can show you how to solve those today, is that the win?" Get explicit confirmation.',
    ps_demo_execution:     'Replace canned data with their company name, job types, and truck count. Ask "How many more jobs could your team handle if this was automated?" to create velocity.',
    ps_close_next_steps:   'Ask: "Based on what you\'ve seen, do you think Simpro Group is an 80% fit for your business?" Then: "What would need to happen on your end to get this in front of [DM]?"',
    // BDR behaviours
    bdr_b1:  'Practise your opening until giving your full name feels natural. "Hi, this is [First] [Last] from Simpro Group" — never just a first name on a cold call.',
    bdr_b2:  'Record your calls and flag every instance of "just". Replace "I\'m just calling to..." with "The reason for my call today is...".',
    bdr_b3:  'Skip the permission question entirely. Move directly to your reason for the call — the opener itself signals respect for their time.',
    bdr_b4:  'Before dialling, identify the data source: cold, rewarm, inbound, or event. Write your opening line to reference it specifically.',
    bdr_b5:  'Prepare a single 10-second answer to "what does Simpro Group do?" Practise it until it\'s automatic. No rambling — tighten it to one sentence.',
    bdr_b6:  'Lead with your insight before asking discovery questions. "The reason I\'m calling is that most [sector] businesses we speak to are losing hours to [problem]." Then pause.',
    bdr_b7:  'Match your insight angle to the prospect\'s profile: trade businesses → admin burden; growth-stage → efficiency; tight-margin → cash flow.',
    bdr_b8:  'After delivering your hook, go silent. Count to three in your head if needed. Let the prospect react — don\'t fill the space yourself.',
    bdr_b9:  'Ask "how do you currently manage [process]?" rather than "do you use job management software?" One is curious, the other is a feature pitch.',
    bdr_b10: 'Use "tell me more about that" and "what does that look like day-to-day?" to draw frustrations out. The goal is to hear them say a specific pain in their own words.',
    bdr_b11: 'For every pain uncovered, explore it from three angles: "How does that affect the business? How does it affect you personally? How does your team feel about it?"',
    bdr_b12: 'Ask explicitly: "What happens if this doesn\'t get fixed in the next 6 months?" Urgency must come from their answer, not your pitch.',
    bdr_b13: 'When the prospect shows interest, say "I\'ll show you exactly how we handle that in the demo" and return to discovery. Features come after pain is fully explored.',
    bdr_b14: 'Before the demo ask, repeat back their exact words: "You mentioned [specific problem they described] — does that summarise it correctly?" Then pivot.',
    bdr_b15: 'After the pain summary, ask: "If we could give you [X hours] back each week, what would you do with that time?" Pause and let them answer.',
    bdr_b16: 'Keep the summary warm and conversational — no maths. "It sounds like you\'re carrying a lot of the admin burden yourself" lands better than "you could save £20k."',
    bdr_b17: 'Tie your demo ask directly to the prospect\'s stated pain: "The best next step would be a demo focused entirely on solving [their exact problem]."',
    bdr_b18: 'If no clear pain has surfaced, ask one more open question before the close: "What\'s the one thing that, if it were working better, would make the biggest difference?"',
    bdr_b19: 'Ask directly: "Are you the person who would sign off on something like this, or would someone else need to be involved?" Map the buying team before agreeing a demo.',
    bdr_b20: 'Confirm team size and current tools before closing: "How many field engineers do you have? What are you using to manage their work today?" Qualify fit explicitly.',
    bdr_b21: 'Find a time-bound trigger: growth, a problem that\'s getting worse, an upcoming peak season, or a current tool that\'s breaking. Reference it in your close.',
    bdr_b22: 'Don\'t end the call without a specific next step. If a demo isn\'t right, record why and agree a follow-up date. "Let\'s speak again in 3 months" is not a next step.',
    bdr_b23: 'Propose the time rather than asking if they\'re interested: "How does Thursday at 2pm look?" Avoid "would you like to?" — assertive framing increases acceptance.',
  };

  return fixes[criterionId] || 'Focus on the prospect\'s business outcomes first. Every question, feature, and close should be anchored to their specific pain and dollar impact.';
}

/**
 * Format criterion description for "Why It Matters" if not overridden
 */
export function getDefaultWhyItMatters(criterion: ScoringCriterion): string {
  return getWhyItMatters(criterion.id);
}

/**
 * Format coaching fix for display
 */
export function formatCoachingFix(criterion: ScoringCriterion, score: Score): string {
  // Prefer AI-provided coaching, fall back to generic
  return score.coaching || getGenericCoachingFix(criterion.id);
}

// ─── BDR Grade Helpers ────────────────────────────────────────────────────────

export const BDR_GRADE_THRESHOLDS = {
  A: 37, // 80%+ of 46 pts
  B: 28, // 60-79%
  C: 18, // 40-59%
  // below 18 = D
} as const;

export function getBdrGrade(score: number): BdrGrade {
  if (score >= BDR_GRADE_THRESHOLDS.A) return 'A';
  if (score >= BDR_GRADE_THRESHOLDS.B) return 'B';
  if (score >= BDR_GRADE_THRESHOLDS.C) return 'C';
  return 'D';
}

export function getBdrGradeLabel(grade: BdrGrade): string {
  const labels: Record<BdrGrade, string> = {
    A: 'Grade A — Gold Standard',
    B: 'Grade B — On Track',
    C: 'Grade C — Needs Development',
    D: 'Grade D — Critical',
  };
  return labels[grade];
}

export function getBdrGradeColor(grade: BdrGrade): string {
  const colors: Record<BdrGrade, string> = {
    A: 'text-green-600 bg-green-50 border-green-200',
    B: 'text-blue-600 bg-blue-50 border-blue-200',
    C: 'text-amber-700 bg-amber-50 border-amber-200',
    D: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[grade];
}

export function getBdrStageScore(
  scores: Score[],
  stage: string
): { earned: number; max: number; pct: number } {
  const stageScores = scores.filter((s) => {
    const criterion = BDR_SCORING_RUBRIC.find((c) => c.id === s.criterionId);
    return criterion?.section === stage;
  });
  const earned = stageScores.reduce((sum, s) => sum + s.score, 0);
  const max = stageScores.length * 2;
  return { earned, max, pct: max > 0 ? Math.round((earned / max) * 100) : 0 };
}

/**
 * Extract BDR strengths (Pass scores = 2/2) — uses BDR_SCORING_RUBRIC
 */
export function extractBdrStrengths(
  scorerProfile: ScorerProfile | undefined,
  topN: number = 3
): Strength[] {
  if (!scorerProfile || !scorerProfile.scores) return [];

  const strengths: Strength[] = scorerProfile.scores
    .map((score: Score) => {
      const criterion = BDR_SCORING_RUBRIC.find((c) => c.id === score.criterionId);
      if (!criterion) return null;

      // BDR max is always 2; only include Pass (score === 2)
      if (score.score < criterion.maxPoints) return null;

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        section: criterion.section,
        score: score.score,
        maxScore: criterion.maxPoints,
        reasoning: score.reasoning || 'Excellent execution',
      };
    })
    .filter((item): item is Strength => item !== null)
    .sort((a, b) => b.score - a.score);

  return strengths.slice(0, topN);
}

/**
 * Rank BDR improvements by point impact — uses BDR_SCORING_RUBRIC instead of AE rubric
 */
export function prioritizeBdrImprovements(
  scorerProfile: ScorerProfile | undefined,
  topN: number = 3
): PriorityImprovement[] {
  if (!scorerProfile || !scorerProfile.scores) return [];

  const improvements: PriorityImprovement[] = scorerProfile.scores
    .map((score: Score) => {
      const criterion = BDR_SCORING_RUBRIC.find((c) => c.id === score.criterionId);
      if (!criterion) return null;

      const impact = criterion.maxPoints - score.score;
      if (impact <= 0) return null;

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        section: criterion.section,
        currentScore: score.score,
        maxScore: criterion.maxPoints,
        impact,
        whatHappened: score.reasoning || 'No observation provided',
        whyItMatters: getWhyItMatters(criterion.id),
        howToFix: score.coaching || getGenericCoachingFix(criterion.id),
      };
    })
    .filter((item): item is PriorityImprovement => item !== null)
    .sort((a, b) => b.impact - a.impact);

  return improvements.slice(0, topN);
}

// ─── SE Category Naming ───────────────────────────────────────────────────────

/**
 * Older SE category names that map to their current equivalents.
 * The live scoring prompt renamed two categories; sessions scored before that
 * change still carry the old names in Firestore.
 */
export const SE_CATEGORY_ALIASES: Record<string, string> = {
  'Demo Relevance and Storyline':                   'Demo Relevance and Value Connection',
  'Call Leadership, Collaboration, and Next Steps': 'Call Support, Collaboration, and Technical Follow-through',
};

export const CANONICAL_SE_CATEGORY_ORDER = [
  'Customer Context and Discovery',
  'Demo Relevance and Value Connection',
  'Product and Technical Credibility',
  'Operational Fit and Adoption Readiness',
  'Value and Business Impact',
  'Customer Engagement and Active Listening',
  'Buyer-Centric Demo Language',
  'Communication and Executive Presence',
  'Objection, Concern, and Risk Handling',
  'Call Support, Collaboration, and Technical Follow-through',
];

/**
 * Normalise a stored SE category name to its current canonical name.
 */
export function canonicalSeCategory(name: string): string {
  return SE_CATEGORY_ALIASES[name] ?? name;
}

// ─── Value Articulation ───────────────────────────────────────────────────────

/**
 * The two SE rubric categories that score whether the SE explained the "why" —
 * i.e. connected what was demonstrated to a specific customer outcome, rather
 * than only showing what the product does and how it works.
 */
export const VALUE_ARTICULATION_CATEGORIES = [
  'Demo Relevance and Value Connection',
  'Value and Business Impact',
];

/** Combined maximum for the two value categories (18 + 10) — display label only. */
export const VALUE_ARTICULATION_MAX = 28;

export interface ValueArticulationPart {
  category: string;
  earned: number;
  max: number;
  pct: number;
}

export interface ValueArticulation {
  earned: number;
  max: number;
  pct: number;
  parts: ValueArticulationPart[];
}

/**
 * Value Articulation for a single session: points earned across the two value
 * categories as a percentage of their combined maximum.
 *
 * Returns null when the session has no SE scoring, or when neither value
 * category is present in its category scores.
 */
export function getSessionValueArticulation(session: DemoSession): ValueArticulation | null {
  const categoryScores = session.seScoring?.evaluations?.[0]?.category_scores;
  if (!categoryScores || categoryScores.length === 0) return null;

  const parts: ValueArticulationPart[] = [];
  for (const target of VALUE_ARTICULATION_CATEGORIES) {
    const match = categoryScores.find(c => canonicalSeCategory(c.category) === target);
    if (!match || match.max_points <= 0) continue;
    parts.push({
      category: target,
      earned: match.points_awarded,
      max: match.max_points,
      pct: Math.round((match.points_awarded / match.max_points) * 100),
    });
  }

  if (parts.length === 0) return null;

  // Derive the max from the session's own scores so a rubric reweight doesn't
  // silently skew the metric.
  const earned = parts.reduce((sum, p) => sum + p.earned, 0);
  const max = parts.reduce((sum, p) => sum + p.max, 0);

  return { earned, max, pct: Math.round((earned / max) * 100), parts };
}

/**
 * Average Value Articulation across a set of sessions — mean of the per-session
 * percentages, matching how overall score averages are calculated.
 *
 * Returns null when no session in the list qualifies.
 */
export function getAverageValueArticulation(
  sessions: DemoSession[]
): { pct: number; count: number; parts: ValueArticulationPart[] } | null {
  const results = sessions
    .map(getSessionValueArticulation)
    .filter((v): v is ValueArticulation => v !== null);

  if (results.length === 0) return null;

  const pct = Math.round(results.reduce((sum, r) => sum + r.pct, 0) / results.length);

  // Average each contributing category independently so the breakdown still
  // reads correctly when a session is missing one of the two.
  const parts: ValueArticulationPart[] = [];
  for (const target of VALUE_ARTICULATION_CATEGORIES) {
    const rows = results
      .map(r => r.parts.find(p => p.category === target))
      .filter((p): p is ValueArticulationPart => p !== undefined);
    if (rows.length === 0) continue;
    parts.push({
      category: target,
      earned: Math.round((rows.reduce((sum, p) => sum + p.earned, 0) / rows.length) * 10) / 10,
      max: rows[0].max,
      pct: Math.round(rows.reduce((sum, p) => sum + p.pct, 0) / rows.length),
    });
  }

  return { pct, count: results.length, parts };
}
