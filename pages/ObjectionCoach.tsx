import React from 'react';
import { Headphones, Mic, ShieldQuestion } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { JORDAN_AGENT_ID } from '../config/objectionCoachAgent';
import { InlineConvaiWidget, deriveFirstName } from '../components/InlineConvaiWidget';
import { CoachSessionSidebar, CoachStep } from '../components/CoachSessionSidebar';

const SESSION_STEPS: CoachStep[] = [
  {
    title: 'Start the conversation',
    description: 'Open the voice session and meet Jordan, an AI buyer weighing up a change.',
  },
  {
    title: "Handle Jordan's objection",
    description: 'Jordan believes the disruption of changing is not worth the risk. Work the objection.',
  },
  {
    title: 'Review your coaching feedback in ElevenLabs',
    description: 'Jordan evaluates the conversation after it ends. The feedback lives in ElevenLabs.',
  },
];

/** The widget's own start control carries this label — it is the page's primary CTA. */
const START_LABEL = 'Start objection coaching';
const END_LABEL = 'End objection coaching';

export const ObjectionCoach: React.FC = () => {
  const { user } = useAuth();
  const firstName = deriveFirstName(user);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-bold text-brand-yellow uppercase tracking-wider">AI Sales Coaching</p>
        <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2 mt-1">
          <ShieldQuestion className="w-7 h-7" /> AI Objection Coach
        </h1>
        <p className="text-gray-500 text-sm mt-1 max-w-3xl">
          Practise handling tough buyer objections in a live conversation with Jordan, an AI buyer who is
          skeptical that the disruption of change is worth the risk.
        </p>
      </div>

      {/* Guided session workspace: steps beside the coach on desktop, stacked below lg. */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

        <CoachSessionSidebar
          headingId="objection-session-heading"
          heading="Your session"
          steps={SESSION_STEPS}
          footnote={
            <div className="flex items-start gap-2">
              <Headphones className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Practice conversations aren't scored in this app and aren't included in Trends or Call
                History. Jordan's evaluation is produced in ElevenLabs after the call.
              </p>
            </div>
          }
        />

        {/* Coaching area */}
        <section
          aria-labelledby="objection-coaching-heading"
          className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 w-full min-w-0"
        >
          <h2 id="objection-coaching-heading" className="text-lg font-bold text-brand-navy">
            Ready when you are
          </h2>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Jordan is an AI buyer, not an assistant — treat this as a real objection-handling conversation.
            Expect pushback on cost, risk, and the disruption of switching, and work the objection out loud
            the way you would on a live call.
          </p>

          <InlineConvaiWidget
            agentId={JORDAN_AGENT_ID}
            startLabel={START_LABEL}
            endLabel={END_LABEL}
            userName={firstName}
          />

          <p className="text-xs text-slate-500 mt-4 flex items-start gap-2">
            <Mic className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
            Your browser will ask for microphone access once. Leaving this page ends the conversation.
          </p>
        </section>
      </div>
    </div>
  );
};
