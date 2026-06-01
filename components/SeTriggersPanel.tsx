import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { SeTriggersV2 } from '../types';

const SE_TRIGGER_LABELS: Record<string, string> = {
  T1:  'Complex multi-site or multi-country deployment',
  T2:  'Custom integration requirement mentioned',
  T3:  'Data migration from existing system required',
  T4:  'Procurement / formal tender process indicated',
  T5:  'Multiple decision-makers or committee sign-off',
  T6:  'Compliance or regulatory requirement cited',
  T7:  'Enterprise user count (200+ employees)',
  T8:  'Technical stakeholder present or requested',
  T9:  'Current system deeply customised',
  T10: 'False capability commitment made by AE',
};

const RECOMMENDATION_CONFIG = {
  NO_SE:           { label: 'No SE Required',        color: 'bg-green-100 text-green-800 border-green-300' },
  FLAG_FOR_REVIEW: { label: 'Flag for SE Review',    color: 'bg-amber-100 text-amber-800 border-amber-300' },
  MANDATORY_SE:    { label: 'Mandatory SE Involvement', color: 'bg-red-100 text-red-800 border-red-300' },
};

interface SeTriggersProps {
  seTriggers: SeTriggersV2;
}

export const SeTriggersPanel: React.FC<SeTriggersProps> = ({ seTriggers }) => {
  const [expanded, setExpanded] = useState(false);
  const rec = RECOMMENDATION_CONFIG[seTriggers.recommendation];

  const triggerKeys = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10'] as const;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={16} className="text-slate-500 flex-shrink-0" />
          <span className="text-sm font-bold text-slate-700">SE Triggers</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${rec.color}`}>
            {rec.label}
          </span>
          <span className="text-xs text-slate-400">
            {seTriggers.totalCount} of 10 detected
          </span>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-2 bg-white">
          {triggerKeys.map(key => {
            const triggered = seTriggers[key];
            const note = seTriggers[`${key}_note` as keyof SeTriggersV2] as string | undefined;
            return (
              <div key={key} className="flex items-start gap-3">
                {triggered
                  ? <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  : <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <span className={`text-sm ${triggered ? 'font-semibold text-red-700' : 'text-gray-500'}`}>
                    <span className="font-mono text-xs mr-1 opacity-60">{key}</span>
                    {SE_TRIGGER_LABELS[key]}
                  </span>
                  {triggered && note && (
                    <p className="text-xs text-red-600 mt-0.5 italic">{note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
