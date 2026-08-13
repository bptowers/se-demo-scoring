/*
 * Access gate for the AI Demo Coach (`/ai-coach`), while the Guided Session experience is
 * still being shaped. Same shape as `config/rubricAccess.ts` — see that file for the
 * precedent this follows.
 *
 * Deliberately excludes the demo user: the login page exposes a public "Try Demo Mode
 * (Guest Access)" button, so allowlisting the demo account would let anyone who can load
 * the app reach the page — and every visit fetches the ElevenLabs agent config, so an open
 * page is also an open door to the account's quota.
 *
 * NOTE: this is a client-side gate, like the repo's other allowlists. It removes the feature
 * from other people's UI and from casual URL access; it is not a server-side authorisation
 * boundary, and the list ships in the public bundle.
 */
const AI_COACH_EMAILS = new Set([
  'brad.towers@simprogroup.com',
]);

export const canViewAiCoach = (email: string | null | undefined): boolean =>
  !!email && AI_COACH_EMAILS.has(email.toLowerCase());
