import React, { useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { ChevronDown, ChevronUp, ArrowLeft, Download } from 'lucide-react';
import { Button } from './Button';
import { DemoSession, SCORING_RUBRIC } from '../types';
import {
  getScoreInterpretation,
  getInterpretationLabel,
  getInterpretationColor,
} from '../utils/scoringHelpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const AE_SECTIONS = [
  { key: 'Gold Standard', label: 'Gold Standard', maxPts: 60, color: 'bg-brand-yellow' },
  { key: 'Process',       label: 'Process',       maxPts: 40, color: 'bg-blue-400' },
];

// Short axis labels for the radar chart
const RADAR_LABELS: Record<string, string> = {
  gs_discovery:          'Discovery',
  gs_objection_handling: 'Objections',
  gs_positioning:        'Positioning',
  gs_closing:            'Closing',
  gs_price_as_weapon:    'Pricing',
  gs_roi_quantification: 'ROI',
  ps_opening:            'Opening',
  ps_discovery_gates:    'Gates',
  ps_value_mirror:       'Mirror',
  ps_demo_execution:     'Demo',
  ps_close_next_steps:   'Next Steps',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTotalScore = (session: DemoSession) =>
  session.aiScoring?.scores.reduce((s, c) => s + c.score, 0) ?? 0;

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

const scorePctColor = (pct: number) => {
  if (pct >= 80) return 'text-green-700 bg-green-50 border-green-200';
  if (pct >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

// Renders **bold** markers safely using React elements
const BoldText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i}>{part}</strong>
          : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  );
};

// ─── Radar Chart ──────────────────────────────────────────────────────────────

