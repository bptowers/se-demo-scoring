import React, { useEffect, useState, useMemo } from 'react';
import {
  Users, ChevronRight, ArrowLeft, Globe, BarChart2, Phone,
  TrendingUp, Award, ChevronDown, ChevronUp, ExternalLink, PenLine,
} from 'lucide-react';
import { ManagerConfig, getDirectReports, ALL_SES_SENTINEL } from '../config/managerConfig';
import { DemoSession } from '../types';
import { DemoScoringApp } from './DemoScoringApp';
import { AeSessionScorecard } from '../components/AeSessionScorecard';
import { SeCallScorecard } from '../components/SeCallScorecard';
import { getSeSessionsForManager } from '../services/firestoreService';
import {
  getScoreInterpretation,
  getInterpretationLabel,
  getInterpretationColor,
} from '../utils/scoringHelpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getSessionScore = (s: DemoSession): number =>
  s.seScoring?.evaluations?.[0]
    ? s.seScoring.evaluations[0].overall_result.final_score
    : s.aiV2
      ? Math.round((s.aiV2.combinedTotal / 55) * 100)
      : s.aiScoring?.scores.reduce((sum, sc) => sum + sc.score, 0) ?? 0;

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);

// ─── Types ────────────────────────────────────────────────────────────────────

interface AeRow {
  name: string;
  calls: number;
  avgScore: number;
  bestScore: number;
  goldStandardCount: number;
  sessions: DemoSession[];
}

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

const TierBadge: React.FC<{ score: number }> = ({ score }) => {
  const interp = getScoreInterpretation(score);
  const color = getInterpretationColor(interp);
  const label = getInterpretationLabel(interp);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
      {label}
    </span>
  );
};

