import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserEvaluations, getBdrSessionsForManager, getAeSessionsByName } from '../services/firestoreService';
import { DemoSession, ScorerProfile, SCORING_RUBRIC, BDR_SCORING_RUBRIC, ScoringRubricType } from '../types';
import { format, subDays } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Calendar, Award, Target, Users } from 'lucide-react';
import { isBdrManager, isBdrUser, BDR_TEAM } from '../config/bdrUsers';

type DateRange = '7d' | '30d' | '90d' | 'all';

const calculateTotalScore = (profile?: ScorerProfile): number => {
  if (!profile) return 0;
  return profile.scores.reduce((sum, s) => sum + s.score, 0);
};

const getAeScore = (evaluation: DemoSession): number => {
  if (evaluation.seScoring?.evaluations?.[0]) {
    return evaluation.seScoring.evaluations[0].overall_result.final_score;
  }
  // V2 sessions use aiV2, V1 sessions use aiScoring.
  if (evaluation.aiV2) return evaluation.aiV2.combinedTotal;
  if (evaluation.aiScoring) return calculateTotalScore(evaluation.aiScoring);
  return 0;
};

const calculateSectionScore = (profile: ScorerProfile | undefined, section: string): number => {
  if (!profile) return 0;
  const sectionCriteria = SCORING_RUBRIC.filter(c => c.section === section);
  return sectionCriteria.reduce((sum, c) => {
    const score = profile.scores.find(s => s.criterionId === c.id);
    return sum + (score?.score || 0);
  }, 0);
};

const calculateBdrStageScore = (profile: ScorerProfile | undefined, stage: string): number => {
  if (!profile) return 0;
  const stageCriteria = BDR_SCORING_RUBRIC.filter(c => c.section === stage);
  return stageCriteria.reduce((sum, c) => {
    const score = profile.scores.find(s => s.criterionId === c.id);
    return sum + (score?.score || 0);
  }, 0);
};

const BDR_STAGES = ['Open', 'Create Interest', 'Discovery', 'Mirror', 'Qualify & Close'];
const AE_SECTIONS = ['Gold Standard', 'Process'];
const STAGE_COLORS: Record<string, string> = {
  'Open':            '#6366f1',
  'Create Interest': '#3b82f6',
  'Discovery':       '#10b981',
  'Mirror':          '#f59e0b',
  'Qualify & Close': '#ef4444',
  'Gold Standard':   '#FFC20E',
  'Process':         '#64748b',
};

