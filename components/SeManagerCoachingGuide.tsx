import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { DemoSession, SeCategoryScore, SeCoachingSignals, SeEvaluation } from '../types';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { getSeSessionsByName } from '../services/firestoreService';
import { canonicalSeCategory } from '../utils/scoringHelpers';
import { COACHING_THEMES, getSessionThemeStatuses, getThemeStatuses } from '../utils/seCoachingThemes';
import { THEME_PLAYBOOK, ThemePlaybook } from '../utils/seCoachingPlaybook';

/**
 * Print-ready 1:1 guide for the manager who scored the call. Built entirely from the stored
 * SE scoring result plus the coaching playbook, so it needs no extra model call.
 */

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

const pointsLost = (categories: SeCategoryScore[], name: string): number => {
  const c = categories.find(x => canonicalSeCategory(x.category) === name);
  return c ? c.max_points - c.points_awarded : 0;
};

const categoryPct = (c: SeCategoryScore) => (c.max_points > 0 ? Math.round((c.points_awarded / c.max_points) * 100) : 0);

interface Focus {
  key: string;
  kind: 'theme' | 'category';
  title: string;
  good: string;
  evidence: string[];
  playbook?: ThemePlaybook;
  category: string;
}

const MAX_FOCUSES = 2;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One factual line from the call's coaching signals, so "What happened" never relies on a loosely related quote. */
const signalSummary = (key: string, s: SeCoachingSignals): string | null => {
  switch (key) {
    case 'stated_pain': return `${s.pains_followed_up} of ${plural(s.pain_statements, 'stated pain')} got a follow-up question before a feature was shown.`;
    case 'discovery': return s.pain_statements === 0 ? 'No customer pain was surfaced during the SE\'s part of the call.' : null;
    case 'buying_signals': return `${s.buying_signals_followed_up} of ${plural(s.buying_signals, 'positive reaction')} got a why or impact question.`;
    case 'objections': return [
      s.objections_raised > 0 ? `${s.objections_probed} of ${plural(s.objections_raised, 'objection')} probed before answering.` : '',
      s.price_positioning > 0 ? `Positioned on price ${plural(s.price_positioning, 'time')}.` : '',
    ].filter(Boolean).join(' ');
    case 'quantify': return `None of the ${plural(s.pain_statements, 'stated pain')} was sized with a number.`;
    case 'emotional': return 'No question about the personal impact of the pain.';
    case 'day_in_life': return s.off_target_flows > 0 ? `${plural(s.off_target_flows, 'workflow')} shown that didn't fit this prospect's trade or stated needs.` : null;
    case 'value': return s.current_state_comparisons === 0 ? 'No comparison with how the prospect works today.' : null;
    case 'check_ins': return `${plural(s.open_check_ins, 'open check-in')} against ${plural(s.closed_check_ins, 'closed check-in')}.`;
    case 'framing': return `Segment framing: ${s.segment_framing}. ${plural(s.closing_recaps, 'closing recap')}.`;
    case 'call_control': return 'The prospect took over or the call drifted, and the SE didn\'t redirect.';
    case 'language': return s.glitch_narration > 0 ? `Narrated a demo problem ${plural(s.glitch_narration, 'time')}.` : null;
    default: return null;
  }
};

const pickFocuses = (evaluation: SeEvaluation): Focus[] => {
  const categories = evaluation.category_scores ?? [];
  const statuses = getThemeStatuses(evaluation);
  const signals = evaluation.coaching_signals;

  if (statuses && signals) {
    const gaps = COACHING_THEMES
      .filter(t => !t.dealHealthOnly && statuses[t.key] === 'gap' && THEME_PLAYBOOK[t.key])
      .map((t, order) => ({ t, order, lost: pointsLost(categories, THEME_PLAYBOOK[t.key].category) }))
      // Most points lost first; ties keep the framework's priority order.
      .sort((a, b) => b.lost - a.lost || a.order - b.order);

    // Prefer focuses from different categories so the two don't overlap.
    const chosen: typeof gaps = [];
    for (const g of gaps) {
      if (chosen.length >= MAX_FOCUSES) break;
      if (!chosen.some(c => THEME_PLAYBOOK[c.t.key].category === THEME_PLAYBOOK[g.t.key].category)) chosen.push(g);
    }
    for (const g of gaps) {
      if (chosen.length >= MAX_FOCUSES) break;
      if (!chosen.includes(g)) chosen.push(g);
    }

    if (chosen.length > 0) {
      return chosen.map(({ t }) => {
        const pb = THEME_PLAYBOOK[t.key];
        const quotes = signals.evidence.filter(e => pb.signals.includes(e.signal)).slice(0, 2).map(e => e.quote);
        const summary = signalSummary(t.key, signals);
        return {
          key: t.key,
          kind: 'theme' as const,
          title: t.label,
          good: t.good,
          evidence: [...(summary ? [summary] : []), ...quotes],
          playbook: pb,
          category: pb.category,
        };
      });
    }
  }

  // Calls scored before coaching signals existed: fall back to the categories that lost the most points.
  return [...categories]
    .filter(c => c.max_points - c.points_awarded > 0)
    .sort((a, b) => (b.max_points - b.points_awarded) - (a.max_points - a.points_awarded))
    .slice(0, MAX_FOCUSES)
    .map(c => ({
      key: canonicalSeCategory(c.category),
      kind: 'category' as const,
      title: canonicalSeCategory(c.category),
      good: c.coaching_note,
      evidence: (c.negative_evidence_or_gaps ?? []).filter(e => e && e !== 'Not Observed.').slice(0, 2),
      category: canonicalSeCategory(c.category),
    }));
};

