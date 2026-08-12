import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions, isFirebaseConfigured } from './firebase';

/**
 * Deletes a session a manager doesn't own — cleans up both the true owner's
 * `users/{targetUserId}/evaluations/{sessionId}` record and its `aeSessions`/
 * `bdrSessions` mirror. Runs server-side (Admin SDK) because Firestore rules
 * only let a session's own owner delete `users/{uid}/evaluations/{id}`.
 */
export const deleteEvaluationAsManager = async (targetUserId: string, sessionId: string): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Deleting another user\'s session requires Firebase Functions.');
  }
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error('Firebase Functions unavailable.');
  const fn = httpsCallable<{ targetUserId: string; sessionId: string }, { success: boolean }>(functions, 'deleteEvaluationAsManager');
  await fn({ targetUserId, sessionId });
};
