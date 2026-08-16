import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, WifiOff } from 'lucide-react';

/*
 * Shared ElevenLabs Conversational AI widget host, used by every coach page (Morgan's
 * discovery coach, Jordan's objection coach). Agent-agnostic by design: the caller supplies
 * the agent ID and the call-button labels, nothing here knows which coach it is rendering.
 *
 * The CDN bundle ends with an UNGUARDED `customElements.define('elevenlabs-convai', ...)`
 * (verified: 1 x define, 0 x customElements.get in the 0.15.1 bundle). This app is a
 * HashRouter SPA, so coach routes mount and unmount many times without a page reload —
 * re-executing the script would throw NotSupportedError.
 *
 * Rules enforced below:
 *  1. ONE module-level promise for the whole app. This module existing exactly once is the
 *     reason two coach pages cannot race to append two <script> tags.
 *  2. The script is appended on first mount of a coach page only, never app-wide, so the
 *     widget cannot leak onto other routes.
 *  3. The promise makes the loader idempotent across remounts and across React.StrictMode's
 *     double-invoked effects.
 *  4. The script tag is NEVER removed on success. Removing a <script> does not un-register a
 *     custom element (there is no un-define API), so a remove-then-re-add loader — including
 *     the one in ElevenLabs' own React docs — breaks on the second visit. Removal happens
 *     only on load failure, where nothing was ever registered.
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
// NOTE: `dynamic-variables` and the other hyphenated attributes are deliberately absent
// above. Passing them as React props did not produce HTML attributes on the custom element
// (verified in the browser: getAttribute('dynamic-variables') returned null), so they are
// set imperatively via the ref below. That also guarantees the attributes exist before the
// CDN script upgrades the element and reads them.

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

/**
 * First name only, for the coach to address the SE by. Never send the email, the UID, or
 * the full display name — the coach needs a form of address, not an identity, and every
 * dynamic variable is transmitted to ElevenLabs.
 */
export const deriveFirstName = (
  user: { displayName: string | null; email: string | null } | null
): string => {
  const fromDisplay = user?.displayName?.trim().split(/\s+/)[0];
  if (fromDisplay) return fromDisplay;

  // brad.towers@simprogroup.com → "Brad" — first token only, never the whole local part.
  const fromEmail = user?.email?.split('@')[0]?.split(/[._\-+]/)[0];
  if (fromEmail) return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1).toLowerCase();

  return 'there';
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
 * Everything here is client-side presentation only — it does not touch any agent's own
 * server-side configuration.
 */
const BASE_WIDGET_ATTRIBUTES: Record<string, string> = {
  variant: 'full',
  'default-expanded': 'true',
  dismissible: 'false',
  'avatar-orb-color-1': '#ffc20e',
  'avatar-orb-color-2': '#e0a800',
};

type WidgetStatus = 'loading' | 'ready' | 'error';

export interface InlineConvaiWidgetProps {
  /** Public ElevenLabs agent ID for this coach. */
  agentId: string;
  /** Label on the widget's own start control — this is the page's primary CTA. */
  startLabel: string;
  /** Label shown once a conversation is running. */
  endLabel: string;
  /** Resolved first name, injected as the `user_name` dynamic variable. */
  userName: string;
}

/**
 * Renders the real widget inline inside a fixed-size stage. Starting a conversation is left
 * entirely to the user's click on the widget's own control — this component adds no
 * auto-start, auto-connect or on-mount conversation logic of any kind.
 */
export const InlineConvaiWidget: React.FC<InlineConvaiWidgetProps> = ({
  agentId,
  startLabel,
  endLabel,
  userName,
}) => {
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const widgetRef = useRef<HTMLElement | null>(null);

  const dynamicVariables = useMemo(() => JSON.stringify({ user_name: userName }), [userName]);
  const textContents = useMemo(
    () => JSON.stringify({ start_call: startLabel, end_call: endLabel }),
    [startLabel, endLabel]
  );

  useEffect(() => {
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

  // Attributes and host styles are applied imperatively — see the NOTE on ConvaiWidget.
  // Runs on mount (while status is still 'loading', so before the CDN script upgrades the
  // element) and again if the resolved name or labels change.
  useEffect(() => {
    const el = widgetRef.current;
    if (!el) return;

    el.setAttribute('dynamic-variables', dynamicVariables);
    el.setAttribute('text-contents', textContents);
    Object.entries(BASE_WIDGET_ATTRIBUTES).forEach(([name, value]) => el.setAttribute(name, value));
    Object.assign(el.style, HOST_STYLE);
  }, [dynamicVariables, textContents, agentId, status]);

  if (status === 'error') {
    return (
      <div className="mt-5 border border-red-200 bg-red-50/50 rounded-lg p-4 flex items-start gap-3">
        <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-bold text-brand-navy text-sm">Could not load the voice coach</p>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            The widget is served from <span className="font-mono text-xs">unpkg.com</span>. Check your internet
            connection, or ask IT whether that domain is blocked on your network, then reload the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    /*
      Stage sizing, both values established by measuring the real widget:
        - Definite height, not min-height: the host uses height:100%, and a percentage
          height cannot resolve against a parent sized only by min-height — the host
          collapses to 0 and the widget's absolutely-positioned panel has no box to lay
          out in. Verified in-browser: min-height gave a 0px-tall host.
        - max-w-[29rem]: the widget's panel scales with the host but caps at 400x398, and
          its own overlay adds a 32px inset per side. 29rem (464px) is therefore the width
          at which the panel exactly fills the stage. Left wider, the panel sits in the
          stage's bottom-right corner — the launcher look this layout exists to remove.
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
  );
};
