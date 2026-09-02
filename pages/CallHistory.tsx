import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Filter, ExternalLink, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getManagerConfig, getDirectReports, ALL_SES_SENTINEL } from '../config/managerConfig';
import { getSeSessionsForManager, getSeSessionsByName, getUserEvaluations, deleteEvaluation } from '../services/firestoreService';
import { deleteEvaluationAsManager } from '../services/adminService';
import { calculateTotalScore, getScoreInterpretation, getInterpretationLabel, getInterpretationColor, getBdrGrade, getBdrGradeLabel, getBdrGradeColor } from '../utils/scoringHelpers';
import { DemoSession, SCORING_RUBRIC, BDR_SCORING_RUBRIC } from '../types';
import { AeSessionScorecard } from '../components/AeSessionScorecard';
import { SeCallScorecard } from '../components/SeCallScorecard';

export const CallHistory: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<DemoSession | null>(null);
  const [search, setSearch] = useState('');
  const [filterAe, setFilterAe] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const managerConfig = getManagerConfig(user?.email);
  const isGlobalManager = managerConfig?.directReports.includes(ALL_SES_SENTINEL) ?? false;
  const isManager = !!managerConfig;

  // Full AE roster from config (not just those who have sessions)
  const allAeNames: string[] = isManager
    ? getDirectReports(managerConfig!).sort()
    : [];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setLoading(true);
        let data: DemoSession[];
        if (isManager) {
          // Fetch from the SE sessions collection (dual-written on completion) AND the manager's own
          // user subcollection (covers sessions scored before dual-write was added)
          const [fromCollection, fromOwn] = await Promise.all([
            getSeSessionsForManager(),
            getUserEvaluations(user.uid),
          ]);
          // Merge and deduplicate by session ID
          const merged = [...fromCollection];
          const seen = new Set(merged.map(s => s.id));
          for (const s of fromOwn) {
            if (!seen.has(s.id)) { merged.push(s); seen.add(s.id); }
          }
          if (isGlobalManager) {
            data = merged;
          } else {
            const reports = getDirectReports(managerConfig!);
            data = merged.filter(s => reports.includes(s.callDeliveredBy || ''));
          }
        } else {
          const [ownSessions, scoredForMe] = await Promise.all([
            getUserEvaluations(user.uid),
            user.displayName ? getSeSessionsByName(user.displayName) : Promise.resolve([] as DemoSession[]),
          ]);
          const merged = [...ownSessions];
          const seen = new Set(merged.map(s => s.id));
          for (const s of scoredForMe) {
            if (!seen.has(s.id)) { merged.push(s); seen.add(s.id); }
          }
          data = merged;
        }
        // Show completed sessions with any scoring payload.
        setSessions(data.filter(s => (s.status === 'complete' || s.status === 'scoring') && (s.aiScoring || s.aiV2 || s.seScoring)));
      } catch (e) {
        setError('Failed to load call history.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filtered = sessions.filter(s => {
    const name = s.callDeliveredBy || '';
    if (filterAe !== 'all') return name === filterAe;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const formatDate = (date: Date | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDisplayScore = (session: DemoSession): { score: number; max: number } => {
    if (session.seScoring?.evaluations?.[0]) return { score: session.seScoring.evaluations[0].overall_result.final_score, max: 100 };
    if (session.aiV2) return { score: session.aiV2.combinedTotal, max: 55 };
    const score = calculateTotalScore(session.aiScoring);
    const max = session.rubricType === 'BDR' ? 46 : 100;
    return { score, max };
  };

  const handleDelete = async (session: DemoSession) => {
    if (!user) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (session.userId && session.userId !== user.uid) {
        // Deleting a report's session from a manager's team view — must go through
        // the privileged Cloud Function since Firestore rules only let the true
        // owner delete their own `users/{uid}/evaluations/{id}` record.
        await deleteEvaluationAsManager(session.userId, session.id);
      } else {
        await deleteEvaluation(user.uid, session.id, {
          rubricType: session.rubricType,
          hasAiScoring: !!(session.aiScoring || session.aiV2 || session.seScoring),
        });
      }
      setSessions(prev => prev.filter(s => s.id !== session.id));
      setConfirmDeleteId(null);
    } catch (e) {
      console.error('Failed to delete session:', e);
      setDeleteError('Could not delete this session.');
    } finally {
      setDeleting(false);
    }
  };

  const getTierBadge = (session: DemoSession) => {
    if (session.seScoring?.evaluations?.[0]) {
      const result = session.seScoring.evaluations[0].overall_result;
      const colors = result.result === 'Pass'
        ? 'text-green-700 bg-green-50 border-green-200'
        : 'text-red-700 bg-red-50 border-red-200';
      return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors}`}>{result.result}</span>;
    }
    if (session.aiV2) {
      const rag = session.aiV2.ragRating;
      const colors = rag === 'GREEN' ? 'text-green-700 bg-green-50 border-green-200'
        : rag === 'AMBER' ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-red-700 bg-red-50 border-red-200';
      return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors}`}>{rag}</span>;
    }
    const score = calculateTotalScore(session.aiScoring);
    if (session.rubricType === 'BDR') {
      const grade = getBdrGrade(score);
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getBdrGradeColor(grade)}`}>
          {getBdrGradeLabel(grade)}
        </span>
      );
    }
    const interp = getScoreInterpretation(score);
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getInterpretationColor(interp)}`}>
        {getInterpretationLabel(interp)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (selectedSession) {
    if (selectedSession.seScoring) {
      return <SeCallScorecard session={selectedSession} onBack={() => setSelectedSession(null)} />;
    }
    return <AeSessionScorecard session={selectedSession} onBack={() => setSelectedSession(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-brand-navy">Call History</h1>
          <p className="text-slate-500 mt-1">
            {isGlobalManager
              ? 'Showing all scored calls across the entire team.'
              : isManager
              ? `Showing scored calls for your direct reports.`
              : 'Showing your scored calls.'}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SE name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setFilterAe('all'); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-navy"
            />
          </div>
          {isManager && (
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterAe}
                onChange={e => { setFilterAe(e.target.value); setSearch(''); }}
                className="border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-brand-navy"
              >
                <option value="all">All SEs</option>
                {allAeNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}
          <span className="text-sm text-slate-400 ml-auto">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">{error}</div>
        )}

        {/* Empty state */}
        {!error && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
            <p className="text-slate-400 text-lg font-medium">No completed sessions found.</p>
            <p className="text-slate-400 text-sm mt-1">Score a call to see it here.</p>
          </div>
        )}

        {/* Session list */}
        <div className="space-y-2">
          {filtered.map(session => {
            const { score, max: maxScore } = getDisplayScore(session);
            const isBdr = session.rubricType === 'BDR';
            const isExpanded = expandedId === session.id;
            const rubric = isBdr ? BDR_SCORING_RUBRIC : SCORING_RUBRIC;
            const isConfirming = confirmDeleteId === session.id;

            return (
              <div key={session.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">

                {/* Row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors">
                  <div
                    className="col-span-3 sm:col-span-2 cursor-pointer"
                    onClick={() => !isConfirming && (isBdr ? setExpandedId(isExpanded ? null : session.id) : setSelectedSession(session))}
                  >
                    <p className="text-sm text-slate-500">{formatDate(session.completedAt)}</p>
                  </div>
                  <div
                    className="col-span-3 sm:col-span-3 cursor-pointer"
                    onClick={() => !isConfirming && (isBdr ? setExpandedId(isExpanded ? null : session.id) : setSelectedSession(session))}
                  >
                    <p className="text-sm font-semibold text-brand-navy truncate">
                      {session.callDeliveredBy || 'Unknown'}
                    </p>
                  </div>
                  <div
                    className="col-span-2 text-center cursor-pointer"
                    onClick={() => !isConfirming && (isBdr ? setExpandedId(isExpanded ? null : session.id) : setSelectedSession(session))}
                  >
                    <p className="text-xl font-black text-brand-navy">{score}</p>
                    <p className="text-xs text-slate-400">/ {maxScore}</p>
                  </div>
                  <div
                    className="col-span-2 sm:col-span-3 flex items-center gap-2 flex-wrap cursor-pointer"
                    onClick={() => !isConfirming && (isBdr ? setExpandedId(isExpanded ? null : session.id) : setSelectedSession(session))}
                  >
                    {getTierBadge(session)}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${isBdr ? 'text-purple-700 bg-purple-50 border-purple-200' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
                      {isBdr ? 'BDR' : 'SE'}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end items-center gap-2">
                    {!isConfirming ? (
                      <>
                        <button
                          onClick={() => setConfirmDeleteId(session.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete this session"
                        >
                          <Trash2 size={15} />
                        </button>
                        <div
                          className="cursor-pointer"
                          onClick={() => isBdr ? setExpandedId(isExpanded ? null : session.id) : setSelectedSession(session)}
                        >
                          {isBdr
                            ? (isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />)
                            : <ExternalLink size={16} className="text-brand-navy" />
                          }
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {deleteError && confirmDeleteId === session.id && (
                          <span className="text-xs text-red-600 whitespace-nowrap">{deleteError}</span>
                        )}
                        <span className="text-xs text-slate-500 whitespace-nowrap">Delete?</span>
                        <button
                          onClick={() => handleDelete(session)}
                          disabled={deleting}
                          className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detail panel — BDR only (AE sessions open full AeCallScorecard) */}
                {isExpanded && isBdr && session.aiScoring && (
                  <div className="border-t border-slate-100 bg-slate-50 px-6 py-6">

                    {/* Executive summary */}
                    {session.aiScoring.executiveSummary && (
                      <div className="mb-6 bg-white rounded-lg border border-slate-200 p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Executive Summary</p>
                        <p className="text-sm text-slate-700">{session.aiScoring.executiveSummary}</p>
                      </div>
                    )}

                    {/* BDR metadata */}
                    {isBdr && (session.aiScoring.prospectCompany || session.aiScoring.contactName) && (
                      <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
                        {session.aiScoring.prospectCompany && <span><span className="font-semibold">Company:</span> {session.aiScoring.prospectCompany}</span>}
                        {session.aiScoring.contactName && <span><span className="font-semibold">Contact:</span> {session.aiScoring.contactName}</span>}
                        {session.aiScoring.callDuration && <span><span className="font-semibold">Duration:</span> {session.aiScoring.callDuration}</span>}
                        {session.aiScoring.demoBooked !== undefined && (
                          <span className={`font-semibold ${session.aiScoring.demoBooked ? 'text-green-600' : 'text-red-600'}`}>
                            {session.aiScoring.demoBooked ? 'Demo Booked' : 'No Demo Booked'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Criteria table */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-brand-navy text-white">
                            <th className="text-left px-4 py-3 font-semibold w-1/4">Criterion</th>
                            <th className="text-center px-3 py-3 font-semibold w-20">Score</th>
                            <th className="text-left px-4 py-3 font-semibold w-5/12">Observation</th>
                            <th className="text-left px-4 py-3 font-semibold">Coaching</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rubric.map((criterion, idx) => {
                            const scoreEntry = session.aiScoring!.scores.find(s => s.criterionId === criterion.id);
                            const pct = scoreEntry ? (scoreEntry.score / criterion.maxPoints) * 100 : 0;
                            const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                            const scoreColor = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
                            return (
                              <tr key={criterion.id} className={rowBg}>
                                <td className="px-4 py-3 font-medium text-brand-navy align-top">
                                  <span className="block">{criterion.name}</span>
                                  <span className="text-xs text-slate-400">{criterion.section}</span>
                                </td>
                                <td className="px-3 py-3 text-center align-top">
                                  <span className={`font-bold ${scoreColor}`}>{scoreEntry?.score ?? 0}</span>
                                  <span className="text-slate-400">/{criterion.maxPoints}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 align-top text-xs leading-relaxed">
                                  {scoreEntry?.reasoning || '—'}
                                </td>
                                <td className="px-4 py-3 text-slate-600 align-top text-xs leading-relaxed">
                                  {scoreEntry?.coaching || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
