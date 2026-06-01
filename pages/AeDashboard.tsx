import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Phone, BarChart2, TrendingUp, Award, ExternalLink, History, Users, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserEvaluations, getAeSessionsForManager, deleteEvaluation } from '../services/firestoreService';
import { getScoreInterpretation, getInterpretationLabel, getInterpretationColor } from '../utils/scoringHelpers';
import { DemoSession } from '../types';
import { AeSessionScorecard } from '../components/AeSessionScorecard';
import { SeCallScorecard } from '../components/SeCallScorecard';
import { SAMPLE_AE_SESSION } from '../utils/sampleAeSession';
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
          const [fromCollection, fromOwn] = await Promise.all([
            getAeSessionsForManager(),
            getUserEvaluations(user.uid),
          ]);
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
          all = await getUserEvaluations(user.uid);
        }
        setSessions(all.filter(s => s.rubricType !== 'BDR' && s.status === 'complete' && (!!s.aiScoring || !!s.aiV2 || !!s.seScoring)));
      } catch (e) {
        console.error(e);
        setError('Failed to load sessions. Please try again.');
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
            onClick={() => setSelectedSession(SAMPLE_AE_SESSION)}
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

      {/* Trend Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-brand-navy mb-4">
          Score Trend{selectedAe !== 'all' ? ` — ${selectedAe}` : ''}
        </h2>
        <TrendChart sessions={sorted} />
      </div>

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
