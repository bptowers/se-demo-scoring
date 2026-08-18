export enum ScoringMode {
  AI_ONLY = 'AI_ONLY',
  MANUAL_PEER = 'MANUAL_PEER',
  HYBRID = 'HYBRID',
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface ScoringCriterion {
  id: string;
  name: string;
  section: string;
  maxPoints: number;
  description: string;
}

export interface Score {
  criterionId: string;
  score: number;
  reasoning?: string; // Corresponds to "Observation"
  coaching?: string;  // Corresponds to "Coaching Feedback"
}

export interface ScorerProfile {
  role: 'AI' | 'AE' | 'MANAGER';
  scores: Score[];
  vertical?: string;
  executiveSummary?: string;
  topWins?: string[];
  topFixes?: string[];
  demoBooked?: boolean;      // BDR output only
  prospectCompany?: string;  // BDR: AI-extracted from transcript
  contactName?: string;      // BDR: AI-extracted from transcript
  callDuration?: string;     // BDR: AI-extracted from transcript
}

export interface DemoSession {
  id: string;
  userId: string;
  createdAt: Date;
  completedAt?: Date;
  transcript: string;
  mode: ScoringMode;
  selectedProvider?: LLMProvider;
  selectedGeminiModel?: GeminiModelId;
  callDeliveredBy?: string; // Name of AE who conducted (defaults to user.displayName)
  customerName?: string;   // Name of the customer/prospect on the call
  rubricType?: ScoringRubricType;   // defaults to 'AE' for existing sessions
  bdrRepEmail?: string;             // email of BDR who submitted (for manager queries)
  stage6Checklist?: boolean[];      // BDR: manager check-off for Stage 6 follow-up (not scored)
  aiScoring?: ScorerProfile;
  aiV2?: AeV2ScorerProfile;
  seScoring?: SeScorerProfile;
  rubricVersion?: 'AE_V1' | 'AE_V2';
  aeScoring?: ScorerProfile;
  managerScoring?: ScorerProfile;
  status: 'upload' | 'analyzing' | 'scoring' | 'complete';
}

export interface FileUploadState {
  isProcessing: boolean;
  fileName?: string;
  fileSize?: number;
}

export type SupportedFileType = 'txt' | 'pdf' | 'docx' | 'unsupported';

// LLM Provider Types
export type LLMProvider = 'gemini' | 'openai' | 'anthropic';
export type GeminiModelId = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite';

export interface LLMProviderInfo {
  id: LLMProvider;
  name: string;
  description: string;
  isConfigured: boolean;
}

export type ScoringRubricType = 'AE' | 'BDR';
export type BdrGrade = 'A' | 'B' | 'C' | 'D';

export const BDR_SCORING_RUBRIC: ScoringCriterion[] = [
  // Stage 1: Open (10 pts)
  { id: 'bdr_b1',  name: 'Full Name Introduction',    section: 'Open',            maxPoints: 2, description: 'Uses full name on first call — not just first name' },
  { id: 'bdr_b2',  name: 'No "Just" Language',         section: 'Open',            maxPoints: 2, description: 'Does NOT use the word "just" at any point' },
  { id: 'bdr_b3',  name: 'No Permission Seeking',      section: 'Open',            maxPoints: 2, description: 'Does NOT ask "is it a good time?" or equivalent' },
  { id: 'bdr_b4',  name: 'Data Source Adapted Opener', section: 'Open',            maxPoints: 2, description: 'Opener adapted to data source (cold / rewarm / prior contact)' },
  { id: 'bdr_b5',  name: 'Rehearsed One-Liner',        section: 'Open',            maxPoints: 2, description: "Handles \"what's that?\" with a clean, rehearsed one-liner" },
  // Stage 2: Create Interest (6 pts)
  { id: 'bdr_b6',  name: 'Insight Angle Delivered',    section: 'Create Interest', maxPoints: 2, description: 'Delivers one insight angle — no specific numbers or percentage claims' },
  { id: 'bdr_b7',  name: 'Appropriate Angle Chosen',   section: 'Create Interest', maxPoints: 2, description: 'Chooses the most appropriate angle (admin / efficiency / cash flow / case study)' },
  { id: 'bdr_b8',  name: 'Pause After Hook',           section: 'Create Interest', maxPoints: 2, description: 'Pauses after delivering the hook and waits for the prospect to respond' },
  // Stage 3: Discovery (10 pts)
  { id: 'bdr_b9',  name: 'Process-Focused Questions',  section: 'Discovery',       maxPoints: 2, description: 'Asks about processes, not job types — plain language, no jargon' },
  { id: 'bdr_b10', name: 'Operational Frustration',    section: 'Discovery',       maxPoints: 2, description: 'Uses open questions to uncover at least one genuine operational frustration' },
  { id: 'bdr_b11', name: 'Pain Compounded',            section: 'Discovery',       maxPoints: 2, description: 'Compounds the pain across at least two dimensions (business / personal / team)' },
  { id: 'bdr_b12', name: 'Cost of Inaction',           section: 'Discovery',       maxPoints: 2, description: "Asks \"what happens if this doesn't change?\" or equivalent" },
  { id: 'bdr_b13', name: 'No Premature Pitch',         section: 'Discovery',       maxPoints: 2, description: 'Avoids pitching Simpro Group features when the prospect shows interest' },
  // Stage 4: The Mirror (8 pts)
  { id: 'bdr_b14', name: 'Prospect Words Reflected',   section: 'Mirror',          maxPoints: 2, description: "Summarises the prospect's own words back before asking for the demo" },
  { id: 'bdr_b15', name: 'Time-Based Reflection',      section: 'Mirror',          maxPoints: 2, description: 'Uses time-based reflection: "If we gave you those hours back, what would you do?"' },
  { id: 'bdr_b16', name: 'Emotional Summary',          section: 'Mirror',          maxPoints: 2, description: 'Summary is emotional / amiable — not a financial calculation or ROI pitch' },
  { id: 'bdr_b17', name: 'Natural Demo Bridge',        section: 'Mirror',          maxPoints: 2, description: "Bridges to the demo naturally using the prospect's stated pain points" },
  // Stage 5: Qualify & Close (12 pts)
  { id: 'bdr_b18', name: 'Pain Confirmed',             section: 'Qualify & Close', maxPoints: 2, description: 'Pain confirmed as real — prospect described it in their own words' },
  { id: 'bdr_b19', name: 'Authority Confirmed',        section: 'Qualify & Close', maxPoints: 2, description: 'Confirmed speaking to someone with authority or decision influence' },
  { id: 'bdr_b20', name: 'Size Fit Assessed',          section: 'Qualify & Close', maxPoints: 2, description: 'Size fit understood and appropriateness of opportunity assessed' },
  { id: 'bdr_b21', name: 'Urgency Identified',         section: 'Qualify & Close', maxPoints: 2, description: 'Identified at least one reason to move now (growth / pain / event)' },
  { id: 'bdr_b22', name: 'Demo Booked or Decision',    section: 'Qualify & Close', maxPoints: 2, description: 'Booked a qualified demo OR made a conscious, recorded decision on priority' },
  { id: 'bdr_b23', name: 'Assertive Close Language',   section: 'Qualify & Close', maxPoints: 2, description: 'Used assertive close language ("When have you got..." / "How does Thursday look?")' },
];

export const SCORING_RUBRIC: ScoringCriterion[] = [
  // Section 1: Gold Standard Score (60 pts)
  { id: 'gs_discovery',          name: 'Discovery',           section: 'Gold Standard', maxPoints: 10, description: 'Identified and quantified pain; anchored to dollar figures and identified the DM.' },
  { id: 'gs_objection_handling', name: 'Objection Handling',  section: 'Gold Standard', maxPoints: 10, description: 'Proactively inoculated objections before they were raised.' },
  { id: 'gs_positioning',        name: 'Positioning',         section: 'Gold Standard', maxPoints: 10, description: 'Revenue-led; every feature tied to a specific business outcome.' },
  { id: 'gs_closing',            name: 'Closing',             section: 'Gold Standard', maxPoints: 10, description: 'Performed a 1-10 trial close and booked a calendar invite on the call.' },
  { id: 'gs_price_as_weapon',    name: 'Price as a Weapon',   section: 'Gold Standard', maxPoints: 10, description: 'Price only after ROI; multi-year terms as default anchor.' },
  { id: 'gs_roi_quantification', name: 'ROI Quantification',  section: 'Gold Standard', maxPoints: 10, description: 'At least two specific ROI numbers using prospect\'s actual data.' },

  // Section 2: Process Score (40 pts)
  { id: 'ps_opening',          name: 'Opening',            section: 'Process', maxPoints: 8, description: 'Strong Circle of Life opener with genuine business observation.' },
  { id: 'ps_discovery_gates',  name: '6 Discovery Gates',  section: 'Process', maxPoints: 8, description: 'Cleared all 6 gates including stakeholder and vision identification.' },
  { id: 'ps_value_mirror',     name: 'Value Mirror',       section: 'Process', maxPoints: 8, description: 'Full discovery recap with confirmation of the win condition.' },
  { id: 'ps_demo_execution',   name: 'Demo Execution',     section: 'Process', maxPoints: 8, description: 'Prospect-specific scenarios; felt like a "day in the life" of their business.' },
  { id: 'ps_close_next_steps', name: 'Close & Next Steps', section: 'Process', maxPoints: 8, description: 'Confirmed 80/20 fit, buying signal question, and admin follow-up verified.' },
];

// ─── AE V2 Scoring Types ──────────────────────────────────────────────────────

export type RagRating = 'GREEN' | 'AMBER' | 'RED';

export interface AeV2Score {
  criterionId: string;
  score: number;
  rationale: string;
  evidence: string;
}

export interface SeTriggersV2 {
  T1: boolean; T1_note?: string;
  T2: boolean; T2_note?: string;
  T3: boolean; T3_note?: string;
  T4: boolean; T4_note?: string;
  T5: boolean; T5_note?: string;
  T6: boolean; T6_note?: string;
  T7: boolean; T7_note?: string;
  T8: boolean; T8_note?: string;
  T9: boolean; T9_note?: string;
  T10: boolean; T10_note?: string;
  totalCount: number;
  recommendation: 'NO_SE' | 'FLAG_FOR_REVIEW' | 'MANDATORY_SE';
}

export interface NonNegotiableViolationsV2 {
  productBeforeValueMirror: boolean;
  demoFeatureNoDiscoveryLink: boolean;
  noNextStep: boolean;
  falseCapabilityCommitment: boolean;
  objectionCapitulation: boolean;
  priceDropNoRoi: boolean;
}

export interface AeV2ScorerProfile {
  role: 'AI' | 'AE' | 'MANAGER';
  rubricVersion: 'AE_V2';
  scores: AeV2Score[];
  processTotal: number;
  goldStandardTotal: number;
  combinedTotal: number;
  seTriggers: SeTriggersV2;
  violations: NonNegotiableViolationsV2;
  ragRating: RagRating;
  whatWorked: string[];
  whatToFix: string[];
  oneThingNextCall: string;
  region?: 'UK' | 'NA' | 'ANZ' | 'Unknown';
  callType?: 'First Demo' | 'Discovery' | 'Follow-up' | 'Unknown';
}

export const AE_V2_SCORING_RUBRIC: ScoringCriterion[] = [
  { id: 'P1',  name: 'Opening & Agenda Set',  section: 'Process',       maxPoints: 5, description: 'Warm connection, pre-frame, and credibility in sequence.' },
  { id: 'P2',  name: 'Six Discovery Gates',   section: 'Process',       maxPoints: 5, description: 'All 6 gates: Business Snapshot, Work Type, System/Pain, Stakeholder Map, Vision Question, Tech Literacy.' },
  { id: 'P3',  name: 'Value Mirror',          section: 'Process',       maxPoints: 5, description: 'Current State + Pain + Goal + Platform Promise, confirmed by prospect before demo.' },
  { id: 'P4',  name: 'Demo Execution',        section: 'Process',       maxPoints: 5, description: 'Discovery-driven demo using regional opener module and Universal Demo Flow.' },
  { id: 'P5',  name: 'Close & Next Steps',    section: 'Process',       maxPoints: 5, description: 'Full close checklist: buying signal, honest fit, recording, pricing, calendar invite sent live.' },
  { id: 'GS1', name: 'Discovery Quality',     section: 'Gold Standard', maxPoints: 5, description: 'Depth of pain surfaced: volume figures, dollar/time quantification, emotional anchor, vision answer.' },
  { id: 'GS2', name: 'Objection Handling',    section: 'Gold Standard', maxPoints: 5, description: 'Reactive handling and proactive inoculation of common objections.' },
  { id: 'GS3', name: 'Positioning',           section: 'Gold Standard', maxPoints: 5, description: 'Revenue-led positioning anchoring every product statement to business outcomes.' },
  { id: 'GS4', name: 'Price as Weapon',       section: 'Gold Standard', maxPoints: 5, description: "Price introduced after cost-of-inaction framing using prospect's own figures." },
  { id: 'GS5', name: 'Closing Quality',       section: 'Gold Standard', maxPoints: 5, description: 'Craft of close: confident, specific, trust-building sequence with honest fit framing.' },
  { id: 'GS6', name: 'ROI Quantification',    section: 'Gold Standard', maxPoints: 5, description: 'Two or more ROI anchors from discovery data; prospect can articulate the financial case.' },
];

// ─── SE Demo Scoring Types ───────────────────────────────────────────────────

export type SeTranscriptQuality = 'High' | 'Medium' | 'Low';
export type SeConfidenceLevel = 'High' | 'Medium' | 'Low';
export type SeResult = 'Pass' | 'Fail';
export type SePerformanceBand = 'Exceptional' | 'Strong' | 'Acceptable' | 'Below Standard' | 'Poor' | 'Unacceptable';
export type SeRating = 'Exceptional' | 'Strong' | 'Acceptable' | 'Weak' | 'Poor' | 'Not Observed';
export type SeLanguagePattern = 'Predominantly You/Your' | 'Mixed' | 'Predominantly I/We' | 'Not Observed';
export type SeMomentType = 'Positive' | 'Negative' | 'Coaching Opportunity' | 'Risk';

export interface SeCallSummary {
  customer_company: string;
  call_type: string;
  opportunity_stage: string;
  target_se_names: string[];
  identified_speakers: string[];
  customer_objective: string;
  se_objective: string;
  transcript_quality: SeTranscriptQuality;
  confidence_level: SeConfidenceLevel;
}

export interface SeCapApplied {
  cap: number;
  reason: string;
}

export interface SeOverallResult {
  final_score: number;
  base_score_before_caps: number;
  pass_threshold: 75;
  result: SeResult;
  performance_band: SePerformanceBand;
  caps_applied: SeCapApplied[];
  buyer_centric_language_pattern: SeLanguagePattern;
  one_sentence_assessment: string;
}

export interface SeCategoryScore {
  category: string;
  max_points: number;
  points_awarded: number;
  rating: SeRating;
  language_pattern?: SeLanguagePattern;
  rationale: string;
  positive_evidence: string[];
  negative_evidence_or_gaps: string[];
  coaching_note: string;
}

export interface SeStrength {
  strength: string;
  evidence: string;
  why_it_matters: string;
}

export interface SeImprovementArea {
  improvement_area: string;
  evidence: string;
  impact: string;
  recommended_behavior: string;
}

export interface SeCoachingAction {
  action: string;
  example_language_or_behavior: string;
  expected_impact: string;
}

export interface SeCoachingPlan {
  top_priority: string;
  recommended_coaching_actions: SeCoachingAction[];
  manager_notes: string;
}

export interface SeDealRiskObservation {
  risk: string;
  evidence: string;
  recommended_follow_up: string;
}

export interface SeNotableMoment {
  moment_type: SeMomentType;
  speaker: string;
  evidence: string;
  interpretation: string;
}

export interface SeEvaluation {
  target_se_name: string;
  overall_result: SeOverallResult;
  category_scores: SeCategoryScore[];
  strengths: SeStrength[];
  improvement_areas: SeImprovementArea[];
  coaching_plan: SeCoachingPlan;
  deal_risk_observations: SeDealRiskObservation[];
  notable_moments: SeNotableMoment[];
  final_manager_summary: string;
}

export interface SeScorerProfile {
  evaluation_version: 'SE_CALL_SCORECARD_V1';
  call_summary: SeCallSummary;
  evaluations: SeEvaluation[];
}

export const SE_SCORING_RUBRIC: ScoringCriterion[] = [
  { id: 'se_customer_context_discovery', name: 'Customer Context and Discovery', section: 'Core SE Performance', maxPoints: 15, description: 'Understood, explored, and confirmed the customer situation before or during the demo.' },
  { id: 'se_demo_relevance_storyline', name: 'Demo Relevance and Value Connection', section: 'Core SE Performance', maxPoints: 18, description: "Tailored the demonstration to the customer's workflows and systems, and connected each capability shown to a specific customer outcome rather than demonstrating features generically." },
  { id: 'se_product_technical_credibility', name: 'Product and Technical Credibility', section: 'Core SE Performance', maxPoints: 15, description: 'Explained product and technical behavior accurately, credibly, and at appropriate depth.' },
  { id: 'se_operational_fit_adoption', name: 'Operational Fit and Adoption Readiness', section: 'Business Fit', maxPoints: 10, description: 'Connected the solution to workflows, roles, systems, implementation, governance, and adoption reality.' },
  { id: 'se_value_business_impact', name: 'Value and Business Impact', section: 'Business Fit', maxPoints: 10, description: 'Translated capability into customer-specific commercial or operational value.' },
  { id: 'se_engagement_listening', name: 'Customer Engagement and Active Listening', section: 'Conversation Quality', maxPoints: 10, description: 'Created a responsive two-way customer conversation and adjusted to customer input.' },
  { id: 'se_buyer_centric_language', name: 'Buyer-Centric Demo Language', section: 'Conversation Quality', maxPoints: 5, description: 'Used you/your language to help the customer imagine themselves operating the solution.' },
  { id: 'se_communication_presence', name: 'Communication and Executive Presence', section: 'Conversation Quality', maxPoints: 6, description: 'Communicated clearly, concisely, professionally, and credibly.' },
  { id: 'se_objection_risk_handling', name: 'Objection, Concern, and Risk Handling', section: 'Deal Advancement', maxPoints: 7, description: 'Handled concerns, validation needs, and risks directly and constructively.' },
  { id: 'se_call_leadership_next_steps', name: 'Call Support, Collaboration, and Technical Follow-through', section: 'Deal Advancement', maxPoints: 4, description: "Supported the AE's call structure, managed technical transitions cleanly, and owned any open technical items with a clear resolution path. Commercial and scheduling next steps are the AE's responsibility and are not scored here." },
];

// ─── Morgan live-practice reports (ElevenLabs post-call analysis) ─────────────
// Written server-side only, by the elevenLabsPostCallWebhook Cloud Function. These are
// live-practice coaching reports and are deliberately separate from DemoSession / retrospective
// SE demo scoring — different source, different lifecycle, different rubric.

export type PracticeCriterionStatus = 'success' | 'failure' | 'unknown';

export type PracticeOverallRating = 'Strong' | 'Developing' | 'Needs focus' | 'Incomplete';

export interface PracticeEvaluationResult {
  criterionId: string;
  status: PracticeCriterionStatus;
  /** ElevenLabs' own rationale. Never generated or rewritten by this app. */
  rationale: string;
}

export interface PracticeExtractedField {
  fieldId: string;
  value: string;
  rationale: string;
}

export interface PracticeReport {
  provider: 'elevenlabs';
  conversationId: string;
  agentId: string;
  agentVersion: string | null;
  scenarioId: string;
  sessionId: string;
  status: 'ready';
  createdAt?: Date;
  completedAt?: Date;
  durationSeconds: number | null;
  terminationReason: string;
  transcriptSummary: string;
  overallRating: PracticeOverallRating;
  evaluationResults: PracticeEvaluationResult[];
  extractedFields: PracticeExtractedField[];
  nextPracticeObjective: string;
}
