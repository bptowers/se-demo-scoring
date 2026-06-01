import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { DemoSession, RagRating } from '../types';
import { Button } from './Button';
import { SeTriggersPanel } from './SeTriggersPanel';
import { ViolationsPanel } from './ViolationsPanel';

const RAG_CONFIG: Record<RagRating, { label: string; color: string }> = {
  GREEN: { label: 'Green', color: 'text-green-700 bg-green-50 border-green-300' },
  AMBER: { label: 'Amber', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  RED:   { label: 'Red',   color: 'text-red-700 bg-red-50 border-red-300' },
};

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

interface CoachingSummaryV2Props {
  session: DemoSession;
  onBack: () => void;
  onViewDetails: () => void;
}

export const CoachingSummaryV2: React.FC<CoachingSummaryV2Props> = ({
  session,
  onBack,
  onViewDetails,
}) => {
  const v2 = session.aiV2!;
  const rag = RAG_CONFIG[v2.ragRating];

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">

      {/* Nav */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:text-brand-yellow transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="bg-brand-navy text-white rounded-xl overflow-hidden shadow-lg">
        <div className="bg-brand-yellow h-1.5 w-full" />
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-brand-yellow text-xs font-bold uppercase tracking-widest mb-1">Coaching Summary — V2</p>
              <h1 className="text-2xl font-black text-white">{session.callDeliveredBy ?? 'Account Executive'}</h1>
              <p className="text-slate-300 text-sm mt-1">{formatDate(session.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-brand-yellow">
                {v2.combinedTotal}<span className="text-xl font-semibold text-slate-400">/55</span>
              </p>
              <span className={`inline-block mt-1 px-3 py-0.5 rounded-full border text-xs font-bold ${rag.color}`}>
                {rag.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Violations — shown first if any exist */}
      <ViolationsPanel violations={v2.violations} />

      {/* What Worked */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-3">What Worked</h2>
        <ul className="space-y-3">
          {v2.whatWorked.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-green-900">
              <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* What to Fix */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">What to Fix — Ranked by Impact</h2>
        <ul className="space-y-3">
          {v2.whatToFix.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-amber-900">
              <span className="text-amber-500 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* One Thing Next Call */}
      <div className="bg-brand-navy text-white rounded-xl p-5">
        <h2 className="text-sm font-bold text-brand-yellow uppercase tracking-wide mb-2">One Thing to Do on Next Call</h2>
        <p className="text-sm text-slate-200 leading-relaxed">{v2.oneThingNextCall}</p>
      </div>

      {/* SE Triggers */}
      <SeTriggersPanel seTriggers={v2.seTriggers} />

      {/* View full scorecard */}
      <div className="flex justify-end pt-2">
        <Button variant="primary" onClick={onViewDetails}>
          View Full Scorecard
        </Button>
      </div>
    </div>
  );
};
