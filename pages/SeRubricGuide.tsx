import React from 'react';
import { BookOpen, CheckCircle, ShieldCheck } from 'lucide-react';
import { SE_SCORING_RUBRIC } from '../types';

const totalPoints = SE_SCORING_RUBRIC.reduce((sum, category) => sum + category.maxPoints, 0);

const scoringBands = [
  { range: '95-100', label: 'Exceptional', description: 'Executive-level SE performance.' },
  { range: '85-94', label: 'Strong', description: 'Professional, relevant, technically sound, and customer-centered.' },
  { range: '75-84', label: 'Acceptable', description: 'Passable, with noticeable coaching opportunities.' },
  { range: '60-74', label: 'Below Standard', description: 'Useful contribution, but unlikely to reliably advance a serious evaluation.' },
  { range: '40-59', label: 'Poor', description: 'Generic, reactive, unclear, or weakly connected to customer needs.' },
  { range: '0-39', label: 'Unacceptable', description: 'Serious performance issues or insufficient evidence.' },
];

export const SeRubricGuide: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-brand-navy text-white rounded-xl overflow-hidden shadow-lg">
          <div className="bg-brand-yellow h-1.5 w-full" />
          <div className="p-6">
            <div className="flex items-center gap-2 text-brand-yellow mb-2">
              <BookOpen size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Private Rubric Reference</span>
            </div>
            <h1 className="text-3xl font-black">SE Demo Scorecard Categories</h1>
            <p className="text-slate-300 max-w-3xl mt-2">
              The SE scorecard totals {totalPoints} points across 10 weighted categories. A final score of 75 or higher is considered passable.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Max Score</p>
            <p className="text-3xl font-black text-brand-navy mt-1">{totalPoints}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Categories</p>
            <p className="text-3xl font-black text-brand-navy mt-1">{SE_SCORING_RUBRIC.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pass Threshold</p>
            <p className="text-3xl font-black text-brand-navy mt-1">75</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-brand-navy">
            <h2 className="text-sm font-bold text-brand-yellow uppercase tracking-wide">Category Weights</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {SE_SCORING_RUBRIC.map((category, index) => {
              const pct = Math.round((category.maxPoints / totalPoints) * 100);
              return (
                <div key={category.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {index + 1}. {category.section}
                      </p>
                      <h3 className="text-lg font-black text-brand-navy mt-1">{category.name}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed mt-1">{category.description}</p>
                    </div>
                    <div className="sm:text-right flex-shrink-0">
                      <p className="text-2xl font-black text-brand-navy">{category.maxPoints}</p>
                      <p className="text-xs font-semibold text-slate-400">{pct}% of score</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-4">
                    <div className="h-full bg-brand-yellow" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wide mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-brand-yellow" />
            Scoring Bands
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scoringBands.map((band) => (
              <div key={band.range} className="border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-brand-navy">{band.label}</p>
                  <span className="text-xs font-black text-slate-500">{band.range}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{band.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 flex items-start gap-3">
          <ShieldCheck className="text-brand-navy flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-slate-600 leading-relaxed">
            This page is visible only to approved rubric administrators. The scoring page remains unchanged for other users.
          </p>
        </div>
      </div>
    </div>
  );
};
