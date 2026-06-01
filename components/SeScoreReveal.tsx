import React from 'react';
import { DemoSession } from '../types';
import { Button } from './Button';

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

interface SeScoreRevealProps {
  session: DemoSession;
  onViewCoachingReport: () => void;
  onSkipToDetails: () => void;
}

export const SeScoreReveal: React.FC<SeScoreRevealProps> = ({
  session,
  onViewCoachingReport,
  onSkipToDetails,
}) => {
  const scorecard = session.seScoring!;
  const evaluation = scorecard.evaluations[0];
  const result = evaluation.overall_result;
  const isPass = result.result === 'Pass';
  const scorePct = Math.round((result.final_score / 100) * 100);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8 text-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">SE Demo Scorecard</p>
        <h1 className="text-3xl font-black text-brand-navy">
          {evaluation.target_se_name || session.callDeliveredBy || 'Sales Engineer'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{formatDate(session.createdAt)}</p>
      </div>

      <div className="bg-brand-navy text-white rounded-2xl px-8 py-10 shadow-xl">
        <p className="text-7xl font-black text-brand-yellow leading-none">
          {result.final_score}
          <span className="text-3xl font-semibold text-slate-400">/100</span>
        </p>
        <p className="text-slate-300 mt-2 text-sm">
          Base score {result.base_score_before_caps}/100 · pass threshold 75
        </p>
        <div className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full border text-sm font-bold ${
          isPass ? 'text-green-700 bg-green-50 border-green-300' : 'text-red-700 bg-red-50 border-red-300'
        }`}>
          {result.result} · {result.performance_band}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Score</p>
          <p className="text-lg font-black text-brand-navy">{scorePct}%</p>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
            <div className="bg-brand-yellow h-2.5 rounded-full" style={{ width: `${scorePct}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Demo Language</p>
          <p className="text-sm font-bold text-brand-navy">{result.buyer_centric_language_pattern}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Caps Applied</p>
          <p className="text-lg font-black text-brand-navy">{result.caps_applied.length}</p>
        </div>
      </div>

      {result.one_sentence_assessment && (
        <p className="text-sm text-slate-600 leading-relaxed bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          {result.one_sentence_assessment}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="primary" onClick={onViewCoachingReport} className="flex-1 sm:flex-none sm:px-8">
          View Coaching Report
        </Button>
        <Button variant="secondary" onClick={onSkipToDetails} className="flex-1 sm:flex-none sm:px-8">
          Skip to Full Scorecard
        </Button>
      </div>
    </div>
  );
};
