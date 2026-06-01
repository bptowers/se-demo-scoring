import React, { useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { ChevronDown, ChevronUp, ArrowLeft, Download } from 'lucide-react';
import { Button } from './Button';
import { DemoSession, AE_V2_SCORING_RUBRIC, RagRating } from '../types';
import { SeTriggersPanel } from './SeTriggersPanel';
import { ViolationsPanel } from './ViolationsPanel';

// ─── Constants ────────────────────────────────────────────────────────────────

const V2_SECTIONS = [
  { key: 'Process',       label: 'Process',       maxPts: 25, color: 'bg-blue-400' },
  { key: 'Gold Standard', label: 'Gold Standard', maxPts: 30, color: 'bg-brand-yellow' },
];

const RAG_CONFIG: Record<RagRating, { label: string; color: string }> = {
  GREEN: { label: 'Green — Ready to Advance',  color: 'text-green-700 bg-green-50 border-green-300' },
  AMBER: { label: 'Amber — Needs Development', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  RED:   { label: 'Red — Critical Gaps',        color: 'text-red-700 bg-red-50 border-red-300' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

const scorePctColor = (pct: number) => {
  if (pct >= 80) return 'text-green-700 bg-green-50 border-green-200';
  if (pct >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

// ─── Radar Chart ──────────────────────────────────────────────────────────────

const CriterionRadarV2: React.FC<{ session: DemoSession }> = ({ session }) => {
  const data = AE_V2_SCORING_RUBRIC.map(criterion => {
    const score = session.aiV2?.scores.find(s => s.criterionId === criterion.id)?.score ?? 0;
    return {
      subject: criterion.id,
      score: Math.round((score / criterion.maxPoints) * 100),
      fullMark: 100,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#1e3a5f"
          fill="#1e3a5f"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, 'Score']}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

// ─── Criterion Row ────────────────────────────────────────────────────────────

const CriterionRowV2: React.FC<{
  criterionId: string;
  name: string;
  score: number;
  maxPoints: number;
  rationale?: string;
  evidence?: string;
  initialExpanded?: boolean;
}> = ({ name, score, maxPoints, rationale, evidence, initialExpanded = false }) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const pct = Math.round((score / maxPoints) * 100);
  const color = scorePctColor(pct);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`inline-flex items-center justify-center w-12 text-xs font-bold px-2 py-1 rounded border flex-shrink-0 ${color}`}>
          {score}/{maxPoints}
        </span>
        <span className="flex-1 text-sm font-semibold text-gray-800">{name}</span>
        <span className="text-xs text-gray-400 mr-1">{pct}%</span>
        {expanded
          ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (rationale || evidence) && (
        <div className="px-4 pb-4 space-y-3 bg-gray-50 border-t border-gray-100">
          {rationale && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 mt-3">Rationale</p>
              <p className="text-sm text-gray-700 leading-relaxed">{rationale}</p>
            </div>
          )}
          {evidence && (
            <div>
              <p className="text-xs font-bold text-brand-navy uppercase tracking-wide mb-1">Evidence</p>
              <blockquote className="text-sm text-gray-600 italic leading-relaxed border-l-2 border-brand-navy pl-3">
                {evidence}
              </blockquote>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AeCallScorecardV2Props {
  session: DemoSession;
  onBack?: () => void;
  expandAll?: boolean;
}

export const AeCallScorecardV2: React.FC<AeCallScorecardV2Props> = ({
  session,
  onBack,
  expandAll = false,
}) => {
  const v2 = session.aiV2!;
  const rag = RAG_CONFIG[v2.ragRating];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">

      {/* Back button + Download */}
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

      {/* Header */}
      <div className="bg-brand-navy text-white rounded-xl overflow-hidden shadow-lg">
        <div className="bg-brand-yellow h-1.5 w-full" />
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-brand-yellow text-xs font-bold uppercase tracking-widest mb-1">AE Call Scorecard — V2</p>
              <h1 className="text-2xl font-black text-white">{session.callDeliveredBy ?? 'Account Executive'}</h1>
              <p className="text-slate-300 text-sm mt-1">{formatDate(session.createdAt)}</p>
              {(v2.callType || v2.region) && (
                <div className="flex gap-2 mt-2">
                  {v2.callType && (
                    <span className="inline-block px-2 py-0.5 bg-white/10 rounded text-xs text-slate-300 font-semibold">
                      {v2.callType}
                    </span>
                  )}
                  {v2.region && (
                    <span className="inline-block px-2 py-0.5 bg-white/10 rounded text-xs text-slate-300 font-semibold">
                      {v2.region}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-brand-yellow">
                {v2.combinedTotal}<span className="text-xl font-semibold text-slate-400">/55</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RAG Badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${rag.color}`}>
        {rag.label}
        <span className="font-normal opacity-70">— {v2.combinedTotal}/55</span>
      </div>

      {/* Violations (prominent at top) */}
      <ViolationsPanel violations={v2.violations} />

      {/* Radar Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-brand-navy mb-4">Performance Profile</h2>
        <CriterionRadarV2 session={session} />
        <p className="text-xs text-gray-400 text-center mt-2">
          Each axis shows score as % of maximum (5 pts). Click criteria below to expand detail.
        </p>
      </div>

      {/* Section Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {V2_SECTIONS.map(({ key, label, maxPts, color }) => {
          const ids = AE_V2_SCORING_RUBRIC.filter(c => c.section === key).map(c => c.id);
          const earned = v2.scores.filter(s => ids.includes(s.criterionId)).reduce((sum, s) => sum + s.score, 0);
          const pct = Math.round((earned / maxPts) * 100);
          return (
            <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-sm font-bold text-brand-navy">{label}</p>
                <p className="text-lg font-black text-brand-navy">
                  {earned}<span className="text-sm font-normal text-gray-400">/{maxPts}</span>
                </p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className={`${color} h-2.5 rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1.5 text-right">{pct}%</p>
            </div>
          );
        })}
      </div>

      {/* Process Criteria */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-slate-700">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Process Score — 25 pts</h2>
        </div>
        <div className="p-4 space-y-2">
          {AE_V2_SCORING_RUBRIC.filter(c => c.section === 'Process').map(criterion => {
            const s = v2.scores.find(sc => sc.criterionId === criterion.id);
            return (
              <CriterionRowV2
                key={criterion.id}
                criterionId={criterion.id}
                name={criterion.name}
                score={s?.score ?? 0}
                maxPoints={criterion.maxPoints}
                rationale={s?.rationale}
                evidence={s?.evidence}
                initialExpanded={expandAll}
              />
            );
          })}
        </div>
      </div>

      {/* Gold Standard Criteria */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-brand-navy">
          <h2 className="text-sm font-bold text-brand-yellow uppercase tracking-wide">Gold Standard Score — 30 pts</h2>
        </div>
        <div className="p-4 space-y-2">
          {AE_V2_SCORING_RUBRIC.filter(c => c.section === 'Gold Standard').map(criterion => {
            const s = v2.scores.find(sc => sc.criterionId === criterion.id);
            return (
              <CriterionRowV2
                key={criterion.id}
                criterionId={criterion.id}
                name={criterion.name}
                score={s?.score ?? 0}
                maxPoints={criterion.maxPoints}
                rationale={s?.rationale}
                evidence={s?.evidence}
                initialExpanded={expandAll}
              />
            );
          })}
        </div>
      </div>

      {/* SE Triggers */}
      <SeTriggersPanel seTriggers={v2.seTriggers} />

      {/* Coaching Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">What to Fix</h2>
          <ul className="space-y-3">
            {v2.whatToFix.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-900">
                <span className="text-amber-500 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* One Thing Next Call */}
      <div className="bg-brand-navy text-white rounded-xl p-6">
        <h2 className="text-sm font-bold text-brand-yellow uppercase tracking-wide mb-2">One Thing to Do on Next Call</h2>
        <p className="text-sm text-slate-200 leading-relaxed">{v2.oneThingNextCall}</p>
      </div>
    </div>
  );
};
