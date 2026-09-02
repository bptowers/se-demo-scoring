import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseFirestore, isFirebaseConfigured } from './firebase';
import { DemoSession } from '../types';
import { excludeFromReporting } from '../config/reportingExclusions';
import { canonicaliseSessionNames, seNameVariants } from '../config/seNameAliases';

/**
 * Single normalisation applied to every session read: drop excluded names, then collapse
 * alias spellings onto one canonical name. Centralised here so no page can skip it.
 */
const forReporting = (sessions: DemoSession[]): DemoSession[] =>
  canonicaliseSessionNames(excludeFromReporting(sessions));

const getCompletedSessionScore = (session: DemoSession): number | null => {
  if (session.seScoring?.evaluations?.[0]) {
    return session.seScoring.evaluations[0].overall_result.final_score;
  }
  if (session.aiV2) {
    return Math.round((session.aiV2.combinedTotal / 55) * 100);
  }
  if (session.aiScoring) {
    return session.aiScoring.scores.reduce((sum, score) => sum + score.score, 0);
  }
  return null;
};

// BDR ACCESS CONTROL NOTE:
// Sessions with rubricType === 'BDR' are restricted to the BDR team and their manager.
// See config/bdrUsers.ts for the authorised list.
// BDR sessions are dual-written to users/{uid}/evaluations/{id} AND bdrSessions/{id}
// to allow the BDR manager to query across the full team without hitting Firestore's
// 10-item 'in' query limit (BDR_TEAM has 20 members).
// Do NOT expose BDR sessions in any shared or admin view without checking isBdrUser().

// Convert Firestore Timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
};

// Convert Date to Firestore Timestamp
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Deep-strip undefined from any value while preserving Firestore Timestamps.
// Firebase SDK v12 throws "Unsupported field value: undefined" on ANY nested undefined.
const stripUndefined = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (value instanceof Timestamp) return value; // do NOT recurse into Timestamps
  if (Array.isArray(value)) {
    return value.filter(item => item !== undefined).map(stripUndefined);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return value;
};

// Convert DemoSession to Firestore document
const sessionToFirestore = (session: DemoSession): any => {
  const data: any = {
    ...session,
    createdAt: dateToTimestamp(session.createdAt),
    completedAt: session.completedAt ? dateToTimestamp(session.completedAt) : null,
  };
  return stripUndefined(data);
};

// Convert Firestore document to DemoSession
const firestoreToSession = (data: any): DemoSession => {
  return {
    ...data,
    createdAt: timestampToDate(data.createdAt),
    completedAt: data.completedAt ? timestampToDate(data.completedAt) : undefined,
  };
};

/**
 * Save or update an evaluation to Firestore
 * @param userId - The user ID who owns the evaluation
 * @param session - The demo session to save
 * @returns The evaluation ID
 */
export const saveEvaluation = async (userId: string, session: DemoSession): Promise<string> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, skipping save in demo mode');
    return session.id;
  }

  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const evaluationRef = doc(db, 'users', userId, 'evaluations', session.id);
    await setDoc(evaluationRef, sessionToFirestore(session));

    // Dual-write BDR sessions to top-level collection for manager queries
    if (session.rubricType === 'BDR') {
      const bdrRef = doc(db, 'bdrSessions', session.id);
      await setDoc(bdrRef, sessionToFirestore(session));
    }

    // Dual-write AI-scored AE sessions to top-level collection for manager queries
    // Include both 'complete' and 'scoring' (AI_ONLY completes immediately; HYBRID stays 'scoring')
    if (session.rubricType !== 'BDR' && (session.status === 'complete' || session.status === 'scoring') && (session.aiScoring || session.aiV2 || session.seScoring)) {
      const aeRef = doc(db, 'aeSessions', session.id);
      await setDoc(aeRef, sessionToFirestore(session));
    }

    console.log('Evaluation saved successfully:', session.id);
    return session.id;
  } catch (error) {
    console.error('Error saving evaluation:', error);
    throw error;
  }
};

