/**
 * Manager-facing coaching library, one entry per coaching theme in utils/seCoachingThemes.ts.
 * Wording follows the SE call-review framework (SPIN Selling + Feature, Benefit, Value).
 * Used by the Manager Coaching Guide; nothing here is sent to the scoring model.
 */

export interface ThemePlaybook {
  /** The SE rubric category this theme mostly scores under (canonical name). */
  category: string;
  /** coaching_signals keys whose evidence quotes belong to this theme. */
  signals: string[];
  instead: string;
  tryThis: string;
  drill: string;
  /** A question for the manager to ask so the SE finds the gap themselves. */
  askTheSe: string;
}

export const THEME_PLAYBOOK: Record<string, ThemePlaybook> = {
  stated_pain: {
    category: 'Customer Context and Discovery',
    signals: ['pain_statements', 'pains_followed_up'],
    instead: '"Awesome", then back to the demo',
    tryThis: '"How are you handling that today? What\'s getting in the way?"',
    drill: 'Replay the recording, pause at each pain the prospect states, and write the next two questions before playing what was actually said.',
    askTheSe: 'When the prospect described that problem, what two questions could you have asked before showing anything?',
  },
  discovery: {
    category: 'Customer Context and Discovery',
    signals: ['pain_statements'],
    instead: 'Opening with features',
    tryThis: '"You told [AE] about A and B, so today I\'ll show X and Y. What would you add or skip?"',
    drill: 'Hot seat: the AE plays the prospect. Five minutes of discovery, then name the goal, current state and top pain before demoing anything.',
    askTheSe: 'Before your first click, what did you know about their goal, current process and top two pains? Where did that come from?',
  },
  buying_signals: {
    category: 'Customer Engagement and Active Listening',
    signals: ['buying_signals', 'buying_signals_followed_up'],
    instead: 'Thanking the prospect for "That\'s great" and moving on',
    tryThis: '"What about that stands out? How would that change things for your team?"',
    drill: 'Count the positive reactions in the recording and how many got a follow-up question. The target is all of them.',
    askTheSe: 'When the prospect said they liked something, what did you learn about why it mattered to them?',
  },
  objections: {
    category: 'Objection, Concern, and Risk Handling',
    signals: ['objections_raised', 'objections_probed', 'price_positioning'],
    instead: 'Answering a roadblock straight away, or "It\'s cheaper"',
    tryThis: '"Tell me more about that. What has to keep working on day one?" or "What is the current process costing you in hours each week?"',
    drill: 'Write a probing question and an approved answer for the top roadblocks: integrations, tax handling, setup effort and price.',
    askTheSe: 'When that concern came up, what was behind it? How could you have found out before answering?',
  },
  quantify: {
    category: 'Customer Context and Discovery',
    signals: ['pains_sized', 'pain_statements'],
    instead: '"So that\'s a pain point", and moving on',
    tryThis: '"How often does that happen? Who else feels it? What does that add up to in a month?"',
    drill: 'For each pain on the call, write the sizing question that should have followed it, then the follow-up that makes it bigger.',
    askTheSe: 'Which pain on this call could you have put a number on? What question would have got you that number?',
  },
  emotional: {
    category: 'Customer Context and Discovery',
    signals: ['emotional_trigger_questions'],
    instead: '"This will save you time"',
    tryThis: '"When does that come out of, evenings or weekends? How would you feel if invoices went out the same day the job closed?"',
    drill: 'Take three sized pains from recent calls and write two questions for each: what it takes them away from, and how they would feel if it were fixed.',
    askTheSe: 'What does this problem cost the person on the call, outside the business numbers?',
  },
  day_in_life: {
    category: 'Demo Relevance and Value Connection',
    signals: ['off_target_flows'],
    instead: 'The full product tour',
    tryThis: '"You mentioned dispatch and invoicing are where the time goes. Let me show you a day for one of your techs, start to finish."',
    drill: 'Build one day-in-the-life script for this prospect\'s trade from the discovery notes, showing three things and telling the rest.',
    askTheSe: 'Which parts of the demo mattered to this prospect, and which could you have told instead of shown?',
  },
  value: {
    category: 'Value and Business Impact',
    signals: ['current_state_comparisons'],
    instead: '"Is that answering your question?"',
    tryThis: '"How does that compare to what you\'re currently doing?"',
    drill: 'Pick three features from the call and write the full Feature, Benefit, Value statement for this prospect, ending in a need-payoff question.',
    askTheSe: 'Pick one feature you showed. How does it compare to what they do today, in their words?',
  },
  check_ins: {
    category: 'Customer Engagement and Active Listening',
    signals: ['open_check_ins', 'closed_check_ins'],
    instead: '"Any questions so far?" or "Does that make sense?"',
    tryThis: '"What has jumped out at you so far?"',
    drill: 'Drop "any questions", "does that make sense" and "is that answering your question" for a week, and check the next recordings for the replacements.',
    askTheSe: 'How did you know the prospect was with you after each section?',
  },
  framing: {
    category: 'Demo Relevance and Value Connection',
    signals: ['segment_framing', 'closing_recaps'],
    instead: 'Sharing the screen and starting to click',
    tryThis: '"You told [AE] about A and B, so today I\'ll show X and Y. What would you add or skip?"',
    drill: 'Record a 60-second opener for each of the next three demos and review it together before the call.',
    askTheSe: 'Before you started, what did you tell the prospect you would show, and why?',
  },
  call_control: {
    category: 'Customer Engagement and Active Listening',
    signals: ['call_control_lost'],
    instead: 'Following the prospect wherever they take the call',
    tryThis: '"That\'s helpful. Before we go there, what matters most for you to see today?"',
    drill: 'Role-play a prospect who takes over the demo and practise the redirect question three different ways.',
    askTheSe: 'When the call drifted, what question could have brought it back to their priorities?',
  },
  language: {
    category: 'Communication and Executive Presence',
    signals: ['glitch_narration', 'price_positioning'],
    instead: '"Give it a second" or explaining what went wrong with the demo',
    tryThis: '"While this loads, walk me through how your team handles this today."',
    drill: 'Pick one habit from this call and track it on the next three calls.',
    askTheSe: 'When the demo stalled, what could you have asked the prospect instead of filling the gap?',
  },
};
