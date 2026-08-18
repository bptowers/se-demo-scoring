import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bot, Headphones, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InlineConvaiWidget, deriveFirstName } from '../components/InlineConvaiWidget';
import { CoachSessionSidebar, CoachStep } from '../components/CoachSessionSidebar';
import { MorganPracticeReport, PracticeReportPending } from '../components/MorganPracticeReport';
import { subscribeToLatestPracticeReport } from '../services/practiceReportService';
import { PracticeReport } from '../types';

/*
 * Morgan — the discovery-practice coach. The ElevenLabs widget plumbing (CDN loader, inline
 * host styling, attribute wiring) lives in components/InlineConvaiWidget.tsx and is shared
 * with the objection coach; only Morgan's agent, copy and call labels live here.
 */

const SESSION_STEPS: CoachStep[] = [
  { title: 'Start the coach', description: 'Open the voice session and meet Morgan, your AI customer.' },
  { title: 'Allow microphone', description: 'Use a headset for the clearest conversation.' },
  { title: 'Run your demo', description: 'Set the agenda, walk the workflow, and handle pushback.' },
];

const START_LABEL = 'Start practice session';
const END_LABEL = 'End practice session';

/** Identifies Morgan's discovery scenario in stored reports. Must match the webhook function. */
const MORGAN_SCENARIO_ID = 'morgan-discovery-v1';

export const AiDemoCoach: React.FC = () => {
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;
  const { user } = useAuth();

  // Only reachable behind a route guard, so a user is normally present — but displayName
  // is nullable on Google accounts without a profile name, hence the fallback chain.
  const firstName = deriveFirstName(user);

  const [report, setReport] = useState<PracticeReport | null>(null);
  const [reportsAvailable, setReportsAvailable] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  /** Report present when the page loaded, so a newly arrived one can be distinguished. */
  const baselineConversationId = useRef<string | null | undefined>(undefined);

  /*
   * Report ownership, passed to ElevenLabs as dynamic variables so the post-call webhook can
   * attribute the report. The UID — never the email — is the owner and the database key.
   * `session_id` is generated once per mount, identifying this practice attempt.
   */
  const sessionId = useMemo(
    () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}`),
    []
  );

  const ownershipVariables = useMemo(
    () => ({
      app_user_id: user?.uid ?? '',
      scenario_id: MORGAN_SCENARIO_ID,
      session_id: sessionId,
    }),
    [user?.uid, sessionId]
  );

  const handleSessionStart = useCallback(() => setSessionStarted(true), []);

  useEffect(() => {
    const unsubscribe = subscribeToLatestPracticeReport(
      user?.uid,
      MORGAN_SCENARIO_ID,
      (next) => {
        setReportsAvailable(true);
        if (baselineConversationId.current === undefined) {
          baselineConversationId.current = next?.conversationId ?? null;
        }
        setReport(next);
      },
      () => setReportsAvailable(false)
    );
    return unsubscribe;
  }, [user?.uid]);

  const isNewReport = !!report && report.conversationId !== baselineConversationId.current;
  /*
   * Only claim a report is on its way if a session actually started this visit, reports are
   * actually reachable, and nothing newer has landed yet. The `reportsAvailable` term matters:
   * without it, demo mode would promise a report that can never arrive. The widget emits no
   * call-ended event, so a started session is the honest signal available.
   */
  const awaitingReport = sessionStarted && reportsAvailable && !isNewReport;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
          <Bot className="w-7 h-7" /> AI Demo Coach
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Rehearse your Simpro demo out loud with a voice AI that plays the customer — before you run it live.
        </p>
      </div>

      {/* Guided session workspace: steps beside the coach on desktop, stacked below lg. */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

        <CoachSessionSidebar
          headingId="session-steps-heading"
          heading="Your session"
          steps={SESSION_STEPS}
          footnote={
            <div className="flex items-start gap-2">
              <Headphones className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Practice sessions aren't scored and aren't included in Trends or Call History.
              </p>
            </div>
          }
        />

        {/* Coaching area */}
        <section
          aria-labelledby="coaching-heading"
          className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 w-full min-w-0"
        >
          <h2 id="coaching-heading" className="text-lg font-bold text-brand-navy">
            Ready when you are
          </h2>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Morgan will play the customer, ask realistic questions, and challenge you when the story is not
            clear.
          </p>

          {/* Not configured */}
          {!agentId && (
            <div className="mt-5 border border-amber-200 bg-amber-50/50 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold text-brand-navy text-sm">AI Demo Coach is not configured yet</p>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Set{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-brand-navy font-mono text-xs">
                    VITE_ELEVENLABS_AGENT_ID
                  </code>{' '}
                  in your{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-brand-navy font-mono text-xs">
                    .env
                  </code>{' '}
                  file to the agent ID from the ElevenLabs dashboard, then restart the dev server. Deployed
                  builds need the same variable present at build time.
                </p>
              </div>
            </div>
          )}

          {agentId && (
            <InlineConvaiWidget
              agentId={agentId}
              startLabel={START_LABEL}
              endLabel={END_LABEL}
              userName={firstName}
              extraDynamicVariables={ownershipVariables}
              onSessionStart={handleSessionStart}
            />
          )}

          <p className="text-xs text-slate-500 mt-4 flex items-start gap-2">
            <Mic className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
            Your browser will ask for microphone access once. Leaving this page ends the conversation.
          </p>

          {/* Post-call coaching report. Written server-side by the ElevenLabs webhook. */}
          {awaitingReport && <PracticeReportPending />}
          {report && <MorganPracticeReport report={report} isNew={isNewReport} />}
          {!report && !awaitingReport && reportsAvailable && (
            <p className="text-xs text-slate-500 mt-6 border-t border-gray-100 pt-4">
              Finish a practice call and Morgan's coaching report will appear here.
            </p>
          )}
          {!reportsAvailable && (
            <p className="text-xs text-slate-500 mt-6 border-t border-gray-100 pt-4">
              Coaching reports need a signed-in account, so they are unavailable in demo mode.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