/**
 * Get a single evaluation by ID
 * @param userId - The user ID who owns the evaluation
 * @param evaluationId - The evaluation ID to retrieve
 * @returns The demo session or null if not found
 */
export const getEvaluation = async (userId: string, evaluationId: string): Promise<DemoSession | null> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, returning null in demo mode');
    return null;
  }

  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const evaluationRef = doc(db, 'users', userId, 'evaluations', evaluationId);
    const evaluationSnap = await getDoc(evaluationRef);

    if (evaluationSnap.exists()) {
      return firestoreToSession(evaluationSnap.data());
    }
    return null;
  } catch (error) {
    console.error('Error getting evaluation:', error);
    throw error;
  }
};

/**
 * Get all evaluations for a user with optional filtering
 * @param userId - The user ID whose evaluations to retrieve
 * @param options - Optional query parameters
 * @returns Array of demo sessions
 */
export const getUserEvaluations = async (
  userId: string,
  options?: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    orderBy?: 'createdAt' | 'completedAt';
  }
): Promise<DemoSession[]> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, returning empty array in demo mode');
    return [];
  }

  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const evaluationsRef = collection(db, 'users', userId, 'evaluations');
    const constraints: any[] = [];

    // Add date filters
    if (options?.startDate) {
      const orderField = options?.orderBy || 'createdAt';
      constraints.push(where(orderField, '>=', dateToTimestamp(options.startDate)));
    }
    if (options?.endDate) {
      const orderField = options?.orderBy || 'createdAt';
      constraints.push(where(orderField, '<=', dateToTimestamp(options.endDate)));
    }

    // Add ordering
    const orderField = options?.orderBy || 'createdAt';
    constraints.push(orderBy(orderField, 'desc'));

    // Add limit
    if (options?.limit) {
      constraints.push(firestoreLimit(options.limit));
    }

    // Build query with all constraints at once
    const q = query(evaluationsRef, ...constraints);

    const querySnapshot = await getDocs(q);
    const evaluations: DemoSession[] = [];

    querySnapshot.forEach((doc) => {
      evaluations.push(firestoreToSession(doc.data()));
    });

    return forReporting(evaluations);
  } catch (error) {
    console.error('Error getting user evaluations:', error);
    throw error;
  }
};

/**
 * Delete an evaluation
 * @param userId - The user ID who owns the evaluation
 * @param evaluationId - The evaluation ID to delete
 */
export const deleteEvaluation = async (
  userId: string,
  evaluationId: string,
  opts?: { rubricType?: string; hasAiScoring?: boolean }
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, skipping delete in demo mode');
    return;
  }

  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    // Always delete from the primary user subcollection
    await deleteDoc(doc(db, 'users', userId, 'evaluations', evaluationId));

    // Clean up dual-write collections
    if (opts?.rubricType === 'BDR') {
      await deleteDoc(doc(db, 'bdrSessions', evaluationId));
    } else if (opts?.hasAiScoring) {
      await deleteDoc(doc(db, 'aeSessions', evaluationId));
    }

    console.log('Evaluation deleted successfully:', evaluationId);
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    throw error;
  }
};

/**
 * Calculate user's average score across all completed evaluations
 * @param userId - The user ID
 * @returns Average score or null if no completed evaluations
 */
export const getUserAverageScore = async (userId: string): Promise<number | null> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, returning null in demo mode');
    return null;
  }

  try {
    const evaluations = await getUserEvaluations(userId, { orderBy: 'completedAt' });

    // Filter for completed evaluations with AI scoring
    const completedEvals = evaluations.filter(
      (session) => session.status === 'complete' && getCompletedSessionScore(session) !== null
    );

    if (completedEvals.length === 0) {
      return null;
    }

    // Calculate total score for each evaluation and average them
    const totalScore = completedEvals.reduce((sum, session) => {
      return sum + (getCompletedSessionScore(session) ?? 0);
    }, 0);

    return Math.round(totalScore / completedEvals.length);
  } catch (error) {
    console.error('Error calculating user average score:', error);
    return null;
  }
};

