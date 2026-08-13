import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bot, Headphones, Loader2, Mic, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/*
 * ElevenLabs Conversational AI widget loader.
 *
 * The CDN bundle ends with an UNGUARDED `customElements.define('elevenlabs-convai', ...)`
 * (verified: 1 x define, 0 x customElements.get in the 0.15.1 bundle). This app is a
 * HashRouter SPA, so this route mounts and unmounts many times without a page reload —
 * re-executing the script would throw NotSupportedError.
 *
 * Rules enforced below:
 *  1. The script is appended on first mount of this page only, never app-wide, so the
 *     floating bubble cannot leak onto other routes.
 *  2. A module-level promise makes the loader idempotent across remounts and across
 *     React.StrictMode's double-invoked effects.
 *  3. The script tag is NEVER removed on success. Removing a <script> does not
 *     un-register a custom element (there is no un-define API), so a remove-then-re-add
 *     loader — including the one in ElevenLabs' own React docs — breaks on the second
 *     visit. Removal happens only on load failure, where nothing was ever registered.
 *
 * Swapping to a signed-URL flow for a private agent is contained to this file: fetch the
 * signed URL, hold it in state, and pass `signed-url` instead of `agent-id`.
 */

const WIDGET_VERSION = '0.15.1';
const WIDGET_SRC = `https://unpkg.com/@elevenlabs/convai-widget-embed@${WIDGET_VERSION}`;
const WIDGET_TAG = 'elevenlabs-convai';
const SCRIPT_SELECTOR = 'script[data-elevenlabs-convai="true"]';

/**
 * The widget is a custom element, not a known JSX intrinsic. Casting the tag name keeps
 * this contained to one line — no global .d.ts and no @types/react dependency. React 19
 * passes unknown props on custom elements straight through as attributes.
 */
const ConvaiWidget = WIDGET_TAG as unknown as React.FC<{
  'agent-id'?: string;
  /** Alternative to agent-id, for a future private-agent flow. */
  'signed-url'?: string;
  ref?: React.Ref<HTMLElement>;
}>;
// NOTE: `dynamic-variables` is deliberately absent above. Passing it as a React prop did
// not produce an HTML attribute on the custom element (verified in the browser:
// getAttribute('dynamic-variables') returned null), so it is set imperatively via the ref
// below. That also guarantees the attribute exists before the CDN script upgrades the
// element and reads it.

let widgetScriptPromise: Promise<void> | null = null;

const loadWidgetScript = (): Promise<void> => {
  if (widgetScriptPromise) return widgetScriptPromise;

  // Survives Vite HMR resetting the promise above: the registry is per-document and
  // outlives module re-evaluation, so a second <script> must never be appended.
  if (window.customElements?.get(WIDGET_TAG)) {
    widgetScriptPromise = Promise.resolve();
    return widgetScriptPromise;
  }

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('widget-script-error')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = WIDGET_SRC;
    script.async = true;
    script.type = 'text/javascript';
    script.setAttribute('data-elevenlabs-convai', 'true');

    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true }
    );

    script.addEventListener(
      'error',
      () => {
        // The bundle never executed, so nothing was registered. Clearing both the promise
        // and the tag lets a later visit retry cleanly (e.g. the user reconnects to wifi).
        widgetScriptPromise = null;
        script.remove();
        reject(new Error('widget-script-error'));
      },
      { once: true }
    );

    document.head.appendChild(script);
  });

  return widgetScriptPromise;
};

type WidgetStatus = 'loading' | 'ready' | 'error';

/**
 * First name only, for the agent to address the SE by. Never send the email, the UID, or
 * the full display name — the agent needs a form of address, not an identity, and every
 * dynamic variable is transmitted to ElevenLabs.
 */
const deriveFirstName = (user: { displayName: string | null; email: string | null } | null): string => {
  const fromDisplay = user?.displayName?.trim().split(/\s+/)[0];
  if (fromDisplay) return fromDisplay;

  // brad.towers@simprogroup.com → "Brad" — first token only, never the whole local part.
  const fromEmail = user?.email?.split('@')[0]?.split(/[._\-+]/)[0];
  if (fromEmail) return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1).toLowerCase();

  return 'there';
};

