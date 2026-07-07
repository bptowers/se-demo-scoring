import React, { useState } from 'react';
import { CheckCircle, XCircle, FileText, Download } from 'lucide-react';
import { DemoSession, BDR_SCORING_RUBRIC } from '../types';
import { getBdrGrade, getBdrGradeColor } from '../utils/scoringHelpers';
import { updateBdrStage6Checklist } from '../services/firestoreService';
import { Button } from './Button';

// ─── Constants ────────────────────────────────────────────────────────────────

const BDR_STAGES = [
  { key: 'Open',            label: 'Stage 1: Open',             maxPts: 10 },
  { key: 'Create Interest', label: 'Stage 2: Create Interest',  maxPts: 6  },
  { key: 'Discovery',       label: 'Stage 3: Discovery',        maxPts: 10 },
  { key: 'Mirror',          label: 'Stage 4: The Mirror',       maxPts: 8  },
  { key: 'Qualify & Close', label: 'Stage 5: Qualify & Close',  maxPts: 12 },
];

const STAGE6_ITEMS = [
  "Sent within 30 minutes of the call ending — while it's still fresh",
  'References specific pain points from the call — not generic copy',
  'Introduces the AE by name and sector relevance — not just "a member of our team"',
  'Non-obligation framing included — "Nothing to sign. Just 45 minutes."',
  'Calendar invite included directly — not asked to accept separately',
];

