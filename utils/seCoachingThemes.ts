import { DemoSession, SeCategoryScore, SeCoachingSignals, SeEvaluation } from '../types';
import { canonicalSeCategory } from './scoringHelpers';

/**
 * Coaching themes from the SE call-review framework (SPIN Selling + Feature, Benefit, Value,
 * delivered as tell-show-tell). Each theme is derived from the coaching_signals the scorer
 * returns, plus the matching category score where the signals alone aren't enough.
 *
 * A theme returns:
 *   'gap'  – the behaviour was missing or done poorly on this call
 *   'ok'   – the behaviour was there
 *   null   – the theme didn't come up on this call (e.g. no buying signals to follow up)
 *
 * Thresholds live here, client-side, so they can be tuned without re-scoring calls.
 */

export type ThemeStatus = 'gap' | 'ok' | null;
export type ThemeLayer = 'Discovery' | 'Demo' | 'Execution';

export interface CoachingTheme {
  key: string;
  label: string;
  layer: ThemeLayer;
  /** What good looks like, shown as a tooltip and on the call scorecard. */
  good: string;
  /** Deal-health flags are shown but are never part of the SE's score. */
  dealHealthOnly?: boolean;
  evaluate: (signals: SeCoachingSignals, categories: SeCategoryScore[]) => ThemeStatus;
}

/** Below this share of a category's max, the category counts as a gap for the theme. */
const CATEGORY_GAP_PCT = 60;

const categoryPct = (categories: SeCategoryScore[], name: string): number | null => {
  const c = categories.find(x => canonicalSeCategory(x.category) === name);
  if (!c || c.max_points <= 0) return null;
  return (c.points_awarded / c.max_points) * 100;
};

const categoryBelow = (categories: SeCategoryScore[], name: string): boolean => {
  const pct = categoryPct(categories, name);
  return pct !== null && pct < CATEGORY_GAP_PCT;
};

