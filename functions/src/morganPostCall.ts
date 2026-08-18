import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/*
 * ElevenLabs post-call webhook for Morgan, the Discovery Coach.
 *
 * Flow: Morgan call ends -> ElevenLabs runs its own post-call analysis -> ElevenLabs POSTs a
 * signed `post_call_transcription` event here -> we verify the signature, keep only Morgan's
 * events, normalise the analysis ElevenLabs already produced, and store one report per
 * conversation under the owning user.
 *
 * This function never re-analyses the transcript and never calls an LLM. Every score, rationale
 * and field value below comes from the ElevenLabs payload; the only things derived locally are
 * an overall label and one next-practice objective, both from fixed deterministic rules.
 */

const elevenLabsWebhookSecret = defineSecret("ELEVENLABS_WEBHOOK_SECRET");

/*
 * Morgan's public agent ID. Duplicated here because the client reads it from
 * VITE_ELEVENLABS_AGENT_ID, and `.env` is gitignored and never available to the Functions
 * runtime. Public, non-secret identifier - same precedent as config/objectionCoachAgent.ts.
 * KEEP IN SYNC with the client value if Morgan's agent is ever replaced.
 */
export const MORGAN_AGENT_ID = "agent_6601kzjtesfcega84yxzyxqsckwj";
export const MORGAN_SCENARIO_ID = "morgan-discovery-v1";

/** Morgan's six evaluation criteria, in display order. */
export const MORGAN_CRITERIA = [
  "discovery_breadth",
  "question_quality",
  "listening_and_followup",
  "avoided_premature_pitch",
  "business_value_discovery",
  "credible_next_step",
] as const;

export type CriterionStatus = "success" | "failure" | "unknown";
export type OverallRating = "Strong" | "Developing" | "Needs focus" | "Incomplete";

export interface EvaluationResultRecord {
  criterionId: string;
  status: CriterionStatus;
  rationale: string;
}

export interface ExtractedFieldRecord {
  fieldId: string;
  value: string;
  rationale: string;
}

/*
 * Objective selection: first FAILED criterion in this priority order wins. The order is
 * deliberate - breadth and listening gate everything downstream, so they are addressed
 * before polish.
 */
const OBJECTIVE_PRIORITY: string[] = [
  "discovery_breadth",
  "listening_and_followup",
  "business_value_discovery",
  "question_quality",
  "avoided_premature_pitch",
  "credible_next_step",
];

/** One fixed objective per criterion. No LLM, no generated coaching prose. */
const OBJECTIVES: Record<string, string> = {
  discovery_breadth:
    "Cover more ground before narrowing: ask about current process, team size, and what triggered them to look now.",
  listening_and_followup:
    "Follow up on what they actually said - pick one answer and ask a second, deeper question about it before moving on.",
  business_value_discovery:
    "Quantify the impact: ask what the problem costs them in time, money, or missed work each month.",
  question_quality:
    "Replace yes/no questions with open ones - start with what, how, or walk me through.",
  avoided_premature_pitch:
    "Hold the product back until you have confirmed the problem out loud with the buyer.",
  credible_next_step:
    "Close with a specific next step: name the action, the owner, and a date before the call ends.",
};

const RAISE_THE_BAR_OBJECTIVE =
  "All six criteria passed - raise the bar: push one discovery thread two questions deeper and tie it to a quantified business impact.";

/**
 * Overall label from ElevenLabs' own criterion results.
 *
 * `Incomplete` is checked FIRST so a truncated or partially-analysed call is reported honestly
 * rather than being flattened into a low score.
 */
export const deriveOverallRating = (results: EvaluationResultRecord[]): OverallRating => {
  const scorable = results.filter((r) => r.status === "success" || r.status === "failure");
  if (scorable.length < 4) return "Incomplete";

  const successes = results.filter((r) => r.status === "success").length;
  if (successes >= 5) return "Strong";
  if (successes >= 3) return "Developing";
  return "Needs focus";
};

/** First failed criterion by priority, else the raise-the-bar objective. */
export const deriveNextPracticeObjective = (results: EvaluationResultRecord[]): string => {
  for (const criterionId of OBJECTIVE_PRIORITY) {
    const hit = results.find((r) => r.criterionId === criterionId && r.status === "failure");
    if (hit) return OBJECTIVES[criterionId];
  }
  return RAISE_THE_BAR_OBJECTIVE;
};

