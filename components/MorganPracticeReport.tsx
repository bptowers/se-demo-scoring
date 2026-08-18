import React from 'react';
import { CheckCircle2, CircleHelp, Clock, Loader2, Target, XCircle } from 'lucide-react';
import { PracticeEvaluationResult, PracticeOverallRating, PracticeReport } from '../types';

/*
 * Morgan practice report. Every score, rationale and field value shown here comes straight from
 * ElevenLabs' post-call analysis — this component formats, it does not judge. The overall label
 * and the single objective are derived by fixed rules in the webhook function.
 *
 * Language is deliberately coaching-oriented: this is practice evidence for the person who ran
 * the call, not performance management, and nothing here is shared with managers.
 */

const CRITERION_LABELS: Record<string, string> = {
  discovery_breadth: 'Discovery breadth',
  question_quality: 'Question quality',
  listening_and_followup: 'Listening and follow-up',
  avoided_premature_pitch: 'Held the pitch',
  business_value_discovery: 'Business value discovery',
  credible_next_step: 'Credible next step',
};

/** Field IDs come from Morgan's ElevenLabs config, so fall back to a readable form. */
const humanise = (id: string): string =>
  id.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const RATING_STYLES: Record<PracticeOverallRating, string> = {
  Strong: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Developing: 'bg-amber-50 text-amber-800 border-amber-200',
  'Needs focus': 'bg-orange-50 text-orange-800 border-orange-200',
  Incomplete: 'bg-slate-100 text-slate-700 border-slate-200',
};

const RATING_BLURB: Record<PracticeOverallRating, string> = {
  Strong: 'Five or six criteria met on this call.',
  Developing: 'Three or four criteria met on this call.',
  'Needs focus': 'Two or fewer criteria met on this call.',
  Incomplete: 'Too few criteria were scored to rate this call — usually a very short conversation.',
};

const formatDuration = (seconds: number | null): string => {
  if (seconds === null || Number.isNaN(seconds)) return 'Not reported';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatCompleted = (date?: Date): string =>
  date
    ? date.toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not reported';

const StatusIcon: React.FC<{ status: PracticeEvaluationResult['status'] }> = ({ status }) => {
  if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />;
  if (status === 'failure') return <XCircle className="w-4 h-4 text-orange-600 flex-shrink-0" aria-hidden="true" />;
  return <CircleHelp className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />;
};

const STATUS_TEXT: Record<PracticeEvaluationResult['status'], string> = {
  success: 'Met',
  failure: 'Not met',
  unknown: 'Not scored',
};

/** Shown while a session has started but no newer report has arrived yet. */
export const PracticeReportPending: React.FC = () => (
  <div className="mt-6 border border-gray-100 bg-slate-50 rounded-xl p-5 flex items-start gap-3">
    <Loader2 className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0 mt-0.5" aria-hidden="true" />
    <div>
      <p className="text-sm font-bold text-brand-navy">Your coaching report is being prepared</p>
      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
        Morgan reviews the conversation after it ends. Your report appears here automatically —
        usually within a minute or two of hanging up. You can stay on this page.
      </p>
    </div>
  </div>
);

export const MorganPracticeReport: React.FC<{
  report: PracticeReport;
  isNew: boolean;
}> = ({ report, isNew }) => (
  <section
    aria-labelledby="practice-report-heading"
    className="mt-6 bg-white border border-gray-100 rounded-xl shadow-sm p-6"
  >
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="practice-report-heading" className="text-lg font-bold text-brand-navy">
          {isNew ? 'Your latest practice report' : 'Your most recent practice report'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Scored by Morgan after the call. Not shared with managers and not part of SE demo scoring.
        </p>
      </div>
      <div
        className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${RATING_STYLES[report.overallRating]}`}
      >
        {report.overallRating}
      </div>
    </div>

    <p className="text-sm text-slate-600 mt-3">{RATING_BLURB[report.overallRating]}</p>

    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 border-t border-gray-100 pt-4">
      <span className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Duration {formatDuration(report.durationSeconds)}
      </span>
      <span>Completed {formatCompleted(report.completedAt)}</span>
      {report.terminationReason && <span>Ended: {humanise(report.terminationReason)}</span>}
    </div>

    {report.transcriptSummary && (
      <div className="mt-5">
        <h3 className="text-xs font-bold text-brand-navy uppercase tracking-wide">Call summary</h3>
        <p className="text-sm text-slate-700 mt-2 leading-relaxed">{report.transcriptSummary}</p>
      </div>
    )}

    <div className="mt-6">
      <h3 className="text-xs font-bold text-brand-navy uppercase tracking-wide">How the call scored</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {report.evaluationResults.map((result) => (
          <div key={result.criterionId} className="border border-gray-100 rounded-lg p-3.5 bg-slate-50/60">
            <div className="flex items-start gap-2">
              <StatusIcon status={result.status} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-navy">
                  {CRITERION_LABELS[result.criterionId] ?? humanise(result.criterionId)}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{STATUS_TEXT[result.status]}</p>
                {result.rationale && (
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{result.rationale}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {report.extractedFields.length > 0 && (
      <div className="mt-6">
        <h3 className="text-xs font-bold text-brand-navy uppercase tracking-wide">
          What you discovered
        </h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-3">
          {report.extractedFields.map((field) => (
            <div key={field.fieldId} className="border-b border-gray-100 pb-2">
              <dt className="text-xs font-semibold text-slate-500">{humanise(field.fieldId)}</dt>
              <dd className="text-sm text-brand-navy mt-0.5">
                {field.value || <span className="text-slate-400 italic">Not captured on this call</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    )}

    <div className="mt-6 border border-brand-yellow/40 bg-brand-yellow/10 rounded-lg p-4 flex items-start gap-3">
      <Target className="w-4 h-4 text-brand-navy flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-sm font-bold text-brand-navy">Next practice objective</p>
        <p className="text-sm text-slate-700 mt-1 leading-relaxed">{report.nextPracticeObjective}</p>
      </div>
    </div>

    <p className="text-xs text-slate-500 mt-4">
      Ready to work on that? Start another session with Morgan using the control above.
    </p>
  </section>
);