const SCORE_LABEL: Record<number, string> = { 0: 'Fail', 1: 'Partial', 2: 'Pass' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTotalScore = (session: DemoSession) =>
  session.aiScoring?.scores.reduce((s, c) => s + c.score, 0) ?? 0;

const getStageScores = (session: DemoSession) =>
  BDR_STAGES.map(({ key, label, maxPts }) => {
    const ids = BDR_SCORING_RUBRIC.filter(c => c.section === key).map(c => c.id);
    const earned = session.aiScoring?.scores
      .filter(s => ids.includes(s.criterionId))
      .reduce((sum, s) => sum + s.score, 0) ?? 0;
    const pct = Math.round((earned / maxPts) * 100);
    return { key, label, earned, maxPts, pct };
  });

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

const behaviourNum = (id: string) => id.replace('bdr_b', 'B');

/** Renders text with **bold** markers safely — no dangerouslySetInnerHTML */
const BoldText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ScoreCircle: React.FC<{ pct: number; score: number }> = ({ pct, score }) => {
  const R = 50;
  const C = 2 * Math.PI * R;
  const filled = (pct / 100) * C;
  const grade = getBdrGrade(score);

  const strokeColor =
    grade === 'A' ? '#16a34a' : grade === 'B' ? '#2563eb' : grade === 'C' ? '#d97706' : '#dc2626';
  const gradeColor = getBdrGradeColor(grade);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg width="128" height="128" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={R} fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeDasharray={`${filled} ${C - filled}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-brand-navy">{pct}%</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Overall</span>
        </div>
      </div>
      <div className={`mt-3 px-4 py-1.5 rounded text-sm font-black border-2 ${gradeColor}`}>
        Grade {grade}
      </div>
      <div className="mt-2 text-sm font-semibold text-brand-navy">{score} / 46 pts</div>
    </div>
  );
};

const GradeScale: React.FC<{ score: number }> = ({ score }) => {
  const grade = getBdrGrade(score);
  const grades: { g: string; label: string; bg: string; text: string }[] = [
    { g: 'D', label: '<40%',    bg: 'bg-red-50 border-red-200',    text: 'text-red-600'   },
    { g: 'C', label: '40–59%', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
    { g: 'B', label: '60–79%', bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-600'  },
    { g: 'A', label: '80–100%',bg: 'bg-green-50 border-green-200', text: 'text-green-600' },
  ];
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Grade Scale</p>
      <div className="flex gap-1.5">
        {grades.map(({ g, label, bg, text }) => (
          <div
            key={g}
            className={`flex-1 border rounded p-1.5 text-center ${bg} ${grade === g ? 'ring-2 ring-offset-1 ring-brand-navy' : ''}`}
          >
            <div className={`text-base font-black ${text}`}>{g}</div>
            <div className={`text-xs ${text} opacity-80`}>{label}</div>
            {grade === g && <div className="text-xs font-bold text-brand-navy mt-0.5">▲ YOU</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const BehaviourCard: React.FC<{
  score: number;
  criterionId: string;
  name: string;
  reasoning?: string;
  span?: boolean;
}> = ({ score, criterionId, name, reasoning, span }) => {
  const borderColor =
    score === 2 ? 'border-l-green-500' : score === 1 ? 'border-l-amber-400' : 'border-l-red-500';
  const badgeBg =
    score === 2 ? 'bg-green-100 text-green-700' :
    score === 1 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-600';

  return (
    <div className={`bg-gray-50 rounded-lg p-3 flex items-start gap-3 border-l-4 ${borderColor} ${span ? 'col-span-2' : ''}`}>
      <span className="text-xs font-bold text-gray-400 w-6 flex-shrink-0 pt-0.5">
        {behaviourNum(criterionId)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">{name}</p>
        {reasoning && (
          <p className="text-xs text-gray-500 italic mt-1.5 leading-relaxed">{reasoning}</p>
        )}
      </div>
      <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded ${badgeBg}`}>
        {SCORE_LABEL[score]}
      </span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface BdrCallScorecardProps {
  session: DemoSession;
  isManager?: boolean;
  onBack?: () => void;
}

export const BdrCallScorecard: React.FC<BdrCallScorecardProps> = ({
  session,
  isManager = false,
  onBack,
}) => {
  const ai = session.aiScoring;
  const totalScore = getTotalScore(session);
  const pct = Math.round((totalScore / 46) * 100);
  const stageScores = getStageScores(session);

  const [stage6, setStage6] = useState<boolean[]>(
    session.stage6Checklist ?? Array(5).fill(false)
  );
  const [savingStage6, setSavingStage6] = useState(false);

  const handleStage6Toggle = async (i: number) => {
    const updated = stage6.map((v, idx) => (idx === i ? !v : v));
    setStage6(updated);
    setSavingStage6(true);
    try {
      await updateBdrStage6Checklist(session.id, updated);
    } catch (e) {
      console.error('Failed to save Stage 6 checklist', e);
    } finally {
      setSavingStage6(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-brand-navy px-6 py-5 flex items-center justify-between border-b-4 border-brand-yellow">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-brand-yellow" />
            <div>
              <h1 className="text-xl font-black text-white tracking-wide uppercase">BDR Call Scorecard</h1>
              <p className="text-xs text-brand-yellow font-medium tracking-widest uppercase mt-0.5">
                Gold Standard Assessment Framework
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => window.print()} className="text-white border-white/30 hover:bg-white/10">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
            {onBack && (
              <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10">
                ← Back
              </Button>
            )}
          </div>
        </div>

        {/* ── Meta Bar ── */}
        <div className="bg-slate-800 px-6 py-4 flex flex-wrap gap-6 items-center border-b-2 border-orange-500">
          {([
            { label: 'BDR Rep',  value: session.callDeliveredBy ?? '—' },
            { label: 'Customer', value: session.customerName ?? ai?.prospectCompany ?? '—' },
            { label: 'Contact',  value: ai?.contactName ?? '—' },
            { label: 'Duration', value: ai?.callDuration ?? '—' },
            { label: 'Date',     value: formatDate(session.createdAt) },
          ] as { label: string; value: string }[]).map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">{label}</span>
              <span className="text-sm font-semibold text-white">{value}</span>
            </div>
          ))}
          <div className="ml-auto">
            {ai?.demoBooked ? (
              <span className="inline-flex items-center gap-2 bg-brand-yellow text-brand-navy px-4 py-1.5 rounded font-black text-sm uppercase tracking-wide">
                <CheckCircle size={14} /> Demo Booked
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded font-black text-sm uppercase tracking-wide">
                <XCircle size={14} /> No Demo
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-8">

          {/* ── Score Overview ── */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
            <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center border border-gray-100">
              <ScoreCircle pct={pct} score={totalScore} />
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Performance by Stage</p>
              <div className="space-y-3">
                {stageScores.map(({ key, label, earned, maxPts, pct: sPct }, i) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-navy flex items-center justify-center text-xs font-black text-brand-yellow flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-36 flex-shrink-0">
                      {label.replace(/^Stage \d+: /, '')}
                    </span>
                    <div className="flex-1 h-5 bg-gray-200 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${sPct >= 80 ? 'bg-green-500' : sPct >= 60 ? 'bg-blue-500' : sPct >= 40 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${sPct}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-10 text-right flex-shrink-0 ${sPct >= 80 ? 'text-green-600' : sPct >= 60 ? 'text-blue-600' : sPct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {sPct}%
                    </span>
                    <span className="text-xs text-gray-400 w-14 flex-shrink-0">{earned}/{maxPts} pts</span>
                  </div>
                ))}
              </div>
              <GradeScale score={totalScore} />
            </div>
          </div>

          {/* ── Legend ── */}
          <div className="flex flex-wrap gap-6 justify-center py-1">
            {[
              { dot: 'bg-green-500', label: 'Pass — 2 pts (demonstrated fully)' },
              { dot: 'bg-amber-400', label: 'Partial — 1 pt (present but inconsistent)' },
              { dot: 'bg-red-500',   label: 'Fail — 0 pts (absent or ineffective)' },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-600">
                <div className={`w-3 h-3 rounded-full ${dot}`} />
                {label}
              </div>
            ))}
          </div>

          {/* ── 23 Behaviours Grid ── */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-black text-brand-yellow uppercase tracking-widest">
                23 Behaviours — Detailed Scoring
              </h2>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="space-y-4">
              {BDR_STAGES.map(({ key, label }) => {
                const criteria = BDR_SCORING_RUBRIC.filter(c => c.section === key);
                const stageData = stageScores.find(s => s.key === key)!;

                return (
                  <div key={key}>
                    <div className="col-span-2 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider px-3 py-2 rounded mb-2">
                      {label} &nbsp;·&nbsp; {stageData.earned}/{stageData.maxPts} pts &nbsp;·&nbsp; {stageData.pct}%
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {criteria.map((criterion, idx) => {
                        const scoreEntry = ai?.scores.find(s => s.criterionId === criterion.id);
                        const scoreVal = scoreEntry?.score ?? 0;
                        const isLastOdd = criteria.length % 2 !== 0 && idx === criteria.length - 1;
                        return (
                          <BehaviourCard
                            key={criterion.id}
                            criterionId={criterion.id}
                            name={criterion.name}
                            score={scoreVal}
                            reasoning={scoreEntry?.reasoning}
                            span={isLastOdd}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Coach's Summary ── */}
          {ai?.executiveSummary && (
            <section>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-black text-brand-yellow uppercase tracking-widest">Coach's Summary</h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="bg-blue-50 border-l-4 border-brand-navy rounded-lg p-5">
                <p className="text-xs font-bold text-brand-navy uppercase tracking-wider mb-2">
                  📋 Manager Note — {session.callDeliveredBy ?? 'BDR Rep'} · {formatDate(session.createdAt)}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{ai.executiveSummary}</p>
              </div>
            </section>
          )}

          {/* ── Key Wins & Development Focus ── */}
          {((ai?.topWins?.length ?? 0) > 0 || (ai?.topFixes?.length ?? 0) > 0) && (
            <section>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-black text-brand-yellow uppercase tracking-widest">
                  Key Wins &amp; Development Focus
                </h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                  <p className="text-xs font-black text-green-700 uppercase tracking-wider mb-3">✓ Key Wins</p>
                  <ul className="space-y-2.5">
                    {(ai?.topWins ?? []).map((win, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">→</span>
                        <BoldText text={win} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                  <p className="text-xs font-black text-orange-700 uppercase tracking-wider mb-3">! Development Focus</p>
                  <ul className="space-y-2.5">
                    {(ai?.topFixes ?? []).map((fix, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-orange-500 mt-0.5 flex-shrink-0">▶</span>
                        <BoldText text={fix} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* ── Stage 6: Follow-Up Invite (Manager only) ── */}
          {isManager && (
            <section>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-black text-brand-yellow uppercase tracking-widest">
                  Stage 6: Follow-Up Invite — Manager Check-Off
                </h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="border border-gray-200 rounded-xl p-5 bg-slate-50 border-t-4 border-t-slate-400">
                <p className="text-sm font-bold text-slate-600 mb-1">
                  Stage 6: The Follow-Up Invite (Not included in score)
                </p>
                <p className="text-xs text-slate-400 italic mb-4 pb-4 border-b border-gray-200">
                  Verify each item against HubSpot / email record. Excluded from the scored total of 46 pts.
                  {savingStage6 && <span className="ml-2 text-blue-500 not-italic font-medium">Saving…</span>}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {STAGE6_ITEMS.map((item, i) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stage6[i] ?? false}
                        onChange={() => handleStage6Toggle(i)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-400 accent-brand-navy cursor-pointer flex-shrink-0"
                      />
                      <span className={`text-sm leading-snug transition-colors ${stage6[i] ? 'text-green-700 line-through opacity-60' : 'text-gray-700'}`}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </section>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="bg-brand-navy px-6 py-3 flex items-center justify-between border-t border-white/10">
          <span className="text-xs text-slate-400">
            Simpro Group BDR Gold Standard · Confidential Coaching Document · {formatDate(session.createdAt)}
          </span>
          <span className="text-xs font-semibold text-brand-yellow">
            Score: {totalScore}/46 pts · Grade {getBdrGrade(totalScore)} · {ai?.demoBooked ? 'Demo Booked ✓' : 'No Demo'}
          </span>
        </div>

      </div>
    </div>
  );
};
