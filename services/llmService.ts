import { LLMProvider, ScorerProfile, LLMProviderInfo, ScoringRubricType, AeV2ScorerProfile, GeminiModelId, SeScorerProfile } from '../types';
import { LLMService } from './llmServiceInterface';
import { GeminiService } from './geminiService';

/*
 * OpenAIService / AnthropicService are deliberately NOT registered here. They only ever
 * worked by reading an API key from the client bundle, which shipped live credentials to
 * anyone who could load the page. The key inlining is gone from vite.config.ts, so these
 * providers cannot function in the browser; leaving them unreferenced also keeps the
 * `openai` and `@anthropic-ai/sdk` packages out of the bundle entirely. The service files
 * remain in the repo as the reference AE V1 implementations for a future Cloud Function
 * port — the same route Gemini already takes.
 */
const services: Partial<Record<LLMProvider, LLMService>> = {
  gemini: new GeminiService()
};

export const getLLMService = (provider: LLMProvider): LLMService => {
  const service = services[provider];
  if (!service) {
    throw new Error(
      `${provider} is not available in the browser. Only Gemini is supported, via Cloud Functions.`
    );
  }
  return service;
};

export const getAvailableProviders = (): LLMProviderInfo[] => {
  return [
    {
      id: 'gemini',
      name: 'Google Gemini 2.5 Flash',
      description: '',
      isConfigured: services.gemini?.isConfigured() ?? false
    },
    {
      id: 'openai',
      name: 'OpenAI GPT-4 Turbo (Apr 2024)',
      description: 'Coming Soon',
      isConfigured: false
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude Sonnet 4.5',
      description: 'Coming Soon',
      isConfigured: false
    }
  ];
};

export const analyzeTranscript = async (
  transcript: string,
  provider: LLMProvider = 'gemini',
  rubricType: ScoringRubricType = 'AE',
  model?: GeminiModelId
): Promise<ScorerProfile> => {
  const service = getLLMService(provider);

  if (!service.isConfigured()) {
    throw new Error(
      `${service.getProviderName()} is not configured. Please add the API key to your .env file.`
    );
  }

  return service.analyzeTranscript(transcript, rubricType, model);
};

export const analyzeTranscriptV2 = async (
  transcript: string,
  provider: LLMProvider = 'gemini',
  model?: GeminiModelId
): Promise<AeV2ScorerProfile> => {
  const service = getLLMService(provider);
  if (!service.isConfigured()) {
    throw new Error(`${service.getProviderName()} is not configured.`);
  }
  return service.analyzeTranscriptV2(transcript, model);
};

export const analyzeTranscriptSE = async (
  transcript: string,
  provider: LLMProvider = 'gemini',
  targetSeName?: string,
  model?: GeminiModelId
): Promise<SeScorerProfile> => {
  const service = getLLMService(provider);
  if (!service.isConfigured()) {
    throw new Error(`${service.getProviderName()} is not configured.`);
  }
  return service.analyzeTranscriptSE(transcript, targetSeName, model);
};