/**
 * Get the most recent demo score
 * @param userId - The user ID
 * @returns Last demo score or null if no completed evaluations
 */
export const getLastDemoScore = async (userId: string): Promise<number | null> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, returning null in demo mode');
    return null;
  }

  try {
    const evaluations = await getUserEvaluations(userId, {
      limit: 2, // Get last 2 (current will be first, previous will be second)
      orderBy: 'completedAt'
    });

    // Filter for completed evaluations with AI scoring
    const completedEvals = evaluations.filter(
      (session) => session.status === 'complete' && getCompletedSessionScore(session) !== null
    );

    if (completedEvals.length < 2) {
      return null; // Need at least 2 to have a "previous" demo
    }

    // Second most recent
    const previousDemo = completedEvals[1];
    return getCompletedSessionScore(previousDemo);
  } catch (error) {
    console.error('Error getting last demo score:', error);
    return null;
  }
};

/**
 * Get recent scores for trend calculation
 * @param userId - The user ID
 * @param count - Number of recent scores to retrieve (default 5)
 * @returns Array of recent scores (most recent last)
 */
export const getUserRecentScores = async (
  userId: string,
  count: number = 5
): Promise<number[]> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, returning empty array in demo mode');
    return [];
  }

  try {
    const evaluations = await getUserEvaluations(userId, {
      limit: count,
      orderBy: 'completedAt'
    });

    // Filter for completed evaluations with AI scoring
    const completedEvals = evaluations.filter(
      (session) => session.status === 'complete' && getCompletedSessionScore(session) !== null
    );

    // Calculate scores and reverse (oldest first for trend calculation)
    const scores = completedEvals
      .map((session) => {
        return getCompletedSessionScore(session) ?? 0;
      })
      .reverse();

    return scores;
  } catch (error) {
    console.error('Error getting user recent scores:', error);
    return [];
  }
};

/**
 * Get all BDR sessions across the whole team — for the BDR manager only.
 * Reads from the top-level bdrSessions collection to avoid Firestore 'in' query limits.
 * Caller must verify isBdrManager() before calling this function.
 * @returns Array of BDR DemoSessions, sorted newest first
 */
export const getBdrSessionsForManager = async (): Promise<DemoSession[]> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, returning empty array in demo mode');
    return [];
  }

  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const bdrRef = collection(db, 'bdrSessions');
    const q = query(bdrRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const sessions: DemoSession[] = [];

    querySnapshot.forEach((docSnap) => {
      sessions.push(firestoreToSession(docSnap.data()));
    });

    return sessions;
  } catch (error) {
    console.error('Error getting BDR sessions for manager:', error);
    throw error;
  }
};

/**
 * Get all AE sessions across the whole team — for AE managers only.
 * Reads from the top-level aeSessions collection (dual-written on completion).
 * Client filters by callDeliveredBy against the manager's direct reports list.
 * Caller must verify getManagerConfig() before calling this function.
 * @returns Array of AE DemoSessions, sorted newest first
 */
export const getAeSessionsForManager = async (): Promise<DemoSession[]> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, returning empty array in demo mode');
    return [];
  }

  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const aeRef = collection(db, 'aeSessions');
    const q = query(aeRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const sessions: DemoSession[] = [];

    querySnapshot.forEach((docSnap) => {
      sessions.push(firestoreToSession(docSnap.data()));
    });

    return forReporting(sessions);
  } catch (error) {
    console.error('Error getting AE sessions for manager:', error);
    throw error;
  }
};

/**
 * Get all AE sessions from the top-level collection where callDeliveredBy matches a name.
 * Used so SEs can see calls scored on their behalf by a manager.
 */