const Section: React.FC<{ title: string; children: React.ReactNode; tone?: string }> = ({ title, children, tone = 'text-brand-navy' }) => (
  <section className="guide-section bg-white border border-gray-200 rounded-xl p-5">
    <h2 className={`text-sm font-bold uppercase tracking-wide mb-3 ${tone}`}>{title}</h2>
    {children}
  </section>
);

export const SeManagerCoachingGuide: React.FC<{ session: DemoSession; onBack: () => void }> = ({ session, onBack }) => {
  const { user } = useAuth();
  const evaluation = session.seScoring!.evaluations[0];
  const result = evaluation.overall_result;
  const callSummary = session.seScoring!.call_summary;
  const seName = session.callDeliveredBy || evaluation.target_se_name || 'Sales Engineer';
  const focuses = pickFocuses(evaluation);
  const signals = evaluation.coaching_signals;
  const statuses = getThemeStatuses(evaluation);

  const [earlier, setEarlier] = useState<DemoSession[] | null>(null);
  useEffect(() => {
    if (!session.callDeliveredBy) { setEarlier([]); return; }
    let cancelled = false;
    getSeSessionsByName(session.callDeliveredBy)
      .then(all => {
        if (cancelled) return;
        setEarlier(all.filter(s =>
          s.id !== session.id &&
          !!s.seScoring?.evaluations?.[0] &&
          s.createdAt.getTime() < session.createdAt.getTime()
        ));
      })
      .catch(() => { if (!cancelled) setEarlier([]); });
    return () => { cancelled = true; };
  }, [session.id, session.callDeliveredBy]);

  const patternLine = (f: Focus): string => {
    if (earlier === null) return 'Checking earlier calls…';
    if (f.kind === 'theme') {
      const withSignals = earlier.map(getSessionThemeStatuses).filter(Boolean) as Record<string, string | null>[];
      const applicable = withSignals.filter(s => s[f.key] !== null);
      if (applicable.length === 0) return 'First scored call with coaching themes for this SE, so no pattern yet.';
      const gaps = applicable.filter(s => s[f.key] === 'gap').length;
      const calls = plural(applicable.length, 'earlier call');
      if (gaps === 0) return `Not a gap on their ${calls}, so likely a one-off.`;
      if (applicable.length < 3) return `Also a gap on ${gaps} of their ${calls}. Too few calls yet to call it a habit.`;
      return `Also a gap on ${gaps} of their ${calls}${gaps === applicable.length ? ', so this is a habit.' : '.'}`;
    }
    const pcts = earlier
      .map(s => s.seScoring!.evaluations[0].category_scores.find(c => canonicalSeCategory(c.category) === f.category))
      .filter((c): c is SeCategoryScore => !!c)
      .map(categoryPct);
    if (pcts.length === 0) return 'No earlier scored calls for this SE.';
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    return `Averaged ${avg}% in this category across ${pcts.length} earlier call${pcts.length !== 1 ? 's' : ''}.`;
  };

  const dealNotes = [
    ...(signals && statuses?.next_step === 'gap' ? ['The call ended without a dated next session. Raise with the AE.'] : []),
    ...evaluation.deal_risk_observations.map(r => `${r.risk.replace(/[.\s]+$/, '')}. ${r.recommended_follow_up}`),
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-5 manager-guide">
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          body, .manager-guide { background: white !important; }
          .manager-guide { max-width: none !important; padding: 0 !important; }
          .guide-section { break-inside: avoid; border-color: #d1d5db !important; padding: 12px 14px !important; }
          .manager-guide > * + * { margin-top: 10px !important; }
          .guide-section .space-y-3 > * + * { margin-top: 6px !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between gap-4">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:text-brand-yellow transition-colors">
          <ArrowLeft size={16} /> Back to scorecard
        </button>
        <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-1.5">
          <Printer className="w-4 h-4" /> Download PDF
        </Button>
      </div>

      {/* Header */}
      <div className="guide-section bg-brand-navy text-white rounded-xl overflow-hidden" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
        <div className="bg-brand-yellow h-1.5 w-full" />
        <div className="px-6 py-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-brand-yellow text-xs font-bold uppercase tracking-widest mb-1">Manager Coaching Guide</p>
            <h1 className="text-2xl font-black">{seName}</h1>
            <p className="text-slate-300 text-sm mt-1">
              {session.customerName || callSummary.customer_company || 'Customer not recorded'} · {formatDate(session.createdAt)}
            </p>
            {user?.displayName && <p className="text-slate-400 text-xs mt-1">Prepared by {user.displayName}</p>}
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-brand-yellow">{result.final_score}<span className="text-xl text-slate-400">/100</span></p>
            <p className="text-xs font-bold mt-1">{result.result} · {result.performance_band}</p>
          </div>
        </div>
      </div>

      {/* Priority */}
      <Section title="The one thing for this 1:1" tone="text-amber-800">
        <p className="text-sm font-semibold text-slate-900">{evaluation.coaching_plan.top_priority || 'See coaching focuses below.'}</p>
        {evaluation.coaching_plan.manager_notes && <p className="text-sm text-slate-700 mt-2 leading-relaxed">{evaluation.coaching_plan.manager_notes}</p>}
        {result.caps_applied.length > 0 && (
          <p className="text-xs text-red-700 mt-3">
            Score capped: {result.caps_applied.map(c => `max ${c.cap} (${c.reason})`).join('; ')}
          </p>
        )}
      </Section>

      {/* Strengths */}
      {evaluation.strengths.length > 0 && (
        <Section title="Start with what went well" tone="text-green-800">
          <ul className="space-y-2">
            {evaluation.strengths.slice(0, 3).map((s, i) => (
              <li key={i} className="text-sm">
                <span className="font-bold text-slate-900">{s.strength}.</span>{' '}
                <span className="text-slate-700">{s.evidence}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Focuses */}
      {focuses.map((f, i) => (
        <Section key={f.key} title={`Coaching focus ${i + 1}: ${f.title}`} tone="text-red-800">
          <div className="space-y-3 text-sm">
            {f.evidence.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">What happened</p>
                {f.evidence.map((e, j) => <p key={j} className="text-slate-800 border-l-4 border-red-200 pl-3 mt-1">{e}</p>)}
              </div>
            )}
            {f.good && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">What good looks like</p>
                <p className="text-slate-800 mt-1">{f.good}</p>
              </div>
            )}
            {f.playbook && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Instead of</p>
                  <p className="text-slate-800 mt-1">{f.playbook.instead}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Try</p>
                  <p className="text-slate-800 mt-1">{f.playbook.tryThis}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ask the SE</p>
              <p className="text-slate-800 mt-1 italic">
                "{f.playbook?.askTheSe ?? 'Talk me through this part of the call. What would you do differently next time?'}"
              </p>
            </div>
            {f.playbook && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Drill to set</p>
                <p className="text-slate-800 mt-1">{f.playbook.drill}</p>
              </div>
            )}
            <p className="text-xs text-slate-500">{patternLine(f)}</p>
          </div>
        </Section>
      ))}

      {/* Scores */}
      <Section title="Category scores">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {evaluation.category_scores.map(c => (
            <div key={c.category} className="flex justify-between text-sm border-b border-gray-100 py-1">
              <span className="text-slate-700">{canonicalSeCategory(c.category)}</span>
              <span className={`font-bold ${categoryPct(c) < 60 ? 'text-red-700' : categoryPct(c) < 75 ? 'text-amber-700' : 'text-green-700'}`}>
                {c.points_awarded}/{c.max_points}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* AE sync */}
      {dealNotes.length > 0 && (
        <Section title="For the AE sync (not for the SE 1:1)">
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {dealNotes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </Section>
      )}

      {/* Agreed actions */}
      <Section title="Agreed actions">
        <div className="space-y-5 text-sm text-slate-500">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-end gap-3">
              <span className="font-bold">{n}.</span>
              <div className="flex-1 border-b border-gray-300 h-5" />
            </div>
          ))}
          <div className="flex flex-wrap gap-8 pt-2">
            <div className="flex items-end gap-2"><span>Follow-up date</span><div className="w-40 border-b border-gray-300 h-5" /></div>
            <div className="flex items-end gap-2"><span>Next call to review</span><div className="w-48 border-b border-gray-300 h-5" /></div>
          </div>
        </div>
      </Section>
    </div>
  );
};
