import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { DemoSession } from '../types';
import { Button } from './Button';

interface SeCoachingSummaryProps {
  session: DemoSession;
  onBack: () => void;
  onViewDetails: () => void;
}

export const SeCoachingSummary: React.FC<SeCoachingSummaryProps> = ({
  session,
  onBack,
  onViewDetails,
}) => {
  const evaluation = session.seScoring!.evaluations[0];
  const result = evaluation.overall_result;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:text-brand-yellow transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-brand-navy text-white rounded-xl overflow-hidden shadow-lg">
        <div className="bg-brand-yellow h-1.5 w-full" />
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-brand-yellow text-xs font-bold uppercase tracking-widest mb-1">SE Coaching Summary</p>
              <h1 className="text-2xl font-black text-white">{evaluation.target_se_name || 'Sales Engineer'}</h1>
              <p className="text-slate-300 text-sm mt-1">{result.one_sentence_assessment}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-brand-yellow">
                {result.final_score}<span className="text-xl font-semibold text-slate-400">/100</span>
              </p>
              <span className={`inline-block mt-1 px-3 py-0.5 rounded-full border text-xs font-bold ${
                result.result === 'Pass' ? 'text-green-700 bg-green-50 border-green-300' : 'text-red-700 bg-red-50 border-red-300'
              }`}>
                {result.result}
              </span>
            </div>
          </div>
        </div>
      </div>

      {evaluation.final_manager_summary && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wide mb-2">Manager Summary</h2>
          <p className="text-sm text-slate-700 leading-relaxed">{evaluation.final_manager_summary}</p>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Top Coaching Priority</h2>
        <p className="text-sm text-amber-950 font-semibold">{evaluation.coaching_plan.top_priority}</p>
        {evaluation.coaching_plan.manager_notes && (
          <p className="text-sm text-amber-900 mt-3 leading-relaxed">{evaluation.coaching_plan.manager_notes}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-3">Strengths</h2>
          <ul className="space-y-3">
            {evaluation.strengths.map((item, i) => (
              <li key={i} className="text-sm text-green-950">
                <p className="font-bold">{item.strength}</p>
                <p className="text-green-900 mt-1">{item.evidence}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-3">Improvement Areas</h2>
          <ul className="space-y-3">
            {evaluation.improvement_areas.map((item, i) => (
              <li key={i} className="text-sm text-red-950">
                <p className="font-bold">{i + 1}. {item.improvement_area}</p>
                <p className="text-red-900 mt-1">{item.recommended_behavior}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {evaluation.coaching_plan.recommended_coaching_actions.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wide mb-3">Recommended Coaching Actions</h2>
          <div className="space-y-4">
            {evaluation.coaching_plan.recommended_coaching_actions.map((action, i) => (
              <div key={i} className="border-l-4 border-brand-yellow pl-4">
                <p className="text-sm font-bold text-brand-navy">{action.action}</p>
                <p className="text-sm text-slate-700 mt-1">{action.example_language_or_behavior}</p>
                <p className="text-xs text-slate-500 mt-1">{action.expected_impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="primary" onClick={onViewDetails}>
          View Full Scorecard
        </Button>
      </div>
    </div>
  );
};
