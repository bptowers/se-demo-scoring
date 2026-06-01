import { LLMProvider, ScorerProfile, LLMProviderInfo, ScoringRubricType, AeV2ScorerProfile, GeminiModelId, SeScorerProfile } from '../types';
import { LLMService } from './llmServiceInterface';
import { GeminiService } from './geminiService';
import { OpenAIService } from './openaiService';
import { AnthropicService } from './anthropicService';

const services: Record<LLMProvider, LLMService> = {
  gemini: new GeminiService(),
  openai: new OpenAIService(),
  anthropic: new AnthropicService()
};

export const getLLMService = (provider: LLMProvider): LLMService => {
  const service = services[provider];
  if (!service) {
    throw new Error(`Unknown LLM provider: ${provider}`);
  }
  return service;
};

export const getAvailableProviders = (): LLMProviderInfo[] => {
  return [
    {
      id: 'gemini',
      name: 'Google Gemini 2.5 Flash',
      description: '',
      isConfigured: services.gemini.isConfigured()
    },
    {
      id: 'openai',
      name: 'OpenAI GPT-4 Turbo (Apr 2024)',
      description: '',
      isConfigured: services.openai.isConfigured()
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