export const TrendReport: React.FC = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [error, setError] = useState<string | null>(null);
  const [rubricFilter, setRubricFilter] = useState<ScoringRubricType | 'all'>('all');
  const [selectedBdrRep, setSelectedBdrRep] = useState<string>('all');

  const isManager = isBdrManager(user?.email);
  const isBdr = isBdrUser(user?.email);

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        let startDate: Date | undefined;
        switch (dateRange) {
          case '7d':  startDate = subDays(new Date(), 7);  break;
          case '30d': startDate = subDays(new Date(), 30); break;
          case '90d': startDate = subDays(new Date(), 90); break;
          default:    startDate = undefined;
        }

        const [ownData, scoredForMe] = await Promise.all([
          getUserEvaluations(user.uid, { startDate, orderBy: 'completedAt' }),
          user.displayName ? getAeSessionsByName(user.displayName) : Promise.resolve([] as DemoSession[]),
        ]);
        const mergedOwn = [...ownData];
        const seenIds = new Set(mergedOwn.map(e => e.id));
        for (const s of scoredForMe) {
          if (!seenIds.has(s.id)) { mergedOwn.push(s); seenIds.add(s.id); }
        }
        let allData = mergedOwn
          .filter(e => e.status === 'complete' && e.completedAt)
          .sort((a, b) => (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0)); // oldest first

        // BDR manager: merge all team BDR sessions
        if (isManager) {
          const bdrTeamData = await getBdrSessionsForManager();
          const teamComplete = bdrTeamData.filter(e => e.status === 'complete' && e.completedAt);
          const ownIds = new Set(allData.map(e => e.id));
          const teamOnly = teamComplete.filter(e => !ownIds.has(e.id));
          allData = [...allData, ...teamOnly].sort(
            (a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
          );
        }

        // Non-BDR users: hide BDR sessions
        if (!isBdr) {
          allData = allData.filter(e => !e.rubricType || e.rubricType === 'AE');
        }

        setEvaluations(allData);
      } catch (err) {
        console.error('Error fetching evaluations:', err);
        setError('Failed to load your evaluation history');
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [user, dateRange, isManager, isBdr]);

  // Apply client-side filters
  const displayedEvaluations = evaluations.filter(e => {
    const sessionRubric = e.rubricType || 'AE';
    if (rubricFilter !== 'all' && sessionRubric !== rubricFilter) return false;
    if (isManager && selectedBdrRep !== 'all' && e.bdrRepEmail !== selectedBdrRep) return false;
    return true;
  });

  // Normalize scores to percentage basis to handle BDR, legacy AE V2, and SE scorecards.
  const normalizeScore = (score: number, evaluation: DemoSession): number => {
    if (evaluation.rubricType === 'BDR') {
      return Math.round((score / 46) * 100);
    }
    if (evaluation.seScoring) {
      return score;
    }
    // For AE: V1 is 100 pts, V2 is 55 pts
    // Detect V2 by presence of aiV2, otherwise assume V1
    const maxPts = evaluation.aiV2 ? 55 : 100;
    return Math.round((score / maxPts) * 100);
  };

  // Determine chart scale
  const allBdr = displayedEvaluations.length > 0 && displayedEvaluations.every(e => e.rubricType === 'BDR');
  const showingBdr = rubricFilter === 'BDR' || allBdr;
  const maxChartScore = 100; // All scores normalized to percentage (0-100)
  const activeSections = showingBdr ? BDR_STAGES : AE_SECTIONS;

  // Detect if mixing V1 and V2 rubrics in AE data
  const mixedRubrics = !showingBdr && displayedEvaluations.length > 0 &&
    displayedEvaluations.some(e => e.rubricVersion === 'AE_V1' || e.rubricVersion === undefined) &&
    displayedEvaluations.some(e => e.rubricVersion === 'AE_V2');

  // Chart data — normalize to percentage
  const trendData = displayedEvaluations.map(evaluation => ({
    date: evaluation.completedAt ? format(evaluation.completedAt, 'MMM dd') : '',
    aiScore: normalizeScore(getAeScore(evaluation), evaluation),
    aeScore: normalizeScore(calculateTotalScore(evaluation.aeScoring), evaluation),
    managerScore: normalizeScore(calculateTotalScore(evaluation.managerScoring), evaluation),
    rubricType: evaluation.rubricType || 'AE',
    rubricVersion: evaluation.seScoring ? 'SE_CALL_SCORECARD_V1' : evaluation.rubricVersion || (evaluation.aiV2 ? 'AE_V2' : 'AE_V1'),
    callDeliveredBy: evaluation.callDeliveredBy || '',
  }));

  // Section breakdown (last 5)
  const sectionData = displayedEvaluations.slice(0, 5).map(evaluation => {
    const isBdrSession = evaluation.rubricType === 'BDR';
    const entry: Record<string, any> = {
      date: evaluation.completedAt ? format(evaluation.completedAt, 'MMM dd') : '',
    };
    if (isBdrSession) {
      BDR_STAGES.forEach(stage => {
        entry[stage] = calculateBdrStageScore(evaluation.aiScoring, stage);
      });
    } else {
      AE_SECTIONS.forEach(section => {
        entry[section] = calculateSectionScore(evaluation.aiScoring, section);
      });
    }
    return entry;
  });

  // Stats
  const totalEvaluations = displayedEvaluations.length;
  const avgScore = totalEvaluations > 0
    ? Math.round(displayedEvaluations.reduce((sum, e) => sum + normalizeScore(getAeScore(e), e), 0) / totalEvaluations)
    : 0;

  const recentTrend = displayedEvaluations.length >= 2
    ? (() => {
        // Sort ascending so last item is always the most recent, regardless of fetch order
        const sorted = [...displayedEvaluations].sort(
          (a, b) => (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0)
        );
        const recent = normalizeScore(getAeScore(sorted[sorted.length - 1]), sorted[sorted.length - 1]);
        const previous = normalizeScore(getAeScore(sorted[sorted.length - 2]), sorted[sorted.length - 2]);
        const diff = recent - previous;
        if (diff > 3) return { label: 'Improving', icon: '↑', color: 'text-green-500' };
        if (diff < -3) return { label: 'Declining', icon: '↓', color: 'text-red-500' };
        return { label: 'Stable', icon: '→', color: 'text-slate-500' };
      })()
    : { label: 'N/A', icon: '-', color: 'text-slate-400' };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Loading your progress...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <TrendingUp size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-700 mb-2">No Evaluations Yet</h2>
          <p className="text-slate-500 mb-6">Complete your first evaluation to start tracking your progress over time.</p>
          <a href="/" className="inline-flex items-center gap-2 bg-brand-yellow text-brand-navy px-6 py-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors">
            Start New Evaluation
          </a>
        </div>
      </div>
    );
  }

  if (evaluations.length === 1) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <TrendingUp size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Keep Going!</h2>
          <p className="text-slate-500 mb-6">Complete more evaluations to see your progress trends. You need at least 2 evaluations to see a trend.</p>
          <a href="/" className="inline-flex items-center gap-2 bg-brand-yellow text-brand-navy px-6 py-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors">
            Start Another Evaluation
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-brand-navy mb-2 flex items-center gap-3">
          <TrendingUp size={36} className="text-brand-yellow" />
          {isManager ? 'BDR Team Progress' : 'Your Progress Trends'}
        </h1>
        <p className="text-slate-600">
          {isManager ? 'Track your team\'s BDR call performance' : 'Track your demo performance improvement over time'}
        </p>
      </div>

      {/* Filters Row */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" />
          <div className="flex gap-2">
            {(['7d', '30d', '90d', 'all'] as DateRange[]).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-brand-navy text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {range === '7d' && 'Last 7 Days'}
                {range === '30d' && 'Last 30 Days'}
                {range === '90d' && 'Last 90 Days'}
                {range === 'all' && 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Rubric Type Filter (BDR users only) */}
        {isBdr && (
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['all', 'AE', 'BDR'] as const).map(type => (
              <button
                key={type}
                onClick={() => setRubricFilter(type)}
                className={`px-3 py-1.5 text-sm font-medium transition-all ${
                  rubricFilter === type ? 'bg-brand-navy text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {type === 'all' ? 'All Calls' : type === 'AE' ? 'AE Calls' : 'BDR Calls'}
              </button>
            ))}
          </div>
        )}

        {/* BDR Rep Selector (Dave Murphy only) */}
        {isManager && (
          <div className="flex items-center gap-2">
            <Users size={18} className="text-slate-400" />
            <select
              value={selectedBdrRep}
              onChange={e => setSelectedBdrRep(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-brand-yellow"
            >
              <option value="all">All Team</option>
              {Object.entries(BDR_TEAM).map(([email, name]) => (
                <option key={email} value={email}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Evaluations</h3>
            <Award size={20} className="text-brand-yellow" />
          </div>
          <p className="text-4xl font-black text-brand-navy">{totalEvaluations}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Average Score</h3>
            <Target size={20} className="text-brand-blue" />
          </div>
          <p className="text-4xl font-black text-brand-navy">
            {avgScore}
            <span className="text-xl text-slate-400">/{maxChartScore}</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Recent Trend</h3>
            <TrendingUp size={20} className={recentTrend.color} />
          </div>
          <p className={`text-4xl font-black ${recentTrend.color}`}>
            {recentTrend.icon} {recentTrend.label}
          </p>
        </div>
      </div>

      {displayedEvaluations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <p className="text-slate-500">No evaluations match the current filters.</p>
        </div>
      ) : (
        <>
          {/* Score Over Time Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-brand-navy">
                Score Over Time {!showingBdr && <span className="text-sm font-normal text-slate-500">(% of max)</span>}
              </h2>
              {mixedRubrics && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <strong>Note:</strong> Chart shows normalized percentages. Rubric changed in April 2026 from 100-point to 55-point scale for AE calls.
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis domain={[0, maxChartScore]} stroke="#64748b" style={{ fontSize: '12px' }} label={{ value: showingBdr ? 'Score' : 'Percentage', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  formatter={(value: any, name: string, props: any) => {
                    if (showingBdr || !props.payload?.rubricVersion) {
                      return [value, name];
                    }
                    const version = props.payload.rubricVersion;
                    const label = name === 'AI Score' ? 'AI' : name === 'Self Score' ? 'Self' : 'Manager';
                    return [`${value}% (${version})`, label];
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line
                  type="monotone"
                  dataKey="aiScore"
                  stroke="#FFC20E"
                  strokeWidth={3}
                  name="AI Score"
                  dot={{ fill: '#FFC20E', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                {!showingBdr && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="aeScore"
                      stroke="#64748b"
                      strokeWidth={3}
                      name="Self Score"
                      dot={{ fill: '#64748b', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="managerScore"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Manager Score"
                      dot={{ fill: '#3b82f6', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Section Breakdown Chart */}
          {sectionData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-brand-navy mb-6">
                {showingBdr ? 'Stage Performance' : 'Section Performance'} (Last 5 Evaluations)
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={sectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {activeSections.map(section => (
                    <Bar key={section} dataKey={section} fill={STAGE_COLORS[section] || '#8884d8'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
};
