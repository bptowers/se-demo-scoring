import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { DemoSession } from '../types';
import { Button } from './Button';
import { SeCategoryRadar } from './SeCategoryRadar';
import { SeCoachingSignalsPanel } from './SeCoachingSignalsPanel';

const scoreColor = (pct: number) => {
  if (pct >= 80) return 'text-green-700 bg-green-50 border-green-200';
  if (pct >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

const CategoryRow: React.FC<{
  category: string;
  score: number;
  maxPoints: number;
  rating: string;
  rationale: string;
  positiveEvidence: string[];
  negativeEvidence: string[];
  coachingNote: string;
  initialExpanded?: boolean;
}> = ({
  category,
  score,
  maxPoints,
  rating,
  rationale,
  positiveEvidence,
  negativeEvidence,
  coachingNote,
  initialExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const pct = Math.round((score / maxPoints) * 100);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`inline-flex items-center justify-center w-14 text-xs font-bold px-2 py-1 rounded border flex-shrink-0 ${scoreColor(pct)}`}>
          {score}/{maxPoints}
        </span>
        <span className="flex-1 text-sm font-semibold text-gray-800">{category}</span>
        <span className="text-xs font-semibold text-gray-400 mr-1">{rating}</span>
        {expanded
          ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 bg-gray-50 border-t border-gray-100">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 mt-3">Rationale</p>
            <p className="text-sm text-gray-700 leading-relaxed">{rationale}</p>
          </div>

          {positiveEvidence.length > 0 && (
            <div>
              <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Positive Evidence</p>
              <ul className="space-y-1">
                {positiveEvidence.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 leading-relaxed">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {negativeEvidence.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Gaps</p>
              <ul className="space-y-1">
                {negativeEvidence.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 leading-relaxed">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {coachingNote && (
            <div className="bg-brand-yellow/10 border-l-4 border-brand-yellow rounded-r-lg p-3">
              <p className="text-xs font-bold text-brand-navy uppercase tracking-wide mb-1">Coaching Note</p>
              <p className="text-sm text-brand-navy leading-relaxed">{coachingNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SeCallScorecardProps {
  session: DemoSession;
  onBack?: () => void;
  expandAll?: boolean;
}

export const SeCallScorecard: React.FC<SeCallScorecardProps> = ({
  session,
  onBack,
  expandAll = false,
}) => {
  const scorecard = session.seScoring!;
  const evaluation = scorecard.evaluations[0];
  const result = evaluation.overall_result;
  const callSummary = scorecard.call_summary;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:text-brand-yellow transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <div className="ml-auto">
          <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="bg-brand-navy text-white rounded-xl overflow-hidden shadow-lg">
        <div className="bg-brand-yellow h-1.5 w-full" />
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-brand-yellow text-xs font-bold uppercase tracking-widest mb-1">SE Demo Scorecard</p>
              <h1 className="text-2xl font-black text-white">{evaluation.target_se_name || 'Sales Engineer'}</h1>
              {session.customerName && (
                <p className="text-slate-300 text-xs mt-0.5">Customer: <span className="font-semibold">{session.customerName}</span></p>
              )}
              <p className="text-slate-300 text-sm mt-1">{formatDate(session.createdAt)}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-block px-2 py-0.5 bg-white/10 rounded text-xs text-slate-300 font-semibold">
                  {callSummary.call_type || 'Unknown call type'}
                </span>
                <span className="inline-block px-2 py-0.5 bg-white/10 rounded text-xs text-slate-300 font-semibold">
                  Confidence: {callSummary.confidence_level}
                </span>
                <span className="inline-block px-2 py-0.5 bg-white/10 rounded text-xs text-slate-300 font-semibold">
                  Transcript: {callSummary.transcript_quality}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-brand-yellow">
                {result.final_score}<span className="text-xl font-semibold text-slate-400">/100</span>
              </p>
              <span className={`inline-block mt-1 px-3 py-0.5 rounded-full border text-xs font-bold ${
                result.result === 'Pass' ? 'text-green-700 bg-green-50 border-green-300' : 'text-red-700 bg-red-50 border-red-300'
              }`}>
                {result.result} · {result.performance_band}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wide mb-2">Customer Objective</h2>
          <p className="text-sm text-slate-700 leading-relaxed">{callSummary.customer_objective || 'Not Observed'}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wide mb-2">SE Objective</h2>
          <p className="text-sm text-slate-700 leading-relaxed">{callSummary.se_objective || 'Not Observed'}</p>
        </div>
      </div>

      {result.caps_applied.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-3">Hard Caps Applied</h2>
          <div className="space-y-2">
            {result.caps_applied.map((cap, i) => (
              <div key={i} className="text-sm text-red-950">
                <span className="font-bold">Max {cap.cap}:</span> {cap.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      <SeCategoryRadar categories={evaluation.category_scores} title="Category Score Radar" />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-brand-navy">
          <h2 className="text-sm font-bold text-brand-yellow uppercase tracking-wide">Category Scores — 100 pts</h2>
        </div>
        <div className="p-4 space-y-2">
          {evaluation.category_scores.map((category) => (
            <CategoryRow
              key={category.category}
              category={category.category}
              score={category.points_awarded}
              maxPoints={category.max_points}
              rating={category.rating}
              rationale={category.rationale}
              positiveEvidence={category.positive_evidence}
              negativeEvidence={category.negative_evidence_or_gaps}
              coachingNote={category.coaching_note}
              initialExpanded={expandAll}
            />
          ))}
        </div>
      </div>

      <SeCoachingSignalsPanel evaluation={evaluation} />

      {evaluation.deal_risk_observations.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wide mb-3">Deal Risk Observations</h2>
          <div className="space-y-4">
            {evaluation.deal_risk_observations.map((risk, i) => (
              <div key={i} className="border-l-4 border-red-300 pl-4">
                <p className="text-sm font-bold text-brand-navy">{risk.risk}</p>
                <p className="text-sm text-slate-700 mt-1">{risk.evidence}</p>
                <p className="text-xs text-slate-500 mt-1">{risk.recommended_follow_up}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {evaluation.notable_moments.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wide mb-3">Notable Moments</h2>
          <div className="space-y-3">
            {evaluation.notable_moments.map((moment, i) => (
              <div key={i} className="text-sm border border-gray-100 rounded-lg p-3">
                <p className="font-bold text-brand-navy">{moment.moment_type} · {moment.speaker}</p>
                <p className="text-slate-700 mt-1">{moment.evidence}</p>
                <p className="text-slate-500 mt-1">{moment.interpretation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
