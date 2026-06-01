import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions, isFirebaseConfigured } from './firebase';

export interface ClariCall {
  id: string;
  title: string;
  date: string;
  durationSeconds: number;
  aeName: string;
  aeEmail: string;
  hasTranscript: boolean;
  status: string;
}

export interface ClariTranscript {
  transcript: string;
  title: string;
  aeName: string;
  date: string;
}

export const fetchClariCalls = async (startDate?: string, repName?: string): Promise<ClariCall[]> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Clari import requires Firebase Functions.');
  }
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error('Firebase Functions unavailable.');
  const fn = httpsCallable<{ startDate?: string; repName?: string }, ClariCall[]>(functions, 'getClariCalls');
  const result = await fn({ startDate, repName });
  return result.data;
};

export const fetchClariTranscript = async (callId: string, repName?: string): Promise<ClariTranscript> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Clari import requires Firebase Functions.');
  }
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error('Firebase Functions unavailable.');
  const fn = httpsCallable<{ callId: string; repName?: string }, ClariTranscript>(functions, 'getClariTranscript');
  const result = await fn({ callId, repName });
  return result.data;
};
