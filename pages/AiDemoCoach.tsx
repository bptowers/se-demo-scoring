import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bot, Headphones, Loader2, Mic, WifiOff } from 'lucide-react';

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
}>;

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

const StepNumber: React.FC<{ n: number }> = ({ n }) => (
  <span className="w-7 h-7 flex-shrink-0 rounded-full bg-brand-yellow text-brand-navy text-sm font-black flex items-center justify-center">
    {n}
  </span>
);

export const AiDemoCoach: React.FC = () => {
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;
  const [status, setStatus] = useState<WidgetStatus>('loading');

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

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
          <Bot className="w-7 h-7" /> AI Demo Coach
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Rehearse your Simpro demo out loud with a voice AI that plays the customer — before you run it live.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wide mb-4">How it works</h2>
        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <StepNumber n={1} />
            <div>
              <p className="font-semibold text-brand-navy text-sm">Click the chat bubble</p>
              <p className="text-sm text-slate-600 mt-0.5">
                Look for the floating bubble in the bottom corner of this page. It only appears here — not
                anywhere else in the app.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <StepNumber n={2} />
            <div>
              <p className="font-semibold text-brand-navy text-sm flex items-center gap-1.5">
                <Mic className="w-4 h-4" /> Allow microphone access
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                Your browser will ask once. Use a headset if you can — it stops the coach hearing its own voice
                back through your speakers.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <StepNumber n={3} />
            <div>
              <p className="font-semibold text-brand-navy text-sm">Talk through your demo</p>
              <p className="text-sm text-slate-600 mt-0.5">
                Open as you would on a real call, set the agenda, then walk the workflow. The coach will push
                back, ask objection-style questions, and let you practise recovering. Try a full run rather than
                isolated snippets.
              </p>
            </div>
          </li>
        </ol>
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
          <Headphones className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Practice sessions are not scored and do not appear in your Trends or Call History. Leaving this page
            ends the conversation.
          </p>
        </div>
      </div>

      {/* Not configured */}
      {!agentId && (
        <div className="bg-white border border-amber-200 rounded-xl shadow-sm p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-brand-navy text-sm">AI Demo Coach is not configured yet</p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Set{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 text-brand-navy font-mono text-xs">
                VITE_ELEVENLABS_AGENT_ID
              </code>{' '}
              in your{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 text-brand-navy font-mono text-xs">.env</code>{' '}
              file to the agent ID from the ElevenLabs dashboard, then restart the dev server. Deployed builds
              need the same variable present at build time.
            </p>
          </div>
        </div>
      )}

      {/* Script failed to load */}
      {agentId && status === 'error' && (
        <div className="bg-white border border-red-200 rounded-xl shadow-sm p-5 flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-brand-navy text-sm">Could not load the voice coach</p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              The widget is served from <span className="font-mono text-xs">unpkg.com</span>. Check your internet
              connection, or ask IT whether that domain is blocked on your network, then reload the page.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {agentId && status === 'loading' && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0" />
          <p className="text-sm text-slate-500">Loading the voice coach…</p>
        </div>
      )}

      {/* The widget renders its UI into its own shadow root, so unmounting this element
          on navigation is what removes the floating bubble. */}
      {agentId && status !== 'error' && <ConvaiWidget agent-id={agentId} />}
    </div>
  );
};
