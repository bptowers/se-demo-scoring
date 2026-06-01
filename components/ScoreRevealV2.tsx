import React from 'react';
import { DemoSession, RagRating } from '../types';
import { Button } from './Button';

const RAG_CONFIG: Record<RagRating, { label: string; color: string; bar: string }> = {
  GREEN: { label: 'Green — Ready to Advance',  color: 'text-green-700 bg-green-50 border-green-300',  bar: 'bg-green-500' },
  AMBER: { label: 'Amber — Needs Development', color: 'text-amber-700 bg-amber-50 border-amber-300',  bar: 'bg-amber-500' },
  RED:   { label: 'Red — Critical Gaps',        color: 'text-red-700   bg-red-50   border-red-300',    bar: 'bg-red-500'   },
};

const SE_REC_CONFIG = {
  NO_SE:           { label: 'No SE Required',              color: 'bg-green-100 text-green-800 border-green-300' },
  FLAG_FOR_REVIEW: { label: 'Flag for SE Review',          color: 'bg-amber-100 text-amber-800 border-amber-300' },
  MANDATORY_SE:    { label: 'Mandatory SE Involvement',    color: 'bg-red-100 text-red-800 border-red-300' },
};

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

interface ScoreRevealV2Props {
  session: DemoSession;
  onViewCoachingReport: () => void;
  onSkipToDetails: () => void;
}

export const ScoreRevealV2: React.FC<ScoreRevealV2Props> = ({
  session,
  onViewCoachingReport,
  onSkipToDetails,
}) => {
  const v2 = session.aiV2!;
  const rag = RAG_CONFIG[v2.ragRating];
  const seRec = SE_REC_CONFIG[v2.seTriggers.recommendation];
  const processPct  = Math.round((v2.processTotal  / 25) * 100);
  const gsPct       = Math.round((v2.goldStandardTotal / 30) * 100);
  const combinedPct = Math.round((v2.combinedTotal / 55) * 100);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8 text-center">

      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">AE Call Scorecard V2</p>
        <h1 className="text-3xl font-black text-brand-navy">
          {session.callDeliveredBy ?? 'Account Executive'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{formatDate(session.createdAt)}</p>
      </div>

      {/* Big score */}
      <div className="bg-brand-navy text-white rounded-2xl px-8 py-10 shadow-xl">
        <p className="text-7xl font-black text-brand-yellow leading-none">
          {v2.combinedTotal}
          <span className="text-3xl font-semibold text-slate-400">/55</span>
        </p>
        <p className="text-slate-300 mt-2 text-sm">{combinedPct}% of maximum score</p>

        {/* RAG badge */}
        <div className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full border text-sm font-bold ${rag.color}`}>
          {rag.label}
        </div>
      </div>

      {/* SE trigger badge */}
      <div className="flex justify-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${seRec.color}`}>
          {seRec.label}
          <span className="font-normal opacity-70">— {v2.seTriggers.totalCount}/10 triggers</span>
        </div>
      </div>

      {/* Section progress bars */}
      <div className="grid grid-cols-2 gap-4 text-left">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-sm font-bold text-brand-navy">Process</p>
            <p className="text-lg font-black text-brand-navy">
              {v2.processTotal}<span className="text-sm font-normal text-gray-400">/25</span>
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-blue-400 h-2.5 rounded-full" style={{ width: `${processPct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1.5 text-right">{processPct}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-sm font-bold text-brand-navy">Gold Standard</p>
            <p className="text-lg font-black text-brand-navy">
              {v2.goldStandardTotal}<span className="text-sm font-normal text-gray-400">/30</span>
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-brand-yellow h-2.5 rounded-full" style={{ width: `${gsPct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1.5 text-right">{gsPct}%</p>
        </div>
      </div>

      {/* CTAs */}
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
