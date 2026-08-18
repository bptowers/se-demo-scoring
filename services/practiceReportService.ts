import { collection, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore, isFirebaseConfigured } from './firebase';
import { PracticeReport } from '../types';

/*
 * Read access to Morgan live-practice reports.
 *
 * Reports are written ONLY by the elevenLabsPostCallWebhook Cloud Function (Admin SDK).
 * `firestore.rules` denies client create/update/delete on this collection, so there is no write
 * path here by design.
 *
 * A single onSnapshot listener is used rather than polling: the report arrives some seconds
 * after the call ends, once ElevenLabs finishes its analysis and posts the webhook, and a
 * listener delivers it the moment it lands at no repeated-query cost.
 */

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return undefined;
};

const toReport = (data: Record<string, any>): PracticeReport => ({
  ...(data as PracticeReport),
  createdAt: toDate(data.createdAt),
  completedAt: toDate(data.completedAt),
});

/**
 * Subscribe to the signed-in user's most recent practice report for a scenario.
 *
 * Returns an unsubscribe function. In demo mode (no Firebase configured) or without a uid it
 * reports "not available" once and does not subscribe — demo logins are a mock user, not a
 * Firebase identity, so they own no reports.
 */
export const subscribeToLatestPracticeReport = (
  userId: string | undefined,
  scenarioId: string,
  onReport: (report: PracticeReport | null) => void,
  onUnavailable: () => void
): (() => void) => {
  // A real Firebase identity is required, not just a uid: demo-mode logins are a mock user with
  // no auth token, so subscribing would be a guaranteed permission-denied against the
  // owner-only read rule. Bail out quietly instead of logging a predictable failure.
  const auth = getFirebaseAuth();
  if (!isFirebaseConfigured() || !userId || !auth?.currentUser) {
    onUnavailable();
    return () => {};
  }

  const db = getFirebaseFirestore();
  if (!db) {
    onUnavailable();
    return () => {};
  }

  // orderBy completedAt keeps "latest" meaningful even if a delayed webhook arrives out of
  // order. A single-field orderBy plus equality-free filtering needs no composite index.
  const reportsRef = collection(db, 'users', userId, 'practiceReports');
  const latestQuery = query(reportsRef, orderBy('completedAt', 'desc'), limit(5));

  return onSnapshot(
    latestQuery,
    (snapshot) => {
      const match = snapshot.docs
        .map((docSnap) => toReport(docSnap.data()))
        .find((report) => report.scenarioId === scenarioId);
      onReport(match ?? null);
    },
    (error) => {
      console.error('Practice report listener failed:', error);
      onUnavailable();
    }
  );
};
