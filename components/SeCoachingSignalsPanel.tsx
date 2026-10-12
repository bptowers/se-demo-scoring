import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SeEvaluation } from '../types';
import { COACHING_THEMES, ThemeLayer, ThemeStatus, getThemeStatuses } from '../utils/seCoachingThemes';

const LAYERS: ThemeLayer[] = ['Discovery', 'Demo', 'Execution'];

const statusChip = (status: ThemeStatus, dealHealthOnly?: boolean) => {
  if (status === null) {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Didn't come up</span>;
  }
  if (status === 'ok') {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">On track</span>;
  }
  return dealHealthOnly
    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Not booked</span>
    : <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">Gap</span>;
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg px-3 py-2">
    <p className="text-[11px] text-slate-500 font-semibold">{label}</p>
    <p className="text-sm font-black text-brand-navy">{value}</p>
  </div>
);

export const SeCoachingSignalsPanel: React.FC<{ evaluation: SeEvaluation }> = ({ evaluation }) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const signals = evaluation.coaching_signals;
  const statuses = getThemeStatuses(evaluation);

  if (!signals || !statuses) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wide mb-2">Coaching Themes</h2>
        <p className="text-sm text-slate-500">This call was scored before coaching themes were added. Re-score it to see them.</p>
      </div>
    );
  }

  const gapCount = COACHING_THEMES.filter(t => !t.dealHealthOnly && statuses[t.key] === 'gap').length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-brand-navy flex items-center justify-between">
        <h2 className="text-sm font-bold text-brand-yellow uppercase tracking-wide">Coaching Themes</h2>
        <span className="text-xs text-slate-300 font-semibold">{gapCount} gap{gapCount !== 1 ? 's' : ''} on this call</span>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Pains followed up" value={`${signals.pains_followed_up} of ${signals.pain_statements}`} />
          <Stat label="Pains sized" value={`${signals.pains_sized} of ${signals.pain_statements}`} />
          <Stat label="Buying signals explored" value={`${signals.buying_signals_followed_up} of ${signals.buying_signals}`} />
          <Stat label="Check-ins open / closed" value={`${signals.open_check_ins} / ${signals.closed_check_ins}`} />
          <Stat label="Segment framing" value={signals.segment_framing} />
          <Stat label="Closing recaps" value={String(signals.closing_recaps)} />
          <Stat label="Current-state comparisons" value={String(signals.current_state_comparisons)} />
          <Stat label="Objections probed" value={`${signals.objections_probed} of ${signals.objections_raised}`} />
        </div>

        {LAYERS.map(layer => (
          <div key={layer}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{layer}</h3>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {COACHING_THEMES.filter(t => t.layer === layer).map(theme => (
                <div key={theme.key} className="flex items-start justify-between gap-4 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-navy">
                      {theme.label}
                      {theme.dealHealthOnly && <span className="ml-2 text-[11px] font-semibold text-slate-400">Deal health, not scored</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{theme.good}</p>
                  </div>
                  <div className="flex-shrink-0 pt-0.5">{statusChip(statuses[theme.key], theme.dealHealthOnly)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {signals.evidence.length > 0 && (
          <div>
            <button
              onClick={() => setShowEvidence(v => !v)}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-navy hover:text-brand-yellow transition-colors"
            >
              {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showEvidence ? 'Hide' : 'Show'} supporting quotes ({signals.evidence.length})
            </button>
            {showEvidence && (
              <div className="mt-3 space-y-2">
                {signals.evidence.map((e, i) => (
                  <div key={i} className="border-l-4 border-slate-200 pl-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{e.signal.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-slate-700">{e.quote}</p>
                    {e.note && <p className="text-xs text-slate-500 mt-0.5">{e.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