const CallHistoryTable: React.FC<{
  sessions: DemoSession[];
  onView: (session: DemoSession) => void;
}> = ({ sessions, onView }) => {
  if (sessions.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No calls recorded yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
          <th className="py-2 pr-4">Date</th>
          <th className="py-2 pr-4">Score</th>
          <th className="py-2 pr-4">Tier</th>
          <th className="py-2 pr-4">Result</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => {
          const score = getSessionScore(s);
          return (
            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2.5 pr-4 text-gray-600">{formatDate(s.createdAt)}</td>
              <td className="py-2.5 pr-4 font-semibold text-brand-navy">{score}/100</td>
              <td className="py-2.5 pr-4"><TierBadge score={score} /></td>
              <td className="py-2.5 pr-4 text-gray-500 text-xs">{s.seScoring?.evaluations?.[0]?.overall_result.result ?? s.aiScoring?.vertical ?? '—'}</td>
              <td className="py-2.5 text-right">
                <button
                  onClick={() => onView(s)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:text-brand-yellow transition-colors"
                >
                  View <ExternalLink size={11} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── Team Dashboard ───────────────────────────────────────────────────────────

const TeamDashboard: React.FC<{
  managerConfig: ManagerConfig;
  allSessions: DemoSession[];
  onViewSession: (session: DemoSession) => void;
  onScoreCall: () => void;
}> = ({ managerConfig, allSessions, onViewSession, onScoreCall }) => {
  const [expandedAe, setExpandedAe] = useState<string | null>(null);
  const directReports = getDirectReports(managerConfig);
  const hasGlobalAccess = managerConfig.directReports.includes(ALL_SES_SENTINEL);

  const aeRows: AeRow[] = useMemo(() => {
    const filtered = hasGlobalAccess
      ? allSessions.filter((s) => !!s.callDeliveredBy)
      : allSessions.filter((s) => s.callDeliveredBy && directReports.includes(s.callDeliveredBy));

    const map: Record<string, DemoSession[]> = {};
    filtered.forEach((s) => {
      const key = s.callDeliveredBy!;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });

    const visibleNames = hasGlobalAccess
      ? Object.keys(map).sort()
      : directReports;

    return visibleNames
      .map((name) => {
        const sessions = (map[name] ?? []).sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        const scores = sessions.map(getSessionScore);
        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const goldStandardCount = scores.filter((sc) => sc >= 75).length;
        return { name, calls: sessions.length, avgScore, bestScore, goldStandardCount, sessions };
      })
      .filter((r) => r.calls > 0)
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [allSessions, directReports, hasGlobalAccess]);

  const totalCalls = aeRows.reduce((s, r) => s + r.calls, 0);
  const activeAes = aeRows.length;
  const totalGoldStandard = aeRows.reduce((s, r) => s + r.goldStandardCount, 0);
  const goldStandardRate =
    totalCalls > 0 ? Math.round((totalGoldStandard / totalCalls) * 100) : 0;
  const allScores = aeRows.flatMap((r) => r.sessions.map(getSessionScore));
  const avgTeamScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
            <Users className="w-7 h-7" /> SE Team Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {managerConfig.name}
            {managerConfig.region && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">
                {managerConfig.region === 'Global' && <Globe size={10} />}
                {managerConfig.region}
              </span>
            )}
            {' · '}{activeAes} SE{activeAes !== 1 ? 's' : ''} · {totalCalls} calls scored
          </p>
        </div>
        <button
          onClick={onScoreCall}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors"
        >
          <PenLine size={14} /> Score a Call
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Calls"
          value={totalCalls}
          icon={<Phone size={18} className="text-brand-navy" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Active SEs"
          value={activeAes}
          sub={hasGlobalAccess ? 'across all scored SEs' : `of ${directReports.length} on roster`}
          icon={<Users size={18} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          label="Avg Team Score"
          value={totalCalls > 0 ? `${avgTeamScore}/100` : '—'}
          sub={totalCalls > 0 ? getInterpretationLabel(getScoreInterpretation(avgTeamScore)) : undefined}
          icon={<BarChart2 size={18} className="text-orange-500" />}
          color="bg-orange-50"
        />
        <StatCard
          label="Pass Rate"
          value={totalCalls > 0 ? `${goldStandardRate}%` : '—'}
          sub={totalCalls > 0 ? `${totalGoldStandard} of ${totalCalls} calls` : undefined}
          icon={<Award size={18} className="text-yellow-500" />}
          color="bg-yellow-50"
        />
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-navy" />
          <h2 className="text-lg font-bold text-brand-navy">Team Leaderboard</h2>
        </div>

        {aeRows.length === 0 ? (
          <p className="text-gray-500 text-sm p-6 text-center">
            No SE sessions recorded yet. Use "Score a Call" to get started.
          </p>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-2 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <span>SE</span>
              <span>Calls</span>
              <span>Avg Score</span>
              <span>Tier</span>
              <span>Best Score</span>
              <span></span>
            </div>

            {aeRows.map((ae, i) => (
              <div key={ae.name}>
                <button
                  onClick={() => setExpandedAe(expandedAe === ae.name ? null : ae.name)}
                  className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-2 px-6 py-4 items-center hover:bg-gray-50 transition-colors border-b border-gray-50 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-5">{i + 1}</span>
                    <span className="font-semibold text-gray-800">{ae.name}</span>
                  </span>
                  <span className="text-gray-600">{ae.calls}</span>
                  <span className="font-semibold text-brand-navy">{ae.avgScore}/100</span>
                  <span><TierBadge score={ae.avgScore} /></span>
                  <span className="font-semibold text-brand-navy">{ae.bestScore}/100</span>
                  <span className="flex justify-end text-gray-400">
                    {expandedAe === ae.name ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                {expandedAe === ae.name && (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      {ae.name}'s Calls
                    </p>
                    <CallHistoryTable sessions={ae.sessions} onView={onViewSession} />
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

// ─── Scoring Screen ───────────────────────────────────────────────────────────

const ScoringScreen: React.FC<{
  managerConfig: ManagerConfig;
  onBack: () => void;
}> = ({ managerConfig, onBack }) => {
  const [selectedAE, setSelectedAE] = useState<string>('');
  const [scoring, setScoring] = useState(false);
  const seList = getDirectReports(managerConfig);

  if (scoring) {
    return (
      <div>
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => setScoring(false)}
              className="flex items-center gap-2 text-sm font-semibold text-brand-navy hover:text-brand-yellow transition-colors"
            >
              <ArrowLeft size={16} /> Back to SE Selection
            </button>
          </div>
        </div>
        <DemoScoringApp lockedCallDeliveredBy={selectedAE} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-brand-navy hover:text-brand-yellow transition-colors mb-8"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-lg font-bold text-brand-navy mb-1">Score a Call</h2>
        <p className="text-sm text-slate-500 mb-6">
          Select an SE to score a customer demo on their behalf. The "Sales Engineer Being Scored" field will be pre-filled and locked.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Sales Engineer
            </label>
            <select
              value={selectedAE}
              onChange={(e) => setSelectedAE(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-brand-navy font-medium focus:outline-none focus:border-brand-yellow bg-white"
            >
              <option value="">Select an SE...</option>
              {seList.map((ae) => (
                <option key={ae} value={ae}>{ae}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setScoring(true)}
            disabled={!selectedAE}
            className="w-full flex items-center justify-center gap-2 bg-brand-navy text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Score a Call <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        {seList.length} SE{seList.length !== 1 ? 's' : ''} available
      </p>
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

interface ManagerDashboardProps {
  managerConfig: ManagerConfig;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ managerConfig }) => {
  const [screen, setScreen] = useState<'dashboard' | 'scoring' | 'scorecard'>('dashboard');
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<DemoSession | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all = await getSeSessionsForManager();
        setSessions(all);
      } catch (e) {
        console.error(e);
        setError('Failed to load sessions. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleViewSession = (session: DemoSession) => {
    setSelectedSession(session);
    setScreen('scorecard');
  };

  if (screen === 'scorecard' && selectedSession) {
    if (selectedSession.seScoring) {
      return (
        <SeCallScorecard
          session={selectedSession}
          onBack={() => {
            setSelectedSession(null);
            setScreen('dashboard');
          }}
        />
      );
    }
    return (
      <AeSessionScorecard
        session={selectedSession}
        onBack={() => {
          setSelectedSession(null);
          setScreen('dashboard');
        }}
      />
    );
  }

  if (screen === 'scoring') {
    return (
      <ScoringScreen
        managerConfig={managerConfig}
        onBack={() => setScreen('dashboard')}
      />
    );
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

  return (
    <TeamDashboard
      managerConfig={managerConfig}
      allSessions={sessions}
      onViewSession={handleViewSession}
      onScoreCall={() => setScreen('scoring')}
    />
  );
};