const CriterionRadar: React.FC<{ session: DemoSession }> = ({ session }) => {
  const data = SCORING_RUBRIC.map(criterion => {
    const score = session.aiScoring?.scores.find(s => s.criterionId === criterion.id)?.score ?? 0;
    return {
      subject: RADAR_LABELS[criterion.id] ?? criterion.name,
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

const CriterionRow: React.FC<{
  criterionId: string;
  name: string;
  score: number;
  maxPoints: number;
  reasoning?: string;
  coaching?: string;
  initialExpanded?: boolean;
}> = ({ name, score, maxPoints, reasoning, coaching, initialExpanded = false }) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const pct = Math.round((score / maxPoints) * 100);
  const color = scorePctColor(pct);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`inline-flex items-center justify-center w-14 text-xs font-bold px-2 py-1 rounded border flex-shrink-0 ${color}`}>
          {score}/{maxPoints}
        </span>
        <span className="flex-1 text-sm font-semibold text-gray-800">{name}</span>
        <span className="text-xs text-gray-400 mr-1">{pct}%</span>
        {expanded
          ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (reasoning || coaching) && (
        <div className="px-4 pb-4 space-y-3 bg-gray-50 border-t border-gray-100">
          {reasoning && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 mt-3">Observation</p>
              <p className="text-sm text-gray-700 leading-relaxed"><BoldText text={reasoning} /></p>
            </div>
          )}
          {coaching && (
            <div>
              <p className="text-xs font-bold text-brand-navy uppercase tracking-wide mb-1">Coaching</p>
              <p className="text-sm text-gray-700 leading-relaxed"><BoldText text={coaching} /></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface AeCallScorecardProps {
  session: DemoSession;
  onBack?: () => void;
  onViewDetails?: () => void;
  expandAll?: boolean;
}

export const AeCallScorecard: React.FC<AeCallScorecardProps> = ({ session, onBack, onViewDetails, expandAll = false }) => {
  const totalScore = getTotalScore(session);
  const interpretation = getScoreInterpretation(totalScore);
  const tierLabel = getInterpretationLabel(interpretation);
  const tierColor = getInterpretationColor(interpretation);
  const scores = session.aiScoring?.scores ?? [];

  // Fallback wins: top 2 criteria by % score, using their reasoning text
  const derivedWins = [...scores]
    .map(s => {
      const c = SCORING_RUBRIC.find(r => r.id === s.criterionId);
      return c ? { pct: s.score / c.maxPoints, text: s.reasoning || `Strong performance on ${c.name}` } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.pct - a!.pct)
    .slice(0, 2)
    .map(x => x!.text);

  // Fallback fixes: bottom 3 criteria by % score, using their coaching text
  const derivedFixes = [...scores]
    .map(s => {
      const c = SCORING_RUBRIC.find(r => r.id === s.criterionId);
      return c ? { pct: s.score / c.maxPoints, text: s.coaching || `Focus on improving ${c.name}` } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.pct - b!.pct)
    .slice(0, 3)
    .map(x => x!.text);

  const effectiveWins  = (session.aiScoring?.topWins?.length  ?? 0) > 0 ? session.aiScoring!.topWins!  : derivedWins;
  const effectiveFixes = (session.aiScoring?.topFixes?.length ?? 0) > 0 ? session.aiScoring!.topFixes! : derivedFixes;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">

      {/* Back button + View Details + Download */}
      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:text-brand-yellow transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <div className="flex items-center gap-3 ml-auto">
          {onViewDetails && (
            <Button variant="secondary" onClick={onViewDetails} className="flex items-center gap-1.5">
              View Detailed Scores
            </Button>
          )}
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
              <p className="text-brand-yellow text-xs font-bold uppercase tracking-widest mb-1">AE Call Scorecard</p>
              <h1 className="text-2xl font-black text-white">{session.callDeliveredBy ?? 'Account Executive'}</h1>
              {session.customerName && (
                <p className="text-slate-300 text-xs mt-0.5">Customer: <span className="font-semibold">{session.customerName}</span></p>
              )}
              <p className="text-slate-300 text-sm mt-1">{formatDate(session.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-brand-yellow">
                {totalScore}<span className="text-xl font-semibold text-slate-400">/100</span>
              </p>
              {session.aiScoring?.vertical && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-white/10 rounded text-xs text-slate-300 font-semibold">
                  {session.aiScoring.vertical}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tier Badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${tierColor}`}>
        {tierLabel}
        <span className="font-normal opacity-70">— {totalScore}/100</span>
      </div>

      {/* Radar Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-brand-navy mb-4">Performance Profile</h2>
        <CriterionRadar session={session} />
        <p className="text-xs text-gray-400 text-center mt-2">
          Each axis shows score as % of maximum. Click criteria below to expand detail.
        </p>
      </div>

      {/* Section Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {AE_SECTIONS.map(({ key, label, maxPts, color }) => {
          const ids = SCORING_RUBRIC.filter(c => c.section === key).map(c => c.id);
          const earned = scores.filter(s => ids.includes(s.criterionId)).reduce((sum, s) => sum + s.score, 0);
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

      {/* Criteria Grid — Gold Standard */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-brand-navy">
          <h2 className="text-sm font-bold text-brand-yellow uppercase tracking-wide">Gold Standard Score — 60 pts</h2>
        </div>
        <div className="p-4 space-y-2">
          {SCORING_RUBRIC.filter(c => c.section === 'Gold Standard').map(criterion => {
            const s = scores.find(sc => sc.criterionId === criterion.id);
            return (
              <CriterionRow
                key={criterion.id}
                criterionId={criterion.id}
                name={criterion.name}
                score={s?.score ?? 0}
                maxPoints={criterion.maxPoints}
                reasoning={s?.reasoning}
                coaching={s?.coaching}
                initialExpanded={expandAll}
              />
            );
          })}
        </div>
      </div>

      {/* Criteria Grid — Process */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-slate-700">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Process Score — 40 pts</h2>
        </div>
        <div className="p-4 space-y-2">
          {SCORING_RUBRIC.filter(c => c.section === 'Process').map(criterion => {
            const s = scores.find(sc => sc.criterionId === criterion.id);
            return (
              <CriterionRow
                key={criterion.id}
                criterionId={criterion.id}
                name={criterion.name}
                score={s?.score ?? 0}
                maxPoints={criterion.maxPoints}
                reasoning={s?.reasoning}
                coaching={s?.coaching}
                initialExpanded={expandAll}
              />
            );
          })}
        </div>
      </div>

      {/* Coach's Summary */}
      {session.aiScoring?.executiveSummary && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-brand-navy mb-3">Coach's Summary</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            <BoldText text={session.aiScoring.executiveSummary} />
          </p>
        </div>
      )}

      {/* Wins & Fixes — always rendered */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-3">Key Wins</h2>
          <ul className="space-y-3">
            {effectiveWins.map((win, i) => (
              <li key={i} className="flex gap-2 text-sm text-green-900">
                <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                <BoldText text={win} />
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Development Focus</h2>
          <ul className="space-y-3">
            {effectiveFixes.map((fix, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-900">
                <span className="text-amber-500 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                <BoldText text={fix} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
