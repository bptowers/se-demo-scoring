import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Phone, BarChart2, TrendingUp, Award, ExternalLink, History, Users, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserEvaluations, getAeSessionsForManager, getAeSessionsByName, deleteEvaluation } from '../services/firestoreService';
import { getScoreInterpretation, getInterpretationLabel, getInterpretationColor } from '../utils/scoringHelpers';
import { DemoSession, SCORING_RUBRIC } from '../types';
import { AeSessionScorecard } from '../components/AeSessionScorecard';
import { SeCallScorecard } from '../components/SeCallScorecard';
import { SAMPLE_SE_SESSION } from '../utils/sampleSeSession';
import { getManagerConfig, getDirectReports, ALL_AES_SENTINEL } from '../config/managerConfig';

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

const SeComparisonChart: React.FC<{ sessions: DemoSession[]; aeNames: string[] }> = ({ sessions, aeNames }) => {
  const data: SeComparisonRow[] = aeNames
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

const AeCriterionRadar: React.FC<{ sessions: DemoSession[] }> = ({ sessions }) => {
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

// ─── Call History Table ───────────────────────────────────────────────────────

const CallHistoryTable: React.FC<{
  sessions: DemoSession[];
  onView: (session: DemoSession) => void;
  onDelete: (session: DemoSession) => Promise<void>;
}> = ({ sessions, onView, onDelete }) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (session: DemoSession) => {
    setDeleting(true);
    try {
      await onDelete(session);
      setConfirmDeleteId(null);
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
                    <span className="text-xs text-gray-500 whitespace-nowrap">Delete?</span>
                    <button
                      onClick={() => handleDelete(s)}
                      disabled={deleting}
                      className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
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

export const AeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<DemoSession | null>(null);
  const [selectedAe, setSelectedAe] = useState<string>('all');

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
            getAeSessionsForManager(),
            getUserEvaluations(user.uid),
          ]));
          const merged = [...fromCollection];
          const seen = new Set(merged.map(s => s.id));
          for (const s of fromOwn) {
            if (!seen.has(s.id)) { merged.push(s); seen.add(s.id); }
          }
          const reports = getDirectReports(managerConfig!);
          const reportsLower = reports.map(r => r.toLowerCase());
          all = managerConfig!.directReports.includes(ALL_AES_SENTINEL)
            ? merged
            : merged.filter(s => reportsLower.includes((s.callDeliveredBy || '').toLowerCase()));
        } else {
          const [ownSessions, scoredForMe] = await withTimeout(Promise.all([
            getUserEvaluations(user.uid),
            user.displayName ? getAeSessionsByName(user.displayName) : Promise.resolve([] as DemoSession[]),
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
    await deleteEvaluation(user.uid, session.id, {
      rubricType: session.rubricType,
      hasAiScoring: !!(session.aiScoring || session.aiV2 || session.seScoring),
    });
    setSessions(prev => prev.filter(s => s.id !== session.id));
  };

  const aeNames = [...new Set(sessions.map(s => s.callDeliveredBy || '').filter(Boolean))].sort();

  const sorted = [...sessions]
    .filter(s => selectedAe === 'all' || s.callDeliveredBy === selectedAe)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const scorePcts = sorted.map(getSessionScorePct);
  const avgScore = scorePcts.length > 0 ? Math.round(scorePcts.reduce((a, b) => a + b, 0) / scorePcts.length) : 0;
  const bestScore = scorePcts.length > 0 ? Math.max(...scorePcts) : 0;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
            <BarChart2 className="w-7 h-7" /> SE Demo Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isManager && selectedAe !== 'all'
              ? `${selectedAe} · ${sorted.length} call${sorted.length !== 1 ? 's' : ''} scored`
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
      {isManager && aeNames.length > 0 && (
        <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-4 py-3">
          <Users size={16} className="text-slate-400 flex-shrink-0" />
          <label className="text-sm font-medium text-slate-600 flex-shrink-0">Viewing:</label>
          <select
            value={selectedAe}
            onChange={e => setSelectedAe(e.target.value)}
            className="border border-slate-200 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:border-brand-navy bg-white"
          >
            <option value="all">All SEs</option>
            {aeNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {selectedAe !== 'all' && (
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Skill Profile Radar */}
      {sorted.some(s => !!s.aiScoring || !!s.seScoring) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-brand-navy">
              Skill Profile{selectedAe !== 'all' ? ` — ${selectedAe}` : ''}
            </h2>
            <span className="text-xs text-gray-400">
              {sorted.filter(s => !!s.aiScoring || !!s.seScoring).length} call{sorted.filter(s => !!s.aiScoring || !!s.seScoring).length !== 1 ? 's' : ''} analysed · avg % of criterion max
            </span>
          </div>
          <AeCriterionRadar sessions={sorted} />
        </div>
      )}

      {/* Trend Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-brand-navy mb-4">
          Score Trend{selectedAe !== 'all' ? ` — ${selectedAe}` : ''}
        </h2>
        <TrendChart sessions={sorted} />
      </div>

      {/* Team Comparison Chart — managers viewing all SEs */}
      {isManager && selectedAe === 'all' && aeNames.length > 1 && (
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
          <SeComparisonChart sessions={sessions} aeNames={aeNames} />
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
