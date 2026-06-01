import Anthropic from '@anthropic-ai/sdk';
import { SCORING_RUBRIC, BDR_SCORING_RUBRIC, ScorerProfile, ScoringRubricType, AeV2ScorerProfile, SeScorerProfile } from "../types";
import { LLMService, SYSTEM_INSTRUCTION } from "./llmServiceInterface";
import { BDR_SYSTEM_INSTRUCTION } from "./bdrSystemInstruction";

export class AnthropicService implements LLMService {
  getProviderName(): string {
    return "Anthropic Claude Sonnet 4.5";
  }

  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private getClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Anthropic API key not found");
    }
    return new Anthropic({
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

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
${outputFormat}`;

    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }]
      });

      const content = response.content[0];
      if (content.type !== 'text') throw new Error("Unexpected response type from Claude");

      // Claude sometimes wraps JSON in markdown code blocks
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
      }

      const json = JSON.parse(jsonText);

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
      console.error("Anthropic analysis error:", error);
      throw error;
    }
  }

  async analyzeTranscriptV2(_transcript: string): Promise<AeV2ScorerProfile> {
    throw new Error('AE V2 scoring is not yet implemented for Anthropic provider.');
  }

  async analyzeTranscriptSE(_transcript: string): Promise<SeScorerProfile> {
    throw new Error('SE scoring is not yet implemented for Anthropic provider.');
  }
}