const asStatus = (raw: unknown): CriterionStatus =>
  raw === "success" || raw === "failure" ? raw : "unknown";

const asText = (raw: unknown): string => (typeof raw === "string" ? raw : "");

/**
 * Normalise ElevenLabs' criterion results. Known criteria are emitted in display order first so
 * the UI is stable, then any additional criteria the agent returns are appended rather than
 * silently dropped.
 */
export const normaliseEvaluationResults = (raw: unknown): EvaluationResultRecord[] => {
  const source = (raw ?? {}) as Record<string, any>;
  const seen = new Set<string>();
  const ordered: EvaluationResultRecord[] = [];

  for (const criterionId of MORGAN_CRITERIA) {
    const entry = source[criterionId];
    if (!entry) continue;
    seen.add(criterionId);
    ordered.push({
      criterionId,
      status: asStatus(entry.result),
      rationale: asText(entry.rationale),
    });
  }

  for (const [criterionId, entry] of Object.entries(source)) {
    if (seen.has(criterionId) || !entry) continue;
    ordered.push({
      criterionId,
      status: asStatus((entry as any).result),
      rationale: asText((entry as any).rationale),
    });
  }

  return ordered;
};

/** Normalise ElevenLabs' data-collection results into the extracted discovery fields. */
export const normaliseExtractedFields = (raw: unknown): ExtractedFieldRecord[] => {
  const source = (raw ?? {}) as Record<string, any>;
  return Object.entries(source).map(([fieldId, entry]) => {
    const value = (entry as any)?.value;
    return {
      fieldId,
      value:
        value === null || value === undefined
          ? ""
          : typeof value === "string"
            ? value
            : JSON.stringify(value),
      rationale: asText((entry as any)?.rationale),
    };
  });
};

const asSeconds = (raw: unknown): number | null =>
  typeof raw === "number" ? Math.round(raw) : null;

export interface NormalisedMorganReport {
  provider: "elevenlabs";
  conversationId: string;
  agentId: string;
  agentVersion: string | null;
  scenarioId: string;
  sessionId: string;
  status: "ready";
  completedAt: Date;
  durationSeconds: number | null;
  terminationReason: string;
  transcriptSummary: string;
  overallRating: OverallRating;
  evaluationResults: EvaluationResultRecord[];
  extractedFields: ExtractedFieldRecord[];
  nextPracticeObjective: string;
}

/**
 * Build the stored report from the webhook payload. Deliberately tolerant of missing fields:
 * an absent analysis section yields an `Incomplete` rating rather than a throw, so a partial
 * call still produces an honest report.
 */
export const normaliseMorganReport = (
  data: Record<string, any>,
  ownership: { scenarioId: string; sessionId: string },
  completedAt: Date
): NormalisedMorganReport => {
  const analysis = data.analysis ?? {};
  const metadata = data.metadata ?? {};

  const evaluationResults = normaliseEvaluationResults(analysis.evaluation_criteria_results);
  const extractedFields = normaliseExtractedFields(analysis.data_collection_results);

  return {
    provider: "elevenlabs",
    conversationId: asText(data.conversation_id),
    agentId: asText(data.agent_id),
    agentVersion: asText(metadata.agent_version) || asText(data.agent_version) || null,
    scenarioId: ownership.scenarioId,
    sessionId: ownership.sessionId,
    status: "ready",
    completedAt,
    durationSeconds: asSeconds(metadata.call_duration_secs),
    terminationReason: asText(metadata.termination_reason),
    transcriptSummary: asText(analysis.transcript_summary),
    overallRating: deriveOverallRating(evaluationResults),
    evaluationResults,
    extractedFields,
    nextPracticeObjective: deriveNextPracticeObjective(evaluationResults),
  };
};

