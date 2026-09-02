import { DemoSession } from '../types';

/*
 * The same SE recorded under more than one spelling. `callDeliveredBy` is free text typed on
 * the upload screen, so one person can accumulate several forms — a short name, a full name,
 * or a different capitalisation — and each one is otherwise counted as a separate SE in the
 * per-SE comparison, the category heatmap and the SE filter.
 *
 * Keys are the spellings AS STORED in Firestore; values are the canonical display name.
 * Lookup is case- and whitespace-insensitive, so 'adam skinner' collapses into 'Adam Skinner'
 * without needing a separate entry for every capitalisation.
 *
 * Applied on read rather than by rewriting the stored documents. That keeps it reversible,
 * and — more usefully — it keeps working: if someone types 'Tom Worcester' again next month
 * it merges automatically, where a one-off data migration would fix only the past.
 */
const SE_NAME_ALIASES: Record<string, string> = {
  'Tom Worcester': 'Thomas Worcester',
  'George': 'George Tobon',
  'Matthew': 'Matthew Beecham',
  'adam skinner': 'Adam Skinner',
};

/** Case-insensitive index of variant → canonical. */
const ALIAS_INDEX = new Map<string, string>(
  Object.entries(SE_NAME_ALIASES).map(([variant, canonical]) => [
    variant.trim().toLowerCase(),
    canonical,
  ])
);

/** The canonical display name for an SE, or the trimmed input when no alias applies. */
export const canonicalSeName = (name: string | null | undefined): string => {
  if (!name) return '';
  const trimmed = name.trim();
  return ALIAS_INDEX.get(trimmed.toLowerCase()) ?? trimmed;
};

/**
 * Every spelling this SE's calls may be stored under, for Firestore equality queries.
 *
 * Needed because `getSeSessionsByName` matches `callDeliveredBy` server-side and Firestore
 * string equality is case-sensitive: querying only the signed-in user's display name would
 * silently miss calls filed under one of their other spellings.
 */
export const seNameVariants = (name: string | null | undefined): string[] => {
  const canonical = canonicalSeName(name);
  if (!canonical) return [];

  const variants = new Set<string>([canonical]);
  if (name) variants.add(name.trim());
  for (const [variant, target] of Object.entries(SE_NAME_ALIASES)) {
    if (target === canonical) variants.add(variant);
  }
  return [...variants];
};

/** Rewrites `callDeliveredBy` to the canonical name so reporting groups the person once. */
export const canonicaliseSessionNames = <T extends Pick<DemoSession, 'callDeliveredBy'>>(
  sessions: T[]
): T[] =>
  sessions.map(session => {
    const canonical = canonicalSeName(session.callDeliveredBy);
    return canonical && canonical !== session.callDeliveredBy
      ? ({ ...session, callDeliveredBy: canonical } as T)
      : session;
  });
