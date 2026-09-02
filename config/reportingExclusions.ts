import { DemoSession } from '../types';

/*
 * Names excluded from every reporting surface — dashboards, trends, charts, heatmaps,
 * per-SE comparisons and call history.
 *
 * This hides sessions from the UI; it does NOT delete anything. The underlying documents
 * stay in Firestore, so removing a name from the set below immediately restores that
 * person's history in full. That is deliberate: an exclusion is a reporting decision and
 * should be reversible, whereas deleting scored calls and their transcripts is not.
 *
 * Matching is on `callDeliveredBy` (who delivered the call), case- and whitespace-
 * insensitive, and EXACT — 'carter' will not match 'Carterton'. Name variants are listed
 * separately on purpose, because the data contains both 'Carter Jones' and a bare 'Carter'.
 */
const EXCLUDED_FROM_REPORTING = new Set([
  'joe valdez',
  'sarah sareh',
  'carter jones',
  'carter',
]);

/** True when a delivered-by name should be kept out of reporting. */
export const isExcludedFromReporting = (name: string | null | undefined): boolean =>
  !!name && EXCLUDED_FROM_REPORTING.has(name.trim().toLowerCase());

/**
 * Drops excluded sessions from a list. Applied centrally in `firestoreService` on every
 * session read, so no individual page can forget it and quietly reintroduce them.
 */
export const excludeFromReporting = <T extends Pick<DemoSession, 'callDeliveredBy'>>(
  sessions: T[]
): T[] => sessions.filter(session => !isExcludedFromReporting(session.callDeliveredBy));