const SESSION_STEPS = [
  { title: 'Start the coach', description: 'Open the voice session and meet Morgan, your AI customer.' },
  { title: 'Allow microphone', description: 'Use a headset for the clearest conversation.' },
  { title: 'Run your demo', description: 'Set the agenda, walk the workflow, and handle pushback.' },
];

/*
 * Attributes verified against the @elevenlabs/convai-widget-embed 0.15.1 bundle's own
 * attribute table. Three traps worth knowing before editing:
 *  - `variant` accepts only tiny | compact | full. An unrecognised value (e.g. "expanded")
 *    silently falls back to `tiny`, which SHRINKS the widget.
 *  - `always-expanded` must NOT be used here. Verified twice in the browser (once on an
 *    allowlisted local host, once on production): it makes the widget open a conversation
 *    as the page loads, with no user action, consuming ElevenLabs quota on every visit.
 *    `default-expanded` keeps the same full presentation but leaves starting the session
 *    to the user's own click on the widget's Start control.
 *  - There is no `start-call-text` / `end-call-text` attribute; button labels live in the
 *    `text-contents` JSON blob under `start_call` / `end_call`.
 * Everything here is client-side presentation only — it does not touch the agent's own
 * server-side configuration.
 */
const WIDGET_ATTRIBUTES: Record<string, string> = {
  variant: 'full',
  'default-expanded': 'true',
  dismissible: 'false',
  'avatar-orb-color-1': '#ffc20e',
  'avatar-orb-color-2': '#e0a800',
  'text-contents': JSON.stringify({
    start_call: 'Start practice session',
    end_call: 'End practice session',
  }),
};

/*
 * The widget's shadow root styles :host as `position:fixed; inset:0; pointer-events:none;
 * z-index:1000` — a full-viewport overlay that flexes the panel into a corner. Inline styles
 * on the host outrank shadow :host rules, which is the supported way to pull the element into
 * normal flow; no shadow-DOM selectors are involved.
 *   - `relative`, not `static`: the panel's absolutely-positioned descendants must keep
 *     resolving against the host box rather than escaping to the viewport.
 *   - `zIndex: 0`: stops the widget painting over Layout's sticky z-50 header.
 */
const HOST_STYLE: Partial<CSSStyleDeclaration> = {
  position: 'relative',
  inset: 'auto',
  display: 'block',
  width: '100%',
  height: '100%',
  pointerEvents: 'auto',
  zIndex: '0',
};

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

