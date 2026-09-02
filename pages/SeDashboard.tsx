import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Phone, BarChart2, TrendingUp, Award, ExternalLink, History, Users, Trash2, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserEvaluations, getSeSessionsForManager, getSeSessionsByName, deleteEvaluation } from '../services/firestoreService';
import { deleteEvaluationAsManager } from '../services/adminService';
import {
  getScoreInterpretation, getInterpretationLabel, getInterpretationColor,
  canonicalSeCategory, CANONICAL_SE_CATEGORY_ORDER,
  getSessionValueArticulation, getAverageValueArticulation, VALUE_ARTICULATION_MAX,
} from '../utils/scoringHelpers';
import { DemoSession, SCORING_RUBRIC } from '../types';
import { AeSessionScorecard } from '../components/AeSessionScorecard';
import { SeCallScorecard } from '../components/SeCallScorecard';
import { SAMPLE_SE_SESSION } from '../utils/sampleSeSession';
import { getManagerConfig, getDirectReports, ALL_SES_SENTINEL } from '../config/managerConfig';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getSessionScore = (s: DemoSession): number =>
  s.seScoring?.evaluations?.[0]
    ? s.seScoring.evaluations[0].overall_result.final_score
    : s.aiV2 ? s.aiV2.combinedTotal : (s.aiScoring?.scores.reduce((sum, score) => sum + score.score, 0) ?? 0);

const getMaxScore = (s: DemoSession): number => s.aiV2 ? 55 : 100;

const getSessionScorePct = (s: DemoSession): number =>
  Math.round((getSessionScore(s) / getMaxScore(s)) * 100);

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 8000): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Dashboard data request timed out')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

const formatDateShort = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d);

/** How many weeks of history the weekly trend charts cover. */
const TREND_WEEKS = 12;

/**
 * Monday 00:00 (local) of the week containing `d`.
 *
 * Weekly buckets rather than one point per call: calls arrive in bursts — four in a single
 * afternoon, then nothing for days — so a per-call axis compresses months of history into
 * whatever few days happened to be busiest, and reads as a trend when it is really just
 * call ordering.
 */
const startOfWeek = (d: Date): Date => {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (out.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0
  out.setDate(out.getDate() - mondayOffset);
  return out;
};

/** Adds whole weeks via calendar arithmetic so DST transitions don't drift the boundary. */
const addWeeks = (d: Date, weeks: number): Date => {
  const out = new Date(d);
  out.setDate(out.getDate() + weeks * 7);
  return out;
};

const mean = (xs: number[]): number => Math.round(xs.reduce((a, c) => a + c, 0) / xs.length);

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, sub, icon, color }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex items-start gap-4">
    <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-brand-navy">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const TierBadge: React.FC<{ session: DemoSession }> = ({ session }) => {
  if (session.seScoring?.evaluations?.[0]) {
    const result = session.seScoring.evaluations[0].overall_result;
    const colors = result.result === 'Pass'
      ? 'text-green-700 bg-green-50 border-green-200'
      : 'text-red-700 bg-red-50 border-red-200';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${colors}`}>{result.result}</span>;
  }
  if (session.aiV2) {
    const rag = session.aiV2.ragRating;
    const colors = rag === 'GREEN' ? 'text-green-700 bg-green-50 border-green-200'
      : rag === 'AMBER' ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-red-700 bg-red-50 border-red-200';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${colors}`}>{rag}</span>;
  }
  const score = getSessionScore(session);
  const interp = getScoreInterpretation(score);
  const color = getInterpretationColor(interp);
  const label = getInterpretationLabel(interp);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
      {label}
    </span>
  );
};

// ─── Trend Chart ──────────────────────────────────────────────────────────────

