import OpenAI from 'openai';
import { SCORING_RUBRIC, BDR_SCORING_RUBRIC, ScorerProfile, ScoringRubricType, AeV2ScorerProfile, SeScorerProfile } from "../types";
import { LLMService, SYSTEM_INSTRUCTION } from "./llmServiceInterface";
import { BDR_SYSTEM_INSTRUCTION } from "./bdrSystemInstruction";

export class OpenAIService implements LLMService {
  getProviderName(): string {
    return "OpenAI GPT-4 Turbo";
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  private getClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not found");
    }
    return new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async analyzeTranscript(transcript: string, rubricType: ScoringRubricType = 'AE'): Promise<ScorerProfile> {
    const client = this.getClient();
    const isBdr = rubricType === 'BDR';
    const rubric = isBdr ? BDR_SCORING_RUBRIC : SCORING_RUBRIC;
    const instruction = isBdr ? BDR_SYSTEM_INSTRUCTION : SYSTEM_INSTRUCTION;
    const criteriaCount = rubric.length;

    const criteriaList = rubric.map(c =>
      `- ${c.id}: ${c.name} (${c.maxPoints} pts) - ${c.description}`
    ).join('\n');

    const outputFormat = isBdr ? `{
  "role": "AI",
  "scores": [{ "criterionId": "string", "score": 0|1|2, "reasoning": "string", "coaching": "string" }],
  "executiveSummary": "string (2-3 sentences)",
  "topWins": ["string", "string"],
  "topFixes": ["string", "string", "string"],
  "demoBooked": true|false,
  "prospectCompany": "string (company name from transcript or 'Unknown')",
  "contactName": "string (contact full name from transcript or 'Unknown')",
  "callDuration": "string (e.g. '~8 minutes' or 'Unknown')"
}` : `{
  "vertical": "string (Commercial/Construction/Demand Service/Projects or Unknown)",
  "scores": [{ "criterionId": "string", "score": number, "reasoning": "string", "coaching": "string" }],
  "executiveSummary": "string (2-3 sentences)",
  "topWins": ["string", "string", "string"],
  "topFixes": ["string", "string", "string"]
}`;

    const prompt = `${instruction}

SCORING CRITERIA (${criteriaCount} total):
${criteriaList}

TRANSCRIPT TO ANALYZE:
${transcript}

Return a JSON object with this exact structure:
${outputFormat}`;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4-turbo-2024-04-09",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from OpenAI");

      const json = JSON.parse(content);

      const mappedScores = rubric.map(criterion => {
        const match = json.scores.find((s: any) => s.criterionId === criterion.id);
        return {
          criterionId: criterion.id,
          score: match ? match.score : 0,
          reasoning: match ? match.reasoning : "No observation provided.",
          coaching: match ? match.coaching : "No coaching provided."
        };
      });

      return {
        role: 'AI',
        scores: mappedScores,
        vertical: isBdr ? undefined : (json.vertical || 'Unknown'),
        executiveSummary: json.executiveSummary,
        topWins: json.topWins || [],
        topFixes: json.topFixes || [],
        ...(isBdr && {
          demoBooked: json.demoBooked ?? false,
          prospectCompany: json.prospectCompany || undefined,
          contactName: json.contactName || undefined,
          callDuration: json.callDuration || undefined,
        }),
      };

    } catch (error) {
      console.error("OpenAI analysis error:", error);
      throw error;
    }
  }

  async analyzeTranscriptV2(_transcript: string): Promise<AeV2ScorerProfile> {
    throw new Error('AE V2 scoring is not yet implemented for OpenAI provider.');
  }

  async analyzeTranscriptSE(_transcript: string): Promise<SeScorerProfile> {
    throw new Error('SE scoring is not yet implemented for OpenAI provider.');
  }
}