export const getAeSessionsByName = async (name: string): Promise<DemoSession[]> => {
  if (!isFirebaseConfigured()) return [];
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const aeRef = collection(db, 'aeSessions');
    // Match every spelling this SE's calls may be stored under. Firestore equality is
    // case-sensitive and exact, so querying the display name alone would miss their own
    // calls filed as e.g. 'Tom Worcester' instead of 'Thomas Worcester'.
    const variants = seNameVariants(name);
    const q = variants.length > 1
      ? query(aeRef, where('callDeliveredBy', 'in', variants))
      : query(aeRef, where('callDeliveredBy', '==', name));
    const querySnapshot = await getDocs(q);
    const sessions: DemoSession[] = [];
    querySnapshot.forEach((docSnap) => sessions.push(firestoreToSession(docSnap.data())));
    return forReporting(sessions);
  } catch (error) {
    console.error('Error getting AE sessions by name:', error);
    throw error;
  }
};

/**
 * Update the Stage 6 check-off for a BDR session (manager-only action).
 * Writes to the top-level bdrSessions collection.
 */
export const updateBdrStage6Checklist = async (
  sessionId: string,
  checklist: boolean[]
): Promise<void> => {
  if (!isFirebaseConfigured()) return;

  const db = getFirebaseFirestore();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const bdrRef = doc(db, 'bdrSessions', sessionId);
    await setDoc(bdrRef, { stage6Checklist: checklist }, { merge: true });
  } catch (error) {
    console.error('Error updating Stage 6 checklist:', error);
    throw error;
  }
};

/**
 * User improvement goal interface
 */
export interface UserGoal {
  id: string;
  userId: string;
  criterionId: string;
  targetScore: number;
  startDate: Date;
  currentScore?: number;
  achieved?: boolean;
  createdAt: Date;
}

// Convert UserGoal to Firestore document
const goalToFirestore = (goal: UserGoal): any => {
  return {
    ...goal,
    startDate: dateToTimestamp(goal.startDate),
    createdAt: dateToTimestamp(goal.createdAt),
  };
};

// Convert Firestore document to UserGoal
const firestoreToGoal = (data: any): UserGoal => {
  return {
    ...data,
    startDate: timestampToDate(data.startDate),
    createdAt: timestampToDate(data.createdAt),
  };
};

/**
 * Set an improvement goal for a user
 * @param userId - The user ID
 * @param criterionId - The criterion to improve
 * @param targetScore - The target score to achieve
 * @param currentScore - Optional current score
 * @returns The goal ID
 */
export const setUserGoal = async (
  userId: string,
  criterionId: string,
  targetScore: number,
  currentScore?: number
): Promise<string> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, skipping goal save in demo mode');
    return 'demo-goal-' + Date.now();
  }

  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const goalId = `goal-${criterionId}-${Date.now()}`;
    const goalRef = doc(db, 'users', userId, 'goals', goalId);

    const goal: UserGoal = {
      id: goalId,
      userId,
      criterionId,
      targetScore,
      currentScore,
      achieved: false,
      startDate: new Date(),
      createdAt: new Date(),
    };

    await setDoc(goalRef, goalToFirestore(goal));
    console.log('Goal saved successfully:', goalId);
    return goalId;
  } catch (error) {
    console.error('Error saving goal:', error);
    throw error;
  }
};

/**
 * Get all active goals for a user
 * @param userId - The user ID
 * @returns Array of user goals
 */
export const getUserGoals = async (userId: string): Promise<UserGoal[]> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, returning empty array in demo mode');
    return [];
  }

  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const goalsRef = collection(db, 'users', userId, 'goals');
    const q = query(
      goalsRef,
      where('achieved', '==', false),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const goals: UserGoal[] = [];

    querySnapshot.forEach((doc) => {
      goals.push(firestoreToGoal(doc.data()));
    });

    return goals;
  } catch (error) {
    console.error('Error getting user goals:', error);
    throw error;
  }
};

/**
 * Update goal achievement status
 * @param userId - The user ID
 * @param goalId - The goal ID
 * @param achieved - Whether the goal is achieved
 */
export const updateGoalStatus = async (
  userId: string,
  goalId: string,
  achieved: boolean
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    console.log('Firestore not configured, skipping goal update in demo mode');
    return;
  }

  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    await setDoc(goalRef, { achieved }, { merge: true });
    console.log('Goal status updated:', goalId);
  } catch (error) {
    console.error('Error updating goal status:', error);
    throw error;
  }
};
