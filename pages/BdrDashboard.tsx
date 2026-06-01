import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Phone,
  CheckCircle,
  XCircle,
  BarChart2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getBdrSessionsForManager, getUserEvaluations } from '../services/firestoreService';
import { isBdrDashboardManager, BDR_TEAM } from '../config/bdrUsers';
import { getBdrGrade, getBdrGradeColor } from '../utils/scoringHelpers';
import { DemoSession } from '../types';
import { BdrCallScorecard } from '../components/BdrCallScorecard';
import { SAMPLE_BDR_SESSION } from '../utils/sampleBdrSession';

const getSessionScore = (s: DemoSession): number =>
  s.aiScoring?.scores.reduce((sum, score) => sum + score.score, 0) ?? 0;

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

interface RepRow {
  email: string;
  name: string;
  calls: number;
  avgScore: number;
  demoBookedCount: number;
  sessions: DemoSession[];
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

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

// ─── Grade Badge ─────────────────────────────────────────────────────────────

const GradeBadge: React.FC<{ score: number }> = ({ score }) => {
  const grade = getBdrGrade(score);
  const color = getBdrGradeColor(grade);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
      {grade}
    </span>
  );
};

// ─── Call History Table ───────────────────────────────────────────────────────

const CallHistoryTable: React.FC<{
  sessions: DemoSession[];
  showRep?: boolean;
  onView?: (session: DemoSession) => void;
}> = ({ sessions, showRep = false, onView }) => {
  if (sessions.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No calls recorded yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
          {showRep && <th className="py-2 pr-4">Rep</th>}
          <th className="py-2 pr-4">Date</th>
          <th className="py-2 pr-4">Score</th>
          <th className="py-2 pr-4">Grade</th>
          <th className="py-2 pr-4">Demo Booked</th>
          {onView && <th className="py-2"></th>}
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => {
          const score = getSessionScore(s);
          const booked = s.aiScoring?.demoBooked;
          return (
            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
              {showRep && (
                <td className="py-2.5 pr-4 font-medium text-gray-700">
                  {s.callDeliveredBy ?? BDR_TEAM[s.bdrRepEmail ?? ''] ?? s.bdrRepEmail ?? '—'}
                </td>
              )}
              <td className="py-2.5 pr-4 text-gray-600">{formatDate(s.createdAt)}</td>
              <td className="py-2.5 pr-4 font-semibold text-brand-navy">{score}/46</td>
              <td className="py-2.5 pr-4"><GradeBadge score={score} /></td>
              <td className="py-2.5 pr-4">
                {booked === undefined ? (
                  <span className="text-gray-300">—</span>
                ) : booked ? (
                  <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                    <CheckCircle size={12} /> Booked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-500 text-xs font-semibold">
                    <XCircle size={12} /> No
                  </span>
                )}
              </td>
              {onView && (
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => onView(s)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:text-brand-yellow transition-colors"
                  >
                    View <ExternalLink size={11} />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── Manager View ─────────────────────────────────────────────────────────────

const ManagerView: React.FC<{
  allSessions: DemoSession[];
  onViewSession: (session: DemoSession) => void;
}> = ({ allSessions, onViewSession }) => {
  const [expandedRep, setExpandedRep] = useState<string | null>(null);

  const repStats: RepRow[] = useMemo(() => {
    const map: Record<string, DemoSession[]> = {};
    allSessions.forEach((s) => {
      const key = (s.bdrRepEmail ?? '').toLowerCase();
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return Object.entries(map)
      .map(([email, repSessions]) => {
        const completed = repSessions.filter((s) => !!s.aiScoring);
        const scores = completed.map(getSessionScore);
        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
        const demoBookedCount = completed.filter((s) => s.aiScoring?.demoBooked).length;
        const name =
          Object.entries(BDR_TEAM).find(([k]) => k.toLowerCase() === email)?.[1] ??
          completed[0]?.callDeliveredBy ??
          email;
        return {
          email,
          name,
          calls: completed.length,
          avgScore,
          demoBookedCount,
          sessions: completed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        };
      })
      .filter((r) => r.calls > 0)
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [allSessions]);

  const totalCompleted = repStats.reduce((s, r) => s + r.calls, 0);
  const totalDemosBooked = repStats.reduce((s, r) => s + r.demoBookedCount, 0);
  const avgTeamScore =
    repStats.length > 0
      ? Math.round(repStats.reduce((s, r) => s + r.avgScore, 0) / repStats.length)
      : 0;
  const demoBookingRate =
    totalCompleted > 0 ? Math.round((totalDemosBooked / totalCompleted) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
            <Users className="w-7 h-7" /> BDR Team Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {repStats.length} rep{repStats.length !== 1 ? 's' : ''} · {totalCompleted} calls scored
          </p>
        </div>
        <button
          onClick={() => onViewSession(SAMPLE_BDR_SESSION)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-navy text-brand-navy text-sm font-semibold hover:bg-brand-navy hover:text-white transition-colors"
        >
          View Sample Report <ExternalLink size={13} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Calls"
          value={totalCompleted}
          icon={<Phone size={18} className="text-brand-navy" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Active Reps"
          value={repStats.length}
          icon={<Users size={18} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          label="Demo Booking Rate"
          value={`${demoBookingRate}%`}
          sub={`${totalDemosBooked} of ${totalCompleted} calls`}
          icon={<CheckCircle size={18} className="text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          label="Avg Team Score"
          value={`${avgTeamScore}/46`}
          sub={`Grade ${getBdrGrade(avgTeamScore)}`}
          icon={<BarChart2 size={18} className="text-orange-500" />}
          color="bg-orange-50"
        />
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-navy" />
          <h2 className="text-lg font-bold text-brand-navy">Team Leaderboard</h2>
        </div>

        {repStats.length === 0 ? (
          <p className="text-gray-500 text-sm p-6 text-center">No BDR sessions recorded yet.</p>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-2 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <span>Rep</span>
              <span>Calls</span>
              <span>Avg Score</span>
              <span>Grade</span>
              <span>Demos Booked</span>
              <span></span>
            </div>

            {repStats.map((rep, i) => (
              <div key={rep.email}>
                <button
                  onClick={() => setExpandedRep(expandedRep === rep.email ? null : rep.email)}
                  className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-2 px-6 py-4 items-center hover:bg-gray-50 transition-colors border-b border-gray-50 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-5">{i + 1}</span>
                    <span className="font-semibold text-gray-800">{rep.name}</span>
                  </span>
                  <span className="text-gray-600">{rep.calls}</span>
                  <span className="font-semibold text-brand-navy">{rep.avgScore}/46</span>
                  <span><GradeBadge score={rep.avgScore} /></span>
                  <span className="text-gray-600">
                    {rep.demoBookedCount}/{rep.calls}
                    <span className="text-gray-400 text-xs ml-1">
                      ({rep.calls > 0 ? Math.round((rep.demoBookedCount / rep.calls) * 100) : 0}%)
                    </span>
                  </span>
                  <span className="flex justify-end text-gray-400">
                    {expandedRep === rep.email ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                {expandedRep === rep.email && (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      {rep.name}'s Calls
                    </p>
                    <CallHistoryTable sessions={rep.sessions} onView={onViewSession} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Individual BDR View ──────────────────────────────────────────────────────

const IndividualView: React.FC<{
  sessions: DemoSession[];
  userName: string | null | undefined;
  onViewSession: (session: DemoSession) => void;
}> = ({ sessions, userName, onViewSession }) => {
  const completed = sessions.filter((s) => !!s.aiScoring);
  const scores = completed.map(getSessionScore);
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const demoBookedCount = completed.filter((s) => s.aiScoring?.demoBooked).length;
  const demoBookingRate =
    completed.length > 0 ? Math.round((demoBookedCount / completed.length) * 100) : 0;

  const sorted = [...completed].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
          <BarChart2 className="w-7 h-7" /> My BDR Scorecard
        </h1>
        {userName && <p className="text-gray-500 text-sm mt-1">{userName}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Calls"
          value={completed.length}
          icon={<Phone size={18} className="text-brand-navy" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Avg Score"
          value={completed.length > 0 ? `${avgScore}/46` : '—'}
          sub={completed.length > 0 ? `Grade ${getBdrGrade(avgScore)}` : undefined}
          icon={<BarChart2 size={18} className="text-orange-500" />}
          color="bg-orange-50"
        />
        <StatCard
          label="Demo Booking Rate"
          value={completed.length > 0 ? `${demoBookingRate}%` : '—'}
          sub={completed.length > 0 ? `${demoBookedCount} of ${completed.length} calls` : undefined}
          icon={<CheckCircle size={18} className="text-green-600" />}
          color="bg-green-50"
        />
      </div>

      {/* Call History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-brand-navy">My Calls</h2>
        </div>
        <div className="px-6 py-2 overflow-x-auto">
          <CallHistoryTable sessions={sorted} onView={onViewSession} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export const BdrDashboard: React.FC = () => {
  const { user } = useAuth();
  const isManager = isBdrDashboardManager(user?.email);
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<DemoSession | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        if (isManager) {
          const all = await getBdrSessionsForManager();
          setSessions(all);
        } else {
          const all = await getUserEvaluations(user.uid);
          setSessions(all.filter((s) => s.rubricType === 'BDR'));
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load sessions. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid, isManager]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-navy"></div>
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

  if (selectedSession) {
    return (
      <BdrCallScorecard
        session={selectedSession}
        isManager={isManager}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return isManager ? (
    <ManagerView allSessions={sessions} onViewSession={setSelectedSession} />
  ) : (
    <IndividualView sessions={sessions} userName={user?.displayName} onViewSession={setSelectedSession} />
  );
};
