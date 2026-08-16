/*
 * Public ElevenLabs agent ID for Jordan, the AI buyer used by the AI Objection Coach
 * (`/objection-coach`). Separate from Morgan's discovery coach so the two conversations,
 * and their ElevenLabs-side evaluation data, stay independent.
 *
 * This is a PUBLIC, non-secret identifier — the same class of value as VITE_FIREBASE_*.
 * Access is controlled by the domain allowlist in the agent's own Security settings, not by
 * hiding this ID. It is NOT an API key, and no API key is used anywhere in the client.
 *
 * Committed as a default rather than living only in `.env`, because `.env` is gitignored and
 * there is no CI or hosting-side env injection: a value that exists on one machine silently
 * produces an unconfigured page anywhere else. The env override is honoured when present so
 * the agent can be pointed elsewhere without a code change.
 */
export const JORDAN_AGENT_ID: string =
  (import.meta.env.VITE_ELEVENLABS_JORDAN_AGENT_ID as string | undefined)?.trim() ||
  'agent_9001m05n651gevt87wmmg2s6485y';
