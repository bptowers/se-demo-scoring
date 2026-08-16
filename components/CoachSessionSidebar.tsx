import React from 'react';

/**
 * Shared navy step sidebar for the live coaching pages. Each coach supplies its own steps
 * and footnote — nothing here is specific to a particular coach or agent.
 */
export interface CoachStep {
  title: string;
  description: string;
}

const SessionStep: React.FC<{
  n: number;
  title: string;
  description: string;
  active: boolean;
  isLast: boolean;
}> = ({ n, title, description, active, isLast }) => (
  <li className={`relative flex items-start gap-4 ${isLast ? '' : 'pb-7'}`}>
    {/* Connector line between markers — omitted on the last step. */}
    {!isLast && (
      <span aria-hidden="true" className="absolute left-4 top-9 bottom-0 w-px bg-white/15" />
    )}
    <span
      className={`relative z-10 w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-black ${
        active
          ? 'bg-brand-yellow text-brand-navy'
          : 'border border-white/25 text-slate-300 bg-brand-navy'
      }`}
    >
      {n}
    </span>
    <div className="min-w-0">
      <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{title}</p>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
    </div>
  </li>
);

export const CoachSessionSidebar: React.FC<{
  headingId: string;
  heading: string;
  steps: CoachStep[];
  footnote: React.ReactNode;
}> = ({ headingId, heading, steps, footnote }) => (
  <aside aria-labelledby={headingId} className="bg-brand-navy rounded-xl shadow-sm p-6 w-full">
    <h2 id={headingId} className="text-xs font-bold text-brand-yellow uppercase tracking-wider mb-6">
      {heading}
    </h2>
    <ol>
      {steps.map((step, i) => (
        <SessionStep
          key={step.title}
          n={i + 1}
          title={step.title}
          description={step.description}
          // Step 1 is styled as the starting point. The widget exposes only a single
          // `elevenlabs-convai:call` event, which is not a reliable progress state machine,
          // so no call progression is faked here.
          active={i === 0}
          isLast={i === steps.length - 1}
        />
      ))}
    </ol>
    <div className="mt-6 pt-4 border-t border-white/10">{footnote}</div>
  </aside>
);