export const AiDemoCoach: React.FC = () => {
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;
  const { user } = useAuth();
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const widgetRef = useRef<HTMLElement | null>(null);

  // Only reachable behind ProtectedRoute, so a user is normally present — but displayName
  // is nullable on Google accounts without a profile name, hence the fallback chain.
  const dynamicVariables = useMemo(
    () => JSON.stringify({ user_name: deriveFirstName(user) }),
    [user]
  );

  useEffect(() => {
    if (!agentId) return;

    let cancelled = false;
    setStatus('loading');

    loadWidgetScript()
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    // Deliberately no script cleanup — see the header comment. Unmounting the
    // <elevenlabs-convai> element below is what tears the widget down.
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  // Attributes and host styles are applied imperatively — see the NOTE on the ConvaiWidget
  // type. Runs on mount (while status is still 'loading', so before the CDN script upgrades
  // the element) and again if the resolved first name changes once auth settles.
  useEffect(() => {
    const el = widgetRef.current;
    if (!el) return;

    el.setAttribute('dynamic-variables', dynamicVariables);
    Object.entries(WIDGET_ATTRIBUTES).forEach(([name, value]) => el.setAttribute(name, value));
    Object.assign(el.style, HOST_STYLE);
  }, [dynamicVariables, agentId, status]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
          <Bot className="w-7 h-7" /> AI Demo Coach
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Rehearse your Simpro demo out loud with a voice AI that plays the customer — before you run it live.
        </p>
      </div>

      {/* Guided session workspace: steps beside the coach on desktop, stacked below lg. */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

        {/* Session steps */}
        <aside
          aria-labelledby="session-steps-heading"
          className="bg-brand-navy rounded-xl shadow-sm p-6 w-full"
        >
          <h2
            id="session-steps-heading"
            className="text-xs font-bold text-brand-yellow uppercase tracking-wider mb-6"
          >
            Your session
          </h2>
          <ol>
            {SESSION_STEPS.map((step, i) => (
              <SessionStep
                key={step.title}
                n={i + 1}
                title={step.title}
                description={step.description}
                active={i === 0}
                isLast={i === SESSION_STEPS.length - 1}
              />
            ))}
          </ol>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-start gap-2">
            <Headphones className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Practice sessions aren't scored and aren't included in Trends or Call History.
            </p>
          </div>
        </aside>

        {/* Coaching area */}
        <section
          aria-labelledby="coaching-heading"
          className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 w-full min-w-0"
        >
          <h2 id="coaching-heading" className="text-lg font-bold text-brand-navy">
            Ready when you are
          </h2>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Morgan will play the customer, ask realistic questions, and challenge you when the story is not
            clear.
          </p>

          {/* Not configured */}
          {!agentId && (
            <div className="mt-5 border border-amber-200 bg-amber-50/50 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold text-brand-navy text-sm">AI Demo Coach is not configured yet</p>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Set{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-brand-navy font-mono text-xs">
                    VITE_ELEVENLABS_AGENT_ID
                  </code>{' '}
                  in your{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-brand-navy font-mono text-xs">
                    .env
                  </code>{' '}
                  file to the agent ID from the ElevenLabs dashboard, then restart the dev server. Deployed
                  builds need the same variable present at build time.
                </p>
              </div>
            </div>
          )}

          {/* Script failed to load */}
          {agentId && status === 'error' && (
            <div className="mt-5 border border-red-200 bg-red-50/50 rounded-lg p-4 flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold text-brand-navy text-sm">Could not load the voice coach</p>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  The widget is served from <span className="font-mono text-xs">unpkg.com</span>. Check your
                  internet connection, or ask IT whether that domain is blocked on your network, then reload
                  the page.
                </p>
              </div>
            </div>
          )}

          {/*
            Inline widget stage. The custom element sits in normal flow here rather than
            floating in the viewport corner — see HOST_STYLE. The element renders its UI into
            its own shadow root, so unmounting it on navigation is what tears the widget down.
          */}
          {agentId && status !== 'error' && (
            /*
              Stage sizing, both values established by measuring the real widget:
                - Definite height, not min-height: the host uses height:100%, and a percentage
                  height cannot resolve against a parent sized only by min-height — the host
                  collapses to 0 and the widget's absolutely-positioned panel has no box to
                  lay out in. Verified in-browser: min-height gave a 0px-tall host.
                - max-w-[29rem]: the widget's panel scales with the host but caps at 400x398,
                  and its own overlay adds a 32px inset per side. 29rem (464px) is therefore
                  the width at which the panel exactly fills the stage. Left wider, the panel
                  sits in the stage's bottom-right corner — the launcher look this redesign
                  exists to remove. Centred with mx-auto; w-full keeps it inside narrow
                  viewports, where the panel scales down on its own.
            */
            <div className="mt-5 relative rounded-lg bg-slate-50 border border-gray-100 overflow-hidden h-[29rem] w-full max-w-[29rem] mx-auto">
              {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center gap-3">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-slate-500">Loading the voice coach…</p>
                </div>
              )}
              <ConvaiWidget agent-id={agentId} ref={widgetRef} />
            </div>
          )}

          <p className="text-xs text-slate-500 mt-4 flex items-start gap-2">
            <Mic className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
            Your browser will ask for microphone access once. Leaving this page ends the conversation.
          </p>
        </section>
      </div>
    </div>
  );
};