const TrendChart: React.FC<{ sessions: DemoSession[] }> = ({ sessions }) => {
  const data = [...sessions]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(-10)
    .map(s => ({
      date: formatDateShort(s.createdAt),
      score: getSessionScorePct(s),
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No scored sessions yet — submit a call to see your trend.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} width={30} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(v: number) => [`${v}/100`, 'Score']}
        />
        <ReferenceLine y={75} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'Pass', fontSize: 10, fill: '#16a34a', position: 'insideTopRight' }} />
        <ReferenceLine y={40} stroke="#dc2626" strokeDasharray="4 2" label={{ value: 'Critical', fontSize: 10, fill: '#dc2626', position: 'insideTopRight' }} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#1e3a5f"
          strokeWidth={2.5}
          dot={{ fill: '#1e3a5f', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ─── SE Comparison Chart ─────────────────────────────────────────────────────

interface SeComparisonRow {
  name: string;
  average: number;
  latest: number;
  count: number;
}

const SeComparisonChart: React.FC<{ sessions: DemoSession[]; seNames: string[] }> = ({ sessions, seNames }) => {
  const data: SeComparisonRow[] = seNames
    .map(name => {
      const seSessions = [...sessions.filter(s => s.callDeliveredBy === name)]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (seSessions.length === 0) return null;
      const scores = seSessions.map(s => getSessionScorePct(s));
      const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const latest = getSessionScorePct(seSessions[0]);
      return { name, average, latest, count: seSessions.length };
    })
    .filter((d): d is SeComparisonRow => d !== null)
    .sort((a, b) => b.average - a.average);

  if (data.length < 2) return null;

  const chartHeight = Math.max(200, data.length * 44 + 40);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <ComposedChart layout="vertical" data={data} margin={{ top: 10, right: 50, bottom: 5, left: 110 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: '#374151' }}
          width={105}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value: number, name: string) => [
            `${value}%`,
            name === 'average' ? 'Avg Score' : 'Latest Score',
          ]}
        />
        <ReferenceLine x={75} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'Pass', fontSize: 10, fill: '#16a34a', position: 'insideTopRight' }} />
        <ReferenceLine x={40} stroke="#dc2626" strokeDasharray="4 2" />
        <Bar dataKey="average" name="average" fill="#1e3a5f" radius={[0, 3, 3, 0]} barSize={18} />
        <Line
          type="monotone"
          dataKey="latest"
          name="latest"
          stroke="transparent"
          strokeWidth={0}
          dot={{ fill: '#ffc20e', r: 5, stroke: '#1e3a5f', strokeWidth: 1.5 }}
          activeDot={{ r: 7 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// ─── AE Criterion Radar ───────────────────────────────────────────────────────

const CRITERION_SHORT_LABELS: Record<string, string> = {
  gs_discovery:           'Discovery',
  gs_objection_handling:  'Obj. Handling',
  gs_positioning:         'Positioning',
  gs_closing:             'Closing',
  gs_price_as_weapon:     'Price as Weapon',
  gs_roi_quantification:  'ROI',
  ps_opening:             'Opening',
  ps_discovery_gates:     'Discovery Gates',
  ps_value_mirror:        'Value Mirror',
  ps_demo_execution:      'Demo Exec.',
  ps_close_next_steps:    'Close & Next Steps',
};

const getBarColor = (pct: number) => {
  if (pct >= 85) return 'bg-green-500';
  if (pct >= 75) return 'bg-brand-yellow';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const CriterionRadar: React.FC<{ sessions: DemoSession[] }> = ({ sessions }) => {
  // Support both SE rubric (seScoring) and AE rubric (aiScoring) sessions
  const seSessions = sessions.filter(s => !!s.seScoring);
  const aiSessions = sessions.filter(s => !!s.aiScoring);
  const qualifyingSessions = seSessions.length >= aiSessions.length ? seSessions : aiSessions;
  const useSeRubric = qualifyingSessions === seSessions;

  if (qualifyingSessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No scored sessions yet.
      </div>
    );
  }

  // Build radar data — aggregate avg % of max per criterion across sessions
  const radarData = useSeRubric
    ? (() => {
        // SE rubric: aggregate from seScoring.evaluations[0].category_scores
        const categoryMap = new Map<string, { total: number; count: number; max: number }>();
        for (const s of seSessions) {
          const cats = s.seScoring?.evaluations?.[0]?.category_scores ?? [];
          for (const cat of cats) {
            const prev = categoryMap.get(cat.category) ?? { total: 0, count: 0, max: cat.max_points };
            categoryMap.set(cat.category, {
              total: prev.total + cat.points_awarded,
              count: prev.count + 1,
              max: cat.max_points,
            });
          }
        }
        return Array.from(categoryMap.entries()).map(([cat, v]) => ({
          label: cat.length > 18 ? cat.split(' ').slice(0, 2).join(' ') : cat,
          fullName: cat,
          pct: v.max > 0 ? Math.round((v.total / v.count / v.max) * 100) : 0,
        }));
      })()
    : SCORING_RUBRIC.map(criterion => {
        const scores = aiSessions
          .map(s => s.aiScoring!.scores.find(sc => sc.criterionId === criterion.id))
          .filter((sc): sc is NonNullable<typeof sc> => !!sc);
        const avgPct = scores.length > 0
          ? Math.round(scores.reduce((sum, sc) => sum + (sc.score / criterion.maxPoints) * 100, 0) / scores.length)
          : 0;
        return {
          label: CRITERION_SHORT_LABELS[criterion.id] ?? criterion.name,
          fullName: criterion.name,
          pct: avgPct,
        };
      });

  const gaps = [...radarData].sort((a, b) => a.pct - b.pct).slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-6">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Avg score"
            dataKey="pct"
            stroke="#1e3a5f"
            fill="#ffc20e"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number, _name: string, item: any) => [
              `${value}%`,
              item.payload.fullName,
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Biggest Gaps</h3>
        <div className="space-y-3">
          {gaps.map(item => (
            <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-bold text-brand-navy leading-tight">{item.fullName}</p>
                <span className="text-xs font-black text-slate-600 ml-2 flex-shrink-0">{item.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white overflow-hidden border border-slate-100">
                <div className={`h-full ${getBarColor(item.pct)}`} style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Category Heatmap ─────────────────────────────────────────────────────────

const SE_CATEGORY_SHORT: Record<string, string> = {
  'Customer Context and Discovery':                            'Discovery',
  'Demo Relevance and Storyline':                             'Demo Relevance',
  'Demo Relevance and Value Connection':                      'Demo Relevance',
  'Product and Technical Credibility':                        'Tech Credibility',
  'Operational Fit and Adoption Readiness':                   'Ops Fit',
  'Value and Business Impact':                                'Value & Impact',
  'Customer Engagement and Active Listening':                 'Engagement',
  'Buyer-Centric Demo Language':                              'Buyer Language',
  'Communication and Executive Presence':                     'Exec. Presence',
  'Objection, Concern, and Risk Handling':                    'Objections',
  'Call Support, Collaboration, and Technical Follow-through':'Collaboration',
  'Call Leadership, Collaboration, and Next Steps':           'Collaboration',
};

const HEATMAP_CELL_W = 58;
const HEATMAP_NAME_W = 130;

const getCellBg = (pct: number | null): string => {
  if (pct === null) return '#f8fafc';
  if (pct >= 85) return '#dcfce7';
  if (pct >= 75) return '#fef9c3';
  if (pct >= 60) return '#fed7aa';
  return '#fecaca';
};

const getCellTextColor = (pct: number | null): string => {
  if (pct === null) return '#94a3b8';
  if (pct >= 85) return '#14532d';
  if (pct >= 75) return '#713f12';
  if (pct >= 60) return '#7c2d12';
  return '#7f1d1d';
};

const CategoryHeatmap: React.FC<{ sessions: DemoSession[]; seNames: string[] }> = ({ sessions, seNames }) => {
  const seSessions = sessions.filter(s => !!s.seScoring?.evaluations?.[0]?.category_scores?.length);
  if (seSessions.length === 0 || seNames.length < 2) return null;

  // Normalise old category names to their current equivalents before collecting
  const seenCats = new Set<string>();
  for (const s of seSessions) {
    for (const c of s.seScoring!.evaluations[0].category_scores) {
      seenCats.add(canonicalSeCategory(c.category));
    }
  }
  const categories = CANONICAL_SE_CATEGORY_ORDER.filter(c => seenCats.has(c));

  const cellData: Record<string, Record<string, number | null>> = {};
  for (const name of seNames) {
    cellData[name] = {};
    const forSe = seSessions.filter(s => s.callDeliveredBy === name);
    for (const cat of categories) {
      const rows = forSe.flatMap(s =>
        s.seScoring!.evaluations[0].category_scores.filter(
          c => canonicalSeCategory(c.category) === cat
        )
      );
      cellData[name][cat] = rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + (r.max_points > 0 ? r.points_awarded / r.max_points : 0), 0) / rows.length * 100)
        : null;
    }
  }

  const visibleNames = seNames.filter(n => Object.values(cellData[n]).some(v => v !== null));
  if (visibleNames.length < 2 || categories.length === 0) return null;

  const tableW = HEATMAP_NAME_W + categories.length * HEATMAP_CELL_W;

  return (
    <div className="overflow-x-auto">
      <table style={{ tableLayout: 'fixed', borderCollapse: 'collapse', width: tableW, minWidth: tableW }}>
        <colgroup>
          <col style={{ width: HEATMAP_NAME_W }} />
          {categories.map(cat => <col key={cat} style={{ width: HEATMAP_CELL_W }} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: HEATMAP_NAME_W, height: 90 }} />
            {categories.map(cat => (
              <th key={cat} style={{ width: HEATMAP_CELL_W, height: 90, position: 'relative', overflow: 'visible', padding: 0 }}>
                <span style={{
                  position: 'absolute',
                  bottom: 8,
                  left: Math.round(HEATMAP_CELL_W / 2),
                  transformOrigin: 'left bottom',
                  transform: 'rotate(-45deg)',
                  whiteSpace: 'nowrap',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#64748b',
                  lineHeight: 1,
                }}>
                  {SE_CATEGORY_SHORT[cat] ?? cat}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleNames.map(name => (
            <tr key={name} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ padding: '5px 10px 5px 0', fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </td>
              {categories.map(cat => {
                const pct = cellData[name][cat];
                return (
                  <td key={cat} style={{ padding: '5px 4px', textAlign: 'center' }}>
                    <div
                      title={pct !== null ? `${name} · ${SE_CATEGORY_SHORT[cat] ?? cat}: ${pct}%` : 'No data'}
                      style={{
                        backgroundColor: getCellBg(pct),
                        color: getCellTextColor(pct),
                        borderRadius: 4,
                        padding: '4px 2px',
                        fontSize: 11,
                        fontWeight: 700,
                        textAlign: 'center',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {pct !== null ? `${pct}%` : '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-5 mt-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0' }} /> ≥85%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#fef9c3', border: '1px solid #fef08a' }} /> 75–84%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#fed7aa', border: '1px solid #fdba74' }} /> 60–74%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#fecaca', border: '1px solid #fca5a5' }} /> &lt;60%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }} /> No data</span>
      </div>
    </div>
  );
};

// ─── Value Articulation ───────────────────────────────────────────────────────

interface WeeklyValuePoint {
  label: string;
  /** null for a week with no scored calls — Recharts breaks the line rather than inventing one. */
  value: number | null;
  overall: number | null;
  count: number;
}

/**
 * Averages Value Articulation % and overall score % into Monday-start weeks, covering the
 * last TREND_WEEKS weeks.
 *
 * Weeks inside the window with no scored calls are kept as null-valued points, so a quiet
 * fortnight shows as a genuine gap instead of two busy weeks being drawn adjacent. The series
 * starts at the first week that actually has data, so a sparse history doesn't open with a
 * run of empty columns, and always runs to the current week so a recent lull is visible.
 */
export const buildWeeklyValueTrend = (
  sessions: DemoSession[],
  weeks: number = TREND_WEEKS,
  now: Date = new Date()
): WeeklyValuePoint[] => {
  const scored = sessions
    .map(s => ({ session: s, value: getSessionValueArticulation(s) }))
    .filter((d): d is { session: DemoSession; value: NonNullable<ReturnType<typeof getSessionValueArticulation>> } => d.value !== null);

  const currentWeek = startOfWeek(now);
  const windowStart = addWeeks(currentWeek, -(weeks - 1)).getTime();

  const buckets = new Map<number, { value: number[]; overall: number[] }>();
  for (const d of scored) {
    const weekStart = startOfWeek(d.session.createdAt).getTime();
    if (weekStart < windowStart) continue;
    const bucket = buckets.get(weekStart) ?? { value: [], overall: [] };
    bucket.value.push(d.value.pct);
    bucket.overall.push(getSessionScorePct(d.session));
    buckets.set(weekStart, bucket);
  }

  if (buckets.size === 0) return [];

  const points: WeeklyValuePoint[] = [];
  let cursor = new Date(Math.min(...buckets.keys()));
  while (cursor.getTime() <= currentWeek.getTime()) {
    const bucket = buckets.get(cursor.getTime());
    points.push({
      label: formatDateShort(cursor),
      value: bucket ? mean(bucket.value) : null,
      overall: bucket ? mean(bucket.overall) : null,
      count: bucket ? bucket.value.length : 0,
    });
    cursor = addWeeks(cursor, 1);
  }

  return points;
};

/** Weekly trend of Value Articulation % against overall score %. */
const ValueTrendChart: React.FC<{ sessions: DemoSession[] }> = ({ sessions }) => {
  const data = buildWeeklyValueTrend(sessions);
  const weeksWithCalls = data.filter(d => d.value !== null).length;

  if (weeksWithCalls < 2) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-gray-400 text-center px-4">
        Scored calls in at least two different weeks are needed to show a trend.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} width={30} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(v: number, name: string) => [
            `${v}%`,
            name === 'value' ? 'Value Articulation' : 'Overall Score',
          ]}
          // The call count matters for reading the point: a 100% week built on one call is not
          // the same evidence as a 78% week built on six.
          labelFormatter={(label, payload) => {
            const count = (payload?.[0]?.payload as WeeklyValuePoint | undefined)?.count ?? 0;
            return `Week of ${label} · ${count} call${count === 1 ? '' : 's'}`;
          }}
        />
        <ReferenceLine y={75} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'Pass', fontSize: 10, fill: '#16a34a', position: 'insideTopRight' }} />
        <Line
          type="monotone"
          dataKey="overall"
          name="overall"
          stroke="#cbd5e1"
          strokeWidth={2}
          dot={{ fill: '#cbd5e1', r: 3 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="value"
          name="value"
          stroke="#7c3aed"
          strokeWidth={2.5}
          dot={{ fill: '#7c3aed', r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

/** Per-SE Value Articulation comparison — managers viewing all SEs. */
const ValueComparisonChart: React.FC<{ sessions: DemoSession[]; seNames: string[] }> = ({ sessions, seNames }) => {
  const data = seNames
    .map(name => {
      const avg = getAverageValueArticulation(sessions.filter(s => s.callDeliveredBy === name));
      return avg ? { name, pct: avg.pct, count: avg.count } : null;
    })
    .filter((d): d is { name: string; pct: number; count: number } => d !== null)
    .sort((a, b) => b.pct - a.pct);

  if (data.length < 2) return null;

  const chartHeight = Math.max(180, data.length * 40 + 40);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <ComposedChart layout="vertical" data={data} margin={{ top: 10, right: 50, bottom: 5, left: 110 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} width={105} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value: number, _name: string, item: any) => [
            `${value}% · ${item.payload.count} call${item.payload.count !== 1 ? 's' : ''}`,
            'Value Articulation',
          ]}
        />
        <ReferenceLine x={75} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'Pass', fontSize: 10, fill: '#16a34a', position: 'insideTopRight' }} />
        <Bar dataKey="pct" fill="#7c3aed" radius={[0, 3, 3, 0]} barSize={18} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

const ValueArticulationPanel: React.FC<{
  sessions: DemoSession[];
  allSessions: DemoSession[];
  seNames: string[];
  showPerSe: boolean;
  selectedSe: string;
}> = ({ sessions, allSessions, seNames, showPerSe, selectedSe }) => {
  const avg = getAverageValueArticulation(sessions);
  if (!avg) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="text-base font-bold text-brand-navy">
          Value Articulation — is the demo explaining the WHY?{selectedSe !== 'all' ? ` — ${selectedSe}` : ''}
        </h2>
        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
          {avg.count} call{avg.count !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-5 max-w-3xl leading-relaxed">
        Demo Relevance and Value Connection (18 pts) + Value and Business Impact (10 pts) = {VALUE_ARTICULATION_MAX} of 100 points.
        Measures whether capabilities shown were tied to this customer's outcomes, rather than demonstrated as features.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[0.7fr_1.3fr] gap-6 items-start">
        {/* Headline + category breakdown */}
        <div>
          <p className="text-5xl font-black text-brand-navy leading-none">{avg.pct}%</p>
          <p className="text-xs font-semibold text-slate-400 mt-1.5 uppercase tracking-wide">
            of available value points
          </p>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-3">
            <div className={`h-full ${getBarColor(avg.pct)}`} style={{ width: `${avg.pct}%` }} />
          </div>

          <div className="space-y-3 mt-5">
            {avg.parts.map(part => (
              <div key={part.category} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <p className="text-sm font-bold text-brand-navy leading-tight">{part.category}</p>
                  <span className="text-xs font-black text-slate-600 flex-shrink-0">{part.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white overflow-hidden border border-slate-100">
                  <div className={`h-full ${getBarColor(part.pct)}`} style={{ width: `${part.pct}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">avg {part.earned}/{part.max} pts</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trend vs overall score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Weekly trend vs overall score
            </h3>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded-sm" style={{ backgroundColor: '#7c3aed' }} /> Value
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded-sm bg-slate-300" /> Overall
              </span>
            </div>
          </div>
          <ValueTrendChart sessions={sessions} />
        </div>
      </div>

      {showPerSe && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Value Articulation by SE</h3>
          <ValueComparisonChart sessions={allSessions} seNames={seNames} />
        </div>
      )}
    </div>
  );
};

// ─── Call History Table ───────────────────────────────────────────────────────

const CallHistoryTable: React.FC<{
  sessions: DemoSession[];
  onView: (session: DemoSession) => void;
  onDelete: (session: DemoSession) => Promise<void>;
}> = ({ sessions, onView, onDelete }) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (session: DemoSession) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(session);
      setConfirmDeleteId(null);
    } catch (e) {
      console.error('Failed to delete session:', e);
      setDeleteError('Could not delete this session.');
    } finally {
      setDeleting(false);
    }
  };

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No calls recorded yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
          <th className="py-2 pr-4">Date</th>
          <th className="py-2 pr-4">SE</th>
          <th className="py-2 pr-4">Score</th>
          <th className="py-2 pr-4">Tier</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {sessions.map(s => {
          const score = getSessionScore(s);
          const maxScore = getMaxScore(s);
          const isConfirming = confirmDeleteId === s.id;
          return (
            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2.5 pr-4 text-gray-600">{formatDate(s.createdAt)}</td>
              <td className="py-2.5 pr-4 text-gray-700 font-medium">{s.callDeliveredBy || '—'}</td>
              <td className="py-2.5 pr-4 font-semibold text-brand-navy">{score}/{maxScore}</td>
              <td className="py-2.5 pr-4"><TierBadge session={s} /></td>
              <td className="py-2.5 text-right">
                {!isConfirming ? (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setConfirmDeleteId(s.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete this session"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => onView(s)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:text-brand-yellow transition-colors"
                    >
                      View <ExternalLink size={11} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-1.5">
                    {deleteError && confirmDeleteId === s.id && (
                      <span className="text-xs text-red-600 whitespace-nowrap">{deleteError}</span>
                    )}
                    <span className="text-xs text-gray-500 whitespace-nowrap">Delete?</span>
                    <button
                      onClick={() => handleDelete(s)}
                      disabled={deleting}
                      className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded hover:bg-gray-200 transition-colors"
                    >
                      No
                    </button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export const SeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<DemoSession | null>(null);
  const [selectedSe, setSelectedAe] = useState<string>('all');

  const managerConfig = getManagerConfig(user?.email);
  const isManager = !!managerConfig;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      try {
        let all: DemoSession[];
        if (isManager) {
          const [fromCollection, fromOwn] = await withTimeout(Promise.all([
            getSeSessionsForManager(),
            getUserEvaluations(user.uid),
          ]));
          const merged = [...fromCollection];
          const seen = new Set(merged.map(s => s.id));
          for (const s of fromOwn) {
            if (!seen.has(s.id)) { merged.push(s); seen.add(s.id); }
          }
          const reports = getDirectReports(managerConfig!);
          const reportsLower = reports.map(r => r.toLowerCase());
          all = managerConfig!.directReports.includes(ALL_SES_SENTINEL)
            ? merged
            : merged.filter(s => reportsLower.includes((s.callDeliveredBy || '').toLowerCase()));
        } else {
          const [ownSessions, scoredForMe] = await withTimeout(Promise.all([
            getUserEvaluations(user.uid),
            user.displayName ? getSeSessionsByName(user.displayName) : Promise.resolve([] as DemoSession[]),
          ]));
          const merged = [...ownSessions];
          const seen = new Set(merged.map(s => s.id));
          for (const s of scoredForMe) {
            if (!seen.has(s.id)) { merged.push(s); seen.add(s.id); }
          }
          all = merged;
        }
        setSessions(all.filter(s => s.rubricType !== 'BDR' && s.status === 'complete' && (!!s.aiScoring || !!s.aiV2 || !!s.seScoring)));
      } catch (e) {
        console.error(e);
        setSessions([]);
        setError(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  if (selectedSession) {
    if (selectedSession.seScoring) {
      return <SeCallScorecard session={selectedSession} onBack={() => setSelectedSession(null)} />;
    }
    return <AeSessionScorecard session={selectedSession} onBack={() => setSelectedSession(null)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  const handleDelete = async (session: DemoSession) => {
    if (!user) return;
    if (session.userId && session.userId !== user.uid) {
      // Deleting a report's session from the team view — must go through the
      // privileged Cloud Function since Firestore rules only let the true owner
      // delete their own `users/{uid}/evaluations/{id}` record.
      await deleteEvaluationAsManager(session.userId, session.id);
    } else {
      await deleteEvaluation(user.uid, session.id, {
        rubricType: session.rubricType,
        hasAiScoring: !!(session.aiScoring || session.aiV2 || session.seScoring),
      });
    }
    setSessions(prev => prev.filter(s => s.id !== session.id));
  };

  const seNames = [...new Set(sessions.map(s => s.callDeliveredBy || '').filter(Boolean))].sort();

  const sorted = [...sessions]
    .filter(s => selectedSe === 'all' || s.callDeliveredBy === selectedSe)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const scorePcts = sorted.map(getSessionScorePct);
  const avgScore = scorePcts.length > 0 ? Math.round(scorePcts.reduce((a, b) => a + b, 0) / scorePcts.length) : 0;
  const bestScore = scorePcts.length > 0 ? Math.max(...scorePcts) : 0;
  const valueArticulation = getAverageValueArticulation(sorted);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
            <BarChart2 className="w-7 h-7" /> SE Demo Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isManager && selectedSe !== 'all'
              ? `${selectedSe} · ${sorted.length} call${sorted.length !== 1 ? 's' : ''} scored`
              : user?.displayName
                ? `${user.displayName} · ${sorted.length} call${sorted.length !== 1 ? 's' : ''} scored`
                : `${sorted.length} call${sorted.length !== 1 ? 's' : ''} scored`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors"
          >
            <History size={13} /> Call History
          </Link>
          <button
            onClick={() => setSelectedSession(SAMPLE_SE_SESSION)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-navy text-brand-navy text-sm font-semibold hover:bg-brand-navy hover:text-white transition-colors"
          >
            View Sample Report <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* SE Selector — managers only */}
      {isManager && seNames.length > 0 && (
        <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-4 py-3">
          <Users size={16} className="text-slate-400 flex-shrink-0" />
          <label className="text-sm font-medium text-slate-600 flex-shrink-0">Viewing:</label>
          <select
            value={selectedSe}
            onChange={e => setSelectedAe(e.target.value)}
            className="border border-slate-200 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:border-brand-navy bg-white"
          >
            <option value="all">All SEs</option>
            {seNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {selectedSe !== 'all' && (
            <button
              onClick={() => setSelectedAe('all')}
              className="ml-auto text-xs text-slate-400 hover:text-brand-navy transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Calls Scored"
          value={sorted.length}
          icon={<Phone size={18} className="text-brand-navy" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Avg Score"
          value={sorted.length > 0 ? `${avgScore}%` : '—'}
          sub={sorted.length > 0 ? getInterpretationLabel(getScoreInterpretation(avgScore)) : undefined}
          icon={<BarChart2 size={18} className="text-orange-500" />}
          color="bg-orange-50"
        />
        <StatCard
          label="Best Score"
          value={sorted.length > 0 ? `${bestScore}%` : '—'}
          sub={sorted.length > 0 ? getInterpretationLabel(getScoreInterpretation(bestScore)) : undefined}
          icon={<Award size={18} className="text-yellow-500" />}
          color="bg-yellow-50"
        />
        <StatCard
          label="Passing Calls"
          value={scorePcts.filter(s => s >= 75).length}
          sub={sorted.length > 0 ? `${Math.round((scorePcts.filter(s => s >= 75).length / sorted.length) * 100)}% of total` : undefined}
          icon={<TrendingUp size={18} className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          label="Value Articulation"
          value={valueArticulation ? `${valueArticulation.pct}%` : '—'}
          sub={`Explaining the WHY · ${VALUE_ARTICULATION_MAX} pts`}
          icon={<Target size={18} className="text-purple-600" />}
          color="bg-purple-50"
        />
      </div>

      {/* Value Articulation — the "why" of the demo */}
      <ValueArticulationPanel
        sessions={sorted}
        allSessions={sessions}
        seNames={seNames}
        showPerSe={isManager && selectedSe === 'all' && seNames.length > 1}
        selectedSe={selectedSe}
      />

      {/* Skill Profile Radar */}
      {sorted.some(s => !!s.aiScoring || !!s.seScoring) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-brand-navy">
              Skill Profile{selectedSe !== 'all' ? ` — ${selectedSe}` : ''}
            </h2>
            <span className="text-xs text-gray-400">
              {sorted.filter(s => !!s.aiScoring || !!s.seScoring).length} call{sorted.filter(s => !!s.aiScoring || !!s.seScoring).length !== 1 ? 's' : ''} analysed · avg % of criterion max
            </span>
          </div>
          <CriterionRadar sessions={sorted} />
        </div>
      )}

      {/* Trend Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-brand-navy mb-4">
          Score Trend{selectedSe !== 'all' ? ` — ${selectedSe}` : ''}
        </h2>
        <TrendChart sessions={sorted} />
      </div>

      {/* Team Comparison Chart — managers viewing all SEs */}
      {isManager && selectedSe === 'all' && seNames.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-brand-navy">Team Score Comparison</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-2.5 rounded-sm bg-brand-navy" /> Avg
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-brand-yellow border border-brand-navy" /> Latest
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">Sorted by average · dots show most recent call · green line = pass threshold</p>
          <SeComparisonChart sessions={sessions} seNames={seNames} />
        </div>
      )}

      {/* Category Heatmap — managers viewing all SEs */}
      {isManager && selectedSe === 'all' && seNames.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-brand-navy">Team Category Heatmap</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">Avg % of max per category · hover a cell for details</p>
          <CategoryHeatmap sessions={sessions} seNames={seNames} />
        </div>
      )}

      {/* Call History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-brand-navy">Call History</h2>
        </div>
        <div className="px-6 py-2 overflow-x-auto">
          <CallHistoryTable sessions={sorted} onView={setSelectedSession} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
};
