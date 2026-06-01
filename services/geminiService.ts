import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from './firebase';
import { ScorerProfile, ScoringRubricType, AeV2ScorerProfile, GeminiModelId, SeScorerProfile } from '../types';
import { LLMService } from './llmServiceInterface';

interface AnalyzeRequest {
  transcript: string;
  rubricType: ScoringRubricType;
  model?: GeminiModelId;
}

export class GeminiService implements LLMService {
  getProviderName(): string {
    return "Google Gemini 2.0 Flash";
  }

  isConfigured(): boolean {
    // Key lives server-side in Secret Manager; available whenever Firebase is initialized
    return !!getFirebaseFunctions();
  }

  async analyzeTranscript(transcript: string, rubricType: ScoringRubricType = 'AE', model?: GeminiModelId): Promise<ScorerProfile> {
    const functionsInstance = getFirebaseFunctions();
    if (!functionsInstance) {
      throw new Error(
        "Firebase Functions not initialized. Check your VITE_FIREBASE_* environment variables."
      );
    }

    const fn = httpsCallable<AnalyzeRequest, ScorerProfile>(functionsInstance, 'analyzeTranscript');
    const result = await fn({ transcript, rubricType, model });
    return result.data;
  }

  async analyzeTranscriptV2(transcript: string, model?: GeminiModelId): Promise<AeV2ScorerProfile> {
    const functionsInstance = getFirebaseFunctions();
    if (!functionsInstance) {
      throw new Error('Firebase Functions not initialized.');
    }
    const fn = httpsCallable<{ transcript: string; model?: GeminiModelId }, AeV2ScorerProfile>(functionsInstance, 'analyzeTranscriptV2', { timeout: 280000 });
    const result = await fn({ transcript, model });
    return result.data;
  }

  async analyzeTranscriptSE(transcript: string, targetSeName?: string, model?: GeminiModelId): Promise<SeScorerProfile> {
    const functionsInstance = getFirebaseFunctions();
    if (!functionsInstance) {
      throw new Error('Firebase Functions not initialized.');
    }
    const fn = httpsCallable<{ transcript: string; targetSeName?: string; model?: GeminiModelId }, SeScorerProfile>(
      functionsInstance,
      'analyzeSeTranscript',
      { timeout: 280000 }
    );
    const result = await fn({ transcript, targetSeName, model });
    return result.data;
  }
}