export const COACHING_THEMES: CoachingTheme[] = [
  {
    key: 'stated_pain',
    label: 'Follow up on stated pain',
    layer: 'Discovery',
    good: 'Every pain the prospect volunteers gets follow-up questions before anything is shown: how it happens today, and what it causes.',
    evaluate: s => s.pain_statements === 0 ? null : (s.pains_followed_up < s.pain_statements ? 'gap' : 'ok'),
  },
  {
    key: 'discovery',
    label: 'Discovery and curiosity',
    layer: 'Discovery',
    good: "Before the first click, the SE knows the prospect's goal, current process and top pains, and asks pain questions on every call.",
    evaluate: (s, c) => (s.pain_statements === 0 || categoryBelow(c, 'Customer Context and Discovery')) ? 'gap' : 'ok',
  },
  {
    key: 'buying_signals',
    label: 'Follow up on buying signals',
    layer: 'Discovery',
    good: 'Every positive reaction gets a why or impact question: "What about that stands out?"',
    evaluate: s => s.buying_signals === 0 ? null : (s.buying_signals_followed_up < s.buying_signals ? 'gap' : 'ok'),
  },
  {
    key: 'objections',
    label: 'Objection handling',
    layer: 'Discovery',
    good: 'Acknowledge, probe what is behind it, size it, then answer. Position on the cost of the current process, not on price.',
    evaluate: s => {
      if (s.price_positioning > 0) return 'gap';
      if (s.objections_raised === 0) return null;
      return s.objections_probed < s.objections_raised ? 'gap' : 'ok';
    },
  },
  {
    key: 'quantify',
    label: 'Amplify and quantify the pain',
    layer: 'Discovery',
    good: 'Pain gets sized in hours, jobs, invoices, people or money, so the AE leaves with a number for the business case.',
    evaluate: s => s.pain_statements === 0 ? null : (s.pains_sized === 0 ? 'gap' : 'ok'),
  },
  {
    key: 'emotional',
    label: 'Emotional trigger',
    layer: 'Discovery',
    good: 'Once a pain is surfaced, ask what it takes them away from or how they would feel if it were solved.',
    evaluate: s => s.pain_statements === 0 ? null : (s.emotional_trigger_questions === 0 ? 'gap' : 'ok'),
  },
  {
    key: 'day_in_life',
    label: 'Day in the life, not everything',
    layer: 'Demo',
    good: 'A trade-specific day in the life built from discovery. Show the few things that matter to this prospect and tell the rest.',
    evaluate: (s, c) => (s.off_target_flows > 0 || categoryBelow(c, 'Demo Relevance and Value Connection')) ? 'gap' : 'ok',
  },
  {
    key: 'value',
    label: 'Value over features',
    layer: 'Demo',
    good: "Feature, Benefit, Value: restate the pain, show it, state the benefit and the value against how they work today, then ask a need-payoff question.",
    evaluate: (s, c) => (s.current_state_comparisons === 0 || categoryBelow(c, 'Value and Business Impact')) ? 'gap' : 'ok',
  },
  {
    key: 'check_ins',
    label: 'Open-ended check-ins',
    layer: 'Demo',
    good: 'After every section, one open question that invites a reaction or comparison, then a pause for a real answer.',
    evaluate: s => (s.open_check_ins === 0 || s.closed_check_ins > s.open_check_ins) ? 'gap' : 'ok',
  },
  {
    key: 'framing',
    label: 'Demo framing (tell-show-tell)',
    layer: 'Demo',
    good: 'Open the segment with what you heard, what you will show and why, and "What would you add or skip?". Close each section with a recap tied to the pain.',
    evaluate: s => s.segment_framing === 'Not Applicable' ? null : (s.segment_framing === 'Present' ? 'ok' : 'gap'),
  },
  {
    key: 'call_control',
    label: 'Call control',
    layer: 'Demo',
    good: 'When the prospect takes over or drifts, redirect with a question tied to the agenda.',
    evaluate: s => s.call_control_lost ? 'gap' : 'ok',
  },
  {
    key: 'language',
    label: 'Language and dead-air habits',
    layer: 'Execution',
    good: 'Use load time to ask a question, never narrate a glitch, and avoid "cheaper".',
    evaluate: s => (s.glitch_narration > 0 || s.price_positioning > 0) ? 'gap' : 'ok',
  },
  {
    key: 'next_step',
    label: 'Next step booked',
    layer: 'Execution',
    good: "The call ends with a dated next session. This is the AE's responsibility and is not part of the SE's score.",
    dealHealthOnly: true,
    evaluate: s => s.next_step_booked === 'Unclear' ? null : (s.next_step_booked === 'No' ? 'gap' : 'ok'),
  },
];

export const getThemeStatuses = (evaluation: SeEvaluation | undefined): Record<string, ThemeStatus> | null => {
  const signals = evaluation?.coaching_signals;
  if (!evaluation || !signals) return null;
  const out: Record<string, ThemeStatus> = {};
  for (const theme of COACHING_THEMES) {
    out[theme.key] = theme.evaluate(signals, evaluation.category_scores ?? []);
  }
  return out;
};

export const getSessionThemeStatuses = (session: DemoSession): Record<string, ThemeStatus> | null =>
  getThemeStatuses(session.seScoring?.evaluations?.[0]);

export interface ThemeTally {
  gaps: number;
  /** Calls where the theme came up (status not null). */
  applicable: number;
}

/** Tally of calls with a gap, per theme, across the given sessions. Sessions without signals are skipped. */
export const tallyThemes = (sessions: DemoSession[]): { calls: number; byTheme: Record<string, ThemeTally> } => {
  const byTheme: Record<string, ThemeTally> = {};
  for (const t of COACHING_THEMES) byTheme[t.key] = { gaps: 0, applicable: 0 };
  let calls = 0;
  for (const s of sessions) {
    const statuses = getSessionThemeStatuses(s);
    if (!statuses) continue;
    calls++;
    for (const t of COACHING_THEMES) {
      const st = statuses[t.key];
      if (st === null) continue;
      byTheme[t.key].applicable++;
      if (st === 'gap') byTheme[t.key].gaps++;
    }
  }
  return { calls, byTheme };
};