export const elevenLabsPostCallWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [elevenLabsWebhookSecret],
    timeoutSeconds: 60,
    memory: "256MiB",
    cors: false,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const signature = req.header("elevenlabs-signature");
    // req.rawBody is the unparsed body Firebase preserves for us - signature verification is
    // only valid against these exact bytes, never against a re-serialised JSON object.
    const rawBody = req.rawBody ? req.rawBody.toString("utf8") : "";

    if (!signature || !rawBody) {
      logger.warn("post-call webhook rejected", {
        reason: !signature ? "missing-signature" : "missing-raw-body",
      });
      res.status(401).send("Unauthorized");
      return;
    }

    let event: any;
    try {
      /*
       * The apiKey is a required constructor argument at runtime even though the SDK's types
       * mark it optional — without it the client throws "Please pass in your ElevenLabs API
       * Key" before any verification happens. constructEvent is purely offline HMAC-SHA256 over
       * `${timestamp}.${rawBody}` (verified by reading the SDK source) and makes no network
       * call, so this placeholder is never used to authenticate anything. No real ElevenLabs
       * API key exists in this project, client or server.
       */
      const client = new ElevenLabsClient({ apiKey: "unused-webhook-verification-only" });
      event = await client.webhooks.constructEvent(
        rawBody,
        signature,
        elevenLabsWebhookSecret.value()
      );
    } catch (error) {
      /*
       * The response body stays a bare "Unauthorized" - anyone probing signatures learns nothing
       * beyond the status code. The SDK's own message is logged because it distinguishes the
       * three distinct causes (secret not configured / timestamp outside tolerance / hash
       * mismatch) and contains no secret material.
       */
      logger.warn("post-call webhook rejected", {
        reason: "invalid-signature",
        sdkMessage: error instanceof Error ? error.message : String(error),
        secretConfigured: !!elevenLabsWebhookSecret.value(),
      });
      res.status(401).send("Unauthorized");
      return;
    }

    if (event?.type !== "post_call_transcription") {
      logger.info("post-call webhook ignored", {
        reason: "unsupported-event-type",
        type: event?.type,
      });
      res.status(200).json({ ignored: "unsupported-event-type" });
      return;
    }

    const data = (event.data ?? {}) as Record<string, any>;

    if (data.agent_id !== MORGAN_AGENT_ID) {
      // Acknowledged, not stored. 200 rather than an error so ElevenLabs does not retry an
      // event we will never accept (e.g. Jordan's objection-coach calls).
      logger.info("post-call webhook ignored", { reason: "non-morgan-agent" });
      res.status(200).json({ ignored: "non-morgan-agent" });
      return;
    }

    const dynamicVariables = data.conversation_initiation_client_data?.dynamic_variables ?? {};
    const appUserId = asText(dynamicVariables.app_user_id);
    const scenarioId = asText(dynamicVariables.scenario_id);
    const sessionId = asText(dynamicVariables.session_id);

    if (!appUserId || !scenarioId || !sessionId) {
      // Permanent for this conversation: retrying cannot add variables that were never sent.
      // Acknowledge so it is not redelivered, and log which ones were missing.
      logger.warn("post-call webhook skipped", {
        reason: "missing-ownership-variables",
        hasAppUserId: !!appUserId,
        hasScenarioId: !!scenarioId,
        hasSessionId: !!sessionId,
      });
      res.status(200).json({ ignored: "missing-ownership-variables" });
      return;
    }

    const conversationId = asText(data.conversation_id);
    if (!conversationId) {
      logger.warn("post-call webhook skipped", { reason: "missing-conversation-id" });
      res.status(200).json({ ignored: "missing-conversation-id" });
      return;
    }

    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
    const db = admin.firestore();
    const docRef = db
      .collection("users")
      .doc(appUserId)
      .collection("practiceReports")
      .doc(conversationId);

    // Idempotency: the conversation ID is the document ID, and an existing document is left
    // untouched. A redelivered webhook therefore cannot create a second report or overwrite
    // the original createdAt.
    const existing = await docRef.get();
    if (existing.exists) {
      logger.info("post-call webhook duplicate ignored", { conversationId });
      res.status(200).json({ status: "duplicate-ignored" });
      return;
    }

    const report = normaliseMorganReport(data, { scenarioId, sessionId }, new Date());

    await docRef.set({
      ...report,
      completedAt: admin.firestore.Timestamp.fromDate(report.completedAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Operational metadata only: no transcript, no summary text, no rationales, no secrets.
    // `payloadKeys` exists so the exact ElevenLabs field names can be confirmed on the first
    // real delivery without logging any conversation content.
    logger.info("morgan practice report stored", {
      conversationId,
      scenarioId,
      overallRating: report.overallRating,
      criteriaReturned: report.evaluationResults.length,
      fieldsReturned: report.extractedFields.length,
      durationSeconds: report.durationSeconds,
      payloadKeys: Object.keys(data),
      analysisKeys: Object.keys(data.analysis ?? {}),
      metadataKeys: Object.keys(data.metadata ?? {}),
    });

    res.status(200).json({ status: "stored" });
  }
);
