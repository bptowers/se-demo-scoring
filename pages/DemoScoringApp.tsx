import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { ScoreReveal } from '../components/ScoreReveal';
import { BdrCallScorecard } from '../components/BdrCallScorecard';
import { ScoreRevealV2 } from '../components/ScoreRevealV2';
import { CoachingSummaryV2 } from '../components/CoachingSummaryV2';
import { AeCallScorecardV2 } from '../components/AeCallScorecardV2';
import { SeScoreReveal } from '../components/SeScoreReveal';
import { SeCoachingSummary } from '../components/SeCoachingSummary';
import { SeCallScorecard } from '../components/SeCallScorecard';
import { ScoringMode, SCORING_RUBRIC, BDR_SCORING_RUBRIC, ScorerProfile, DemoSession, ScoringCriterion, FileUploadState, LLMProvider, ScoringRubricType, GeminiModelId } from '../types';
import { analyzeTranscript, analyzeTranscriptV2, analyzeTranscriptSE, getAvailableProviders } from '../services/llmService';
import { processTextFile, processPdfFile, processDocxFile, validateFileSize, getFileType, formatFileSize } from '../services/fileProcessingService';
import { saveEvaluation, getUserAverageScore, getLastDemoScore, getUserRecentScores } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { getManagerConfig, getDirectReports } from '../config/managerConfig';
import { Upload, FileText, CheckCircle, User, UserCog, Bot, ArrowRight, AlertCircle, Mic2, Award, TrendingUp, AlertTriangle, Download, PlayCircle, Phone, RefreshCw } from 'lucide-react';
import { fetchClariCalls, fetchClariTranscript, ClariCall } from '../services/clariService';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import {
  calculateTotalScore,
  prioritizeImprovements,
  prioritizeBdrImprovements,
  extractStrengths,
  extractBdrStrengths,
  calculateTrend,
  getBdrStageScore,
  type TrendDirection,
} from '../utils/scoringHelpers';

// Helper to group rubric by section
const groupedRubric = SCORING_RUBRIC.reduce((acc, item) => {
  if (!acc[item.section]) acc[item.section] = [];
  acc[item.section].push(item);
  return acc;
}, {} as Record<string, ScoringCriterion[]>);

const groupedBdrRubric = BDR_SCORING_RUBRIC.reduce((acc, item) => {
  if (!acc[item.section]) acc[item.section] = [];
  acc[item.section].push(item);
  return acc;
}, {} as Record<string, ScoringCriterion[]>);

const BDR_STAGES = ['Open', 'Create Interest', 'Discovery', 'Mirror', 'Qualify & Close'];

const SAMPLE_TRANSCRIPT = `[00:00:30] AE: Thanks everyone. Priya, our Sales Engineer, is going to show how the workflow could fit your service operation.
[00:00:40] Priya SE: Before I open the product, can I confirm what matters most today? You mentioned your dispatch team is losing time reassigning urgent jobs and your managers need better visibility into technician progress.
[00:01:00] Customer: Yes, and we need engineers to actually adopt the mobile workflow. That is the part we are worried about.
[00:01:15] Priya SE: That makes sense. I will show this as your dispatcher and your field technician would experience it. When your dispatcher opens the board, they would start here with unassigned urgent work.
[00:01:45] Priya SE: When you drag this job to the closest qualified technician, your team can see the travel impact before committing the change.
[00:02:10] Customer: How does that connect back to our current accounting system?
[00:02:16] Priya SE: The integration pattern depends on the accounting package and your data rules. I do not want to overstate that without checking your exact setup, so I would document that as a follow-up validation item with our integration specialist.
[00:02:45] Priya SE: For adoption, your supervisors would use this view to spot exceptions rather than asking every technician for status updates. Does that fit the way your team manages the day?`;

const ScoreInput: React.FC<{
  criterion: ScoringCriterion;
  value: number;
  onChange: (val: number) => void;
  feedback: string;
  onFeedbackChange: (val: string) => void;
  disabled?: boolean;
}> = ({ criterion, value, onChange, feedback, onFeedbackChange, disabled }) => (
  <div className="mb-4 p-4 bg-white border border-slate-200 rounded-lg hover:border-brand-blue/30 transition-colors shadow-sm">
    <div className="flex justify-between items-start mb-2">
      <div className="flex-grow pr-4">
        <h4 className="font-bold text-brand-navy text-sm">{criterion.name}</h4>
        <p className="text-xs text-slate-500 mt-1">{criterion.description}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
          <select 
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="bg-transparent font-bold text-brand-navy text-lg outline-none cursor-pointer w-12 text-right"
          >
            {Array.from({ length: criterion.maxPoints + 1 }, (_, i) => i).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-xs font-bold text-slate-300">/ {criterion.maxPoints}</span>
        </div>
      </div>
    </div>
    <textarea
      className="w-full mt-2 p-2 text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white focus:border-brand-yellow outline-none transition-colors resize-none"
      placeholder={disabled ? "No feedback provided" : "Add observations..."}
      rows={2}
      value={feedback}
      onChange={(e) => onFeedbackChange(e.target.value)}
      disabled={disabled}
    />
  </div>
);

type ResultsScreen = 'reveal' | 'coaching' | 'details';
type ClariDateRangeDays = 3 | 7 | 14 | 30;

const BRAD_TESTER_EMAIL = 'brad.towers@simprogroup.com';
const GEMINI_MODEL_OPTIONS: Array<{ id: GeminiModelId; name: string; description: string }> = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Default' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Higher quality' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Test' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', description: 'Fast test' },
];

interface DemoScoringAppProps {
  lockedCallDeliveredBy?: string;
}

export const DemoScoringApp: React.FC<DemoScoringAppProps> = ({ lockedCallDeliveredBy }) => {
  const { user } = useAuth();
  const [rubricType] = useState<ScoringRubricType>('AE');
  const aeManagerConfig = getManagerConfig(user?.email);
  const canSelectGeminiModel = user?.email?.toLowerCase() === BRAD_TESTER_EMAIL;
  const aeDirectReports = aeManagerConfig ? getDirectReports(aeManagerConfig).sort() : [];
  const aeDirectReportsKey = aeDirectReports.join('|');
  const [session, setSession] = useState<DemoSession>({
    id: `eval-${Date.now()}`,
    userId: user?.uid || 'demo-user',
    createdAt: new Date(),
    transcript: '',
    mode: ScoringMode.AI_ONLY,
    selectedProvider: 'gemini',
    selectedGeminiModel: 'gemini-2.5-flash',
    status: 'upload',
    callDeliveredBy: lockedCallDeliveredBy || undefined,
    aiScoring: undefined,
    aeScoring: undefined,
    managerScoring: undefined,
  });

  const [activeTab, setActiveTab] = useState<'input' | 'ai' | 'se' | 'manager' | 'results'>('input');
  const [resultsScreen, setResultsScreen] = useState<ResultsScreen>('reveal');
  const [isLoading, setIsLoading] = useState(false);

  // Clari import state
  type TranscriptInputMode = 'upload' | 'clari';
  const [transcriptInputMode, setTranscriptInputMode] = useState<TranscriptInputMode>('upload');
  const [clariCalls, setClariCalls] = useState<ClariCall[]>([]);
  const [clariLoading, setClariLoading] = useState(false);
  const [clariError, setClariError] = useState<string | null>(null);
  const [clariLoadingTranscript, setClariLoadingTranscript] = useState<string | null>(null);
  const [selectedClariRep, setSelectedClariRep] = useState<string>('all');
  const [selectedClariDateRange, setSelectedClariDateRange] = useState<ClariDateRangeDays>(7);
  const [error, setError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<FileUploadState>({
    isProcessing: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableProviders] = useState(getAvailableProviders());

  // New: User statistics for context
  const [userAverage, setUserAverage] = useState<number | null>(null);
  const [lastDemoScore, setLastDemoScore] = useState<number | null>(null);
  const [trendData, setTrendData] = useState<TrendDirection>('steady');

  useEffect(() => {
    if (aeDirectReports.length > 0 && selectedClariRep === 'all') {
      setSelectedClariRep(aeDirectReports[0]);
    }
  }, [aeDirectReportsKey, selectedClariRep]);

  // Auto-save session to Firestore whenever it changes
  useEffect(() => {
    // Only save if we have a user and the session has meaningful content
    if (user && session.transcript && session.status !== 'upload') {
      const saveSession = async () => {
        try {
          // Update completedAt timestamp when status is 'complete'
          const sessionToSave: DemoSession = {
            ...session,
            userId: user.uid,
            completedAt: session.status === 'complete' ? new Date() : undefined,
          };
          await saveEvaluation(user.uid, sessionToSave);
          console.log('Session auto-saved:', session.id);
        } catch (error) {
          console.error('Failed to auto-save session:', error);
          // Don't show error to user - this is background save
        }
      };
      saveSession();
    }
  }, [session, user]);

  // Fetch user statistics when navigating to results
  useEffect(() => {
    if (activeTab === 'results' && user) {
      const fetchUserStats = async () => {
        try {
          const [avg, last, recent] = await Promise.all([
            getUserAverageScore(user.uid),
            getLastDemoScore(user.uid),
            getUserRecentScores(user.uid, 5),
          ]);
          setUserAverage(avg);
          setLastDemoScore(last);
          if (recent.length >= 2) {
            setTrendData(calculateTrend(recent));
          }
        } catch (error) {
          console.error('Failed to fetch user statistics:', error);
          // Don't block UI - statistics are optional enhancements
        }
      };
      fetchUserStats();
      // Reset to reveal screen when entering results
      setResultsScreen('reveal');
    }
  }, [activeTab, user]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous errors
    setError(null);

    try {
      // 1. VALIDATE FILE SIZE (10MB limit)
      if (!validateFileSize(file)) {
        setError(`File size exceeds 10MB limit (${formatFileSize(file.size)}). Please use a smaller file.`);
        return;
      }

      // 2. DETERMINE FILE TYPE
      const fileType = getFileType(file);
      if (fileType === 'unsupported') {
        setError('Unsupported file format. Please upload .txt, .md, .pdf, or .docx files.');
        return;
      }

      // 3. SET PROCESSING STATE (show loading UI)
      setUploadState({
        isProcessing: true,
        fileName: file.name,
        fileSize: file.size,
      });

      // 4. PROCESS FILE BASED ON TYPE
      let extractedText: string;

      switch (fileType) {
        case 'txt':
          extractedText = await processTextFile(file);
          break;
        case 'pdf':
          extractedText = await processPdfFile(file);
          break;
        case 'docx':
          extractedText = await processDocxFile(file);
          break;
        default:
          throw new Error('Unknown file type');
      }

      // 5. VALIDATE EXTRACTED TEXT
      if (!extractedText || extractedText.length < 50) {
        setError('File appears to be empty or too short. Please upload a valid transcript.');
        return;
      }

      // 6. UPDATE SESSION WITH TRANSCRIPT
      setSession(prev => ({ ...prev, transcript: extractedText }));

    } catch (err: any) {
      console.error('File processing error:', err);

      // Provide user-friendly error messages
      let errorMessage = `Failed to process ${file.name}`;
      if (err.message.includes('password')) {
        errorMessage = 'PDF is password-protected. Please upload an unprotected version.';
      } else if (err.message.includes('Invalid PDF') || err.message.includes('corrupted')) {
        errorMessage = 'PDF file is corrupted or invalid. Please try a different file.';
      } else if (err.message.includes('DOCX')) {
        errorMessage = 'Failed to process DOCX. The file may be corrupted or in an unsupported format.';
      } else {
        errorMessage += `: ${err.message || 'Unknown error'}`;
      }

      setError(errorMessage);

    } finally {
      // 7. CLEAR PROCESSING STATE
      setUploadState({ isProcessing: false });

      // 8. RESET FILE INPUT (allows re-uploading same file)
      e.target.value = '';
    }
  };

  const loadSampleData = () => {
    setSession(prev => ({ ...prev, transcript: SAMPLE_TRANSCRIPT }));
  };

  const openFileDialog = () => {
    setTranscriptInputMode('upload');
    fileInputRef.current?.click();
  };

  // Clari handlers
  const loadClariCalls = async () => {
    setClariLoading(true);
    setClariError(null);
    try {
      const repName = selectedClariRep !== 'all' ? selectedClariRep : undefined;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - selectedClariDateRange);
      const calls = await fetchClariCalls(startDate.toISOString().split('T')[0], repName);
      setClariCalls(calls);
    } catch (e: any) {
      setClariError(e?.message ?? 'Failed to load Clari calls. Check that Clari API credentials are configured.');
    } finally {
      setClariLoading(false);
    }
  };

  const selectClariCall = async (call: ClariCall) => {
    setClariLoadingTranscript(call.id);
    setClariError(null);
    try {
      const result = await fetchClariTranscript(call.id, selectedClariRep !== 'all' ? selectedClariRep : undefined);
      setSession(prev => ({
        ...prev,
        transcript: result.transcript,
        callDeliveredBy: prev.callDeliveredBy || (selectedClariRep !== 'all' ? selectedClariRep : result.aeName) || '',
      }));
      setTranscriptInputMode('upload'); // switch back so user sees the loaded transcript
    } catch (e: any) {
      setClariError(e?.message ?? 'Failed to load transcript for this call.');
    } finally {
      setClariLoadingTranscript(null);
    }
  };

  // Handle Scoring Start
  const startScoring = async () => {
    if (!session.transcript) {
        setError("Please provide a transcript first.");
        return;
    }
    setError(null);
    setIsLoading(true);
    setSession(prev => ({ ...prev, status: 'analyzing' }));

    try {
      // SE calls use the dedicated SE scorecard flow in this cloned app.
      if (rubricType === 'AE') {
        const seScore = await analyzeTranscriptSE(
          session.transcript,
          'gemini',
          session.callDeliveredBy || undefined,
          session.selectedGeminiModel
        );
        setSession(prev => ({
          ...prev,
          status: 'complete',
          rubricType,
          seScoring: seScore,
        }));
        setActiveTab('results');
        return;
      }

      // BDR calls continue with V1 path
      let aiScore: ScorerProfile | undefined = undefined;

      if (session.mode === ScoringMode.AI_ONLY || session.mode === ScoringMode.HYBRID) {
        try {
            aiScore = await analyzeTranscript(session.transcript, session.selectedProvider || 'gemini', rubricType, session.selectedGeminiModel);
        } catch (apiError) {
            console.error("AI Analysis Failed", apiError);
            if (session.mode === ScoringMode.AI_ONLY) {
                throw new Error("AI Analysis failed. Please check your API key.");
            }
            setError("AI Coach failed to respond (Check API Key). Continuing with manual scoring.");
        }
      }

      const activeRubric = BDR_SCORING_RUBRIC;
      const emptyProfile: ScorerProfile = {
        role: 'AE',
        scores: activeRubric.map(p => ({ criterionId: p.id, score: 0, reasoning: '' })),
        executiveSummary: ''
      };

      const managerProfile: ScorerProfile = {
        role: 'MANAGER',
        scores: activeRubric.map(p => ({ criterionId: p.id, score: 0, reasoning: '' })),
        executiveSummary: ''
      };

      setSession(prev => ({
        ...prev,
        status: 'scoring',
        rubricType,
        bdrRepEmail: user?.email || undefined,
        callDeliveredBy: user?.displayName || undefined,
        aiScoring: aiScore,
        aeScoring: session.mode !== ScoringMode.AI_ONLY ? emptyProfile : undefined,
        managerScoring: (session.mode === ScoringMode.MANUAL_PEER || session.mode === ScoringMode.HYBRID) ? managerProfile : undefined
      }));

      if (session.mode === ScoringMode.AI_ONLY && aiScore) {
        setSession(prev => ({...prev, status: 'complete'}));
        setActiveTab('results');
      } else {
        setActiveTab('se');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze transcript.");
      setSession(prev => ({ ...prev, status: 'upload' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to update manual scores
  const updateManualScore = (role: 'AE' | 'MANAGER', criterionId: string, val: number, feedback: string) => {
    setSession(prev => {
      const targetProfile = role === 'AE' ? prev.aeScoring : prev.managerScoring;
      if (!targetProfile) return prev;

      const newScores = targetProfile.scores.map(s => 
        s.criterionId === criterionId ? { ...s, score: val, reasoning: feedback } : s
      );

      return {
        ...prev,
        [role === 'AE' ? 'aeScoring' : 'managerScoring']: { ...targetProfile, scores: newScores }
      };
    });
  };

  // Generate Chart Data
  const getChartData = () => {
    const sections = Object.keys(groupedRubric);
    
    return sections.map(section => {
      const criteria = groupedRubric[section];
      const maxSectionPoints = criteria.reduce((sum, c) => sum + c.maxPoints, 0);

      const getSectionPercentage = (profile?: ScorerProfile) => {
        if (!profile) return 0;
        const currentPoints = criteria.reduce((sum, c) => {
          const score = profile.scores.find(s => s.criterionId === c.id)?.score || 0;
          return sum + score;
        }, 0);
        return Math.round((currentPoints / maxSectionPoints) * 100);
      };

      return {
        subject: section,
        A: getSectionPercentage(session.aiScoring),
        B: getSectionPercentage(session.aeScoring),
        C: getSectionPercentage(session.managerScoring),
        fullMark: 100,
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Main App Header */}
      <div className="bg-brand-blue text-white py-10 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-brand-yellow mb-2">
               <CheckCircle size={16} className="text-green-400"/>
               <span className="uppercase tracking-wider text-xs font-bold text-green-400">System Operational</span>
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">SE Demo Scoring</h1>
            <p className="text-slate-300 max-w-2xl text-lg font-light">
              Upload a customer-facing demo transcript and get evidence-based Sales Engineering coaching.
            </p>
          </div>
          <div className="hidden lg:block">
             <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20 flex gap-8">
                <div className="text-center">
                   <div className="text-2xl font-bold text-white">100</div>
                   <div className="text-xs text-slate-400 uppercase font-semibold">Max Score</div>
                </div>
                <div className="w-px bg-white/20"></div>
                <div className="text-center">
                   <div className="text-2xl font-bold text-brand-yellow">10</div>
                   <div className="text-xs text-slate-400 uppercase font-semibold">SE Categories</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
          
          {/* Progress Tabs */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-4 overflow-x-auto">
            {[
              { id: 'input', label: '1. Setup', icon: Upload },
              { id: 'results', label: '2. SE Scorecard', icon: Award, disabled: session.status !== 'complete' && session.status !== 'scoring' }
            ].map((step) => (
              <button 
                key={step.id}
                onClick={() => !step.disabled && setActiveTab(step.id as any)}
                disabled={step.disabled}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap border
                  ${activeTab === step.id 
                    ? 'bg-brand-navy border-brand-navy text-white shadow-lg transform scale-105' 
                    : step.disabled 
                      ? 'border-transparent text-slate-300 cursor-not-allowed' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-yellow hover:text-brand-navy'
                  }`}
              >
                <step.icon size={16} />
                {step.label}
              </button>
            ))}
          </div>

          <div className="p-8 flex-grow bg-white relative">
            
            {/* STEP 1: UPLOAD & CONFIG */}
            {activeTab === 'input' && (
              <div className="max-w-4xl mx-auto animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                  
                  {/* Left: Upload / Clari */}
                  <div>
                    <h3 className="text-xl font-bold text-brand-navy mb-4 flex items-center gap-2">
                      <Upload className="text-brand-yellow" size={20} /> Data Input
                    </h3>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.pdf,.docx"
                      onChange={handleFileUpload}
                      aria-label="Upload transcript file (txt, md, pdf, or docx, maximum 10MB)"
                      className="sr-only"
                      tabIndex={-1}
                    />

                    {/* Tab switcher */}
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-5">
                      <button
                        onClick={openFileDialog}
                        disabled={uploadState.isProcessing}
                        className={`flex-1 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                          transcriptInputMode === 'upload'
                            ? 'bg-brand-navy text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Upload size={14} /> Upload / Paste
                      </button>
                      <button
                        onClick={() => {
                          setTranscriptInputMode('clari');
                          if (clariCalls.length === 0 && !clariLoading) loadClariCalls();
                        }}
                        className={`flex-1 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                          transcriptInputMode === 'clari'
                            ? 'bg-brand-navy text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Phone size={14} /> Import from Clari
                      </button>
                    </div>

                    {/* Upload / Paste panel */}
                    {transcriptInputMode === 'upload' && (
                      <>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative group h-64 flex flex-col justify-center items-center">
                          <div className="mb-4">
                            <div className="w-16 h-16 bg-brand-yellow/10 rounded-full text-brand-yellow flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                              <FileText size={32} />
                            </div>
                          </div>
                          <p className="text-base font-bold text-slate-700 mb-1">Drag transcript here</p>
                          <p className="text-xs text-slate-400 mb-4">Supported: .txt, .md, .pdf, .docx (Max 10MB)</p>
                          <Button
                            variant="secondary"
                            className="z-20 relative pointer-events-auto"
                            onClick={openFileDialog}
                          >
                            Browse Files
                          </Button>

                          {uploadState.isProcessing && (
                            <div
                              role="status"
                              aria-live="polite"
                              className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-30"
                            >
                              <div className="w-12 h-12 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin mb-3"></div>
                              <p className="text-sm font-bold text-brand-navy">
                                Processing {uploadState.fileName}...
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {formatFileSize(uploadState.fileSize || 0)}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-400">
                          <span className="uppercase font-bold text-[10px] tracking-wider">OR</span>
                        </div>

                        <div className="mt-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Paste Transcript
                          </label>
                          <textarea
                            rows={8}
                            value={session.transcript}
                            onChange={(e) => {
                              setSession(prev => ({ ...prev, transcript: e.target.value }));
                              setUploadState(prev => ({ ...prev, fileName: undefined }));
                            }}
                            placeholder="Paste transcript text here..."
                            className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:border-brand-yellow focus:outline-none resize-y"
                          />
                        </div>

                        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-400">
                          <span className="uppercase font-bold text-[10px] tracking-wider">OR</span>
                        </div>

                        <button
                          onClick={loadSampleData}
                          className="w-full mt-2 py-2 text-xs font-bold text-brand-blue hover:text-brand-yellow hover:bg-brand-blue/5 rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <PlayCircle size={14} /> Load Sample Transcript (Test Mode)
                        </button>
                      </>
                    )}

                    {/* Clari import panel */}
                    {transcriptInputMode === 'clari' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-500">
                            Select a call to import its transcript
                            {aeManagerConfig && selectedClariRep !== 'all' && (
                              <span className="block text-xs text-slate-400 mt-0.5">Showing Clari calls for {selectedClariRep}</span>
                            )}
                          </p>
                          <button
                            onClick={loadClariCalls}
                            disabled={clariLoading}
                            className="text-xs text-brand-navy hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            <RefreshCw size={11} className={clariLoading ? 'animate-spin' : ''} />
                            {clariLoading ? 'Loading...' : 'Refresh'}
                          </button>
                        </div>

                        {aeManagerConfig && (
                          <div className="space-y-3">
                            <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Rep to Import from Clari
                            </label>
                            <select
                              value={selectedClariRep}
                              onChange={(e) => {
                                const rep = e.target.value;
                                setSelectedClariRep(rep);
                                setClariCalls([]);
                                setClariError(null);
                                if (!lockedCallDeliveredBy) {
                                  setSession(prev => ({ ...prev, callDeliveredBy: rep }));
                                }
                              }}
                              className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:border-brand-yellow focus:outline-none"
                            >
                              {aeDirectReports.map(rep => (
                                <option key={rep} value={rep}>{rep}</option>
                              ))}
                            </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Call Date Range
                              </label>
                              <select
                                value={selectedClariDateRange}
                                onChange={(e) => {
                                  setSelectedClariDateRange(Number(e.target.value) as ClariDateRangeDays);
                                  setClariCalls([]);
                                  setClariError(null);
                                }}
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:border-brand-yellow focus:outline-none"
                              >
                                <option value={3}>Last 3 days</option>
                                <option value={7}>Last 7 days</option>
                                <option value={14}>Last 14 days</option>
                                <option value={30}>Last 30 days</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {clariError && (
                          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                            {clariError}
                          </div>
                        )}

                        {clariLoading && (
                          <div className="text-sm text-slate-400 text-center py-12">
                            <div className="w-8 h-8 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            Loading calls from Clari...
                          </div>
                        )}

                        {!clariLoading && clariCalls.length === 0 && !clariError && (
                          <div className="text-sm text-slate-400 text-center py-12 space-y-1">
                            <p className="font-medium">No recorded customer calls found</p>
                            <p className="text-xs">
                              {aeManagerConfig && selectedClariRep !== 'all'
                                ? `No Clari calls were found for ${selectedClariRep}.`
                                : 'Only external calls with Clari transcripts will appear here.'}
                            </p>
                          </div>
                        )}

                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                          {!clariLoading && clariCalls.map(call => (
                            <button
                              key={call.id}
                              onClick={() => selectClariCall(call)}
                              disabled={!!clariLoadingTranscript}
                              className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-brand-navy hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{call.title}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {call.aeName && <span>{call.aeName} · </span>}
                                    {call.date && <span>{new Date(call.date).toLocaleDateString()} · </span>}
                                    {call.durationSeconds > 0 && <span>{Math.round(call.durationSeconds / 60)} min</span>}
                                  </p>
                                  {call.status && (
                                    <p className={`text-[11px] font-semibold mt-1 ${
                                      call.hasTranscript ? 'text-green-700' : 'text-amber-700'
                                    }`}>
                                      Clari status: {call.status}
                                      {!call.hasTranscript && ' · transcript not confirmed'}
                                    </p>
                                  )}
                                </div>
                                {clariLoadingTranscript === call.id && (
                                  <div className="w-4 h-4 border-2 border-brand-navy border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {session.transcript && (
                       <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-800 shadow-sm">
                          <CheckCircle size={20} />
                          <div>
                             <p className="font-bold text-sm">Transcript Loaded Successfully</p>
                             <p className="text-xs opacity-80">
                               {session.transcript.length.toLocaleString()} characters ready for analysis
                               {uploadState.fileName && ` • from ${uploadState.fileName}`}
                             </p>
                          </div>
                       </div>
                    )}

                    {session.transcript && (
                      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                        <label className="block text-sm font-semibold text-brand-navy mb-2">
                          Sales Engineer Being Scored:
                        </label>
                        <input
                          type="text"
                          value={lockedCallDeliveredBy || session.callDeliveredBy || ''}
                          onChange={(e) => !lockedCallDeliveredBy && setSession(prev => ({
                            ...prev,
                            callDeliveredBy: e.target.value
                          }))}
                          readOnly={!!lockedCallDeliveredBy}
                          placeholder="Enter SE name..."
                          className={`w-full p-2 border border-gray-300 rounded outline-none ${
                            !!lockedCallDeliveredBy
                              ? 'bg-gray-50 text-gray-600 cursor-not-allowed'
                              : 'focus:border-brand-yellow'
                          }`}
                        />
                        {!!lockedCallDeliveredBy ? (
                          <p className="text-xs text-brand-navy font-semibold mt-1">
                            Locked — scoring on behalf of manager selection
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">
                            Enter the target Sales Engineer if the transcript does not make it obvious.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Mode Selection */}
                  <div className="flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-brand-navy mb-4">Configuration</h3>

                        {/* AI Provider Selection */}
                        <div className="mb-6">
                          <h4 className="text-sm font-bold text-brand-navy mb-2 flex items-center gap-2">
                            <Bot size={16} />
                            AI Provider
                          </h4>
                          <select
                            value={session.selectedProvider || 'gemini'}
                            onChange={(e) => setSession({
                              ...session,
                              selectedProvider: e.target.value as LLMProvider
                            })}
                            className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm focus:border-brand-yellow focus:outline-none"
                          >
                            {availableProviders.map(provider => (
                              <option
                                key={provider.id}
                                value={provider.id}
                                disabled={!provider.isConfigured}
                              >
                                {provider.name}{provider.description ? ` - ${provider.description}` : ''}
                              </option>
                            ))}
                          </select>
                          {session.selectedProvider && !availableProviders.find(p => p.id === session.selectedProvider)?.isConfigured && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ Provider not available. Check Firebase configuration.
                            </p>
                          )}
                        </div>

                        {canSelectGeminiModel && (session.selectedProvider || 'gemini') === 'gemini' && (
                          <div className="mb-6">
                            <h4 className="text-sm font-bold text-brand-navy mb-2 flex items-center gap-2">
                              <Bot size={16} />
                              AI Model
                            </h4>
                            <select
                              value={session.selectedGeminiModel || 'gemini-2.5-flash'}
                              onChange={(e) => setSession({
                                ...session,
                                selectedGeminiModel: e.target.value as GeminiModelId,
                              })}
                              className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm focus:border-brand-yellow focus:outline-none"
                            >
                              {GEMINI_MODEL_OPTIONS.map(model => (
                                <option key={model.id} value={model.id}>
                                  {model.name} - {model.description}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Visible only to Brad for model testing. Other users stay on Gemini 2.5 Flash.
                            </p>
                          </div>
                        )}

                        <div className="space-y-3">
                          {[
                            { mode: ScoringMode.AI_ONLY, title: "AI SE Scorecard", desc: "Evidence-based scoring against the SE demo rubric.", icon: Bot, disabled: false }
                          ].map((option) => (
                            <div
                              key={option.mode}
                              onClick={() => !option.disabled && setSession({...session, mode: option.mode})}
                              className={`border rounded-xl p-4 flex items-center gap-4 transition-all ${
                                option.disabled
                                  ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                                  : session.mode === option.mode
                                  ? 'cursor-pointer border-brand-yellow bg-brand-yellow/5 ring-1 ring-brand-yellow shadow-md'
                                  : 'cursor-pointer border-slate-200 hover:border-brand-navy/30 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${!option.disabled && session.mode === option.mode ? 'bg-white text-brand-navy shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                                <option.icon size={20} />
                              </div>
                              <div>
                                <h4 className={`font-bold text-sm ${option.disabled ? 'text-slate-400' : 'text-brand-navy'}`}>{option.title}</h4>
                                <p className="text-xs text-slate-500">{option.desc}</p>
                              </div>
                              {!option.disabled && session.mode === option.mode && <div className="ml-auto w-3 h-3 bg-brand-yellow rounded-full"></div>}
                            </div>
                          ))}
                        </div>
                    </div>

                    {error && (
                      <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-3 text-sm">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <div>
                           <span className="font-bold block">Error</span>
                           {error}
                        </div>
                      </div>
                    )}

                    <Button fullWidth onClick={startScoring} disabled={isLoading || !session.transcript} className="mt-6 py-4 text-base">
                      {isLoading ? 'Analyzing Transcript...' : 'Begin Evaluation'}
                      {!isLoading && <ArrowRight size={18} />}
                    </Button>
                  </div>
                </div>

                {/* Text Preview */}
                {session.transcript && (
                  <div className="mt-8 pt-8 border-t border-slate-200">
                     <p className="text-xs font-bold text-slate-400 uppercase mb-2">Preview</p>
                     <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono text-slate-500 max-h-32 overflow-hidden relative">
                        {session.transcript}
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-slate-50 to-transparent"></div>
                     </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 & 3: MANUAL SCORING */}
            {(activeTab === 'se' || activeTab === 'manager') && (
              <div className="h-[calc(100vh-300px)] flex flex-col lg:flex-row gap-6 animate-fadeIn">
                {/* Left: Transcript Reference */}
                <div className="lg:w-1/3 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                   <div className="bg-white p-4 border-b border-slate-200 shadow-sm">
                      <h3 className="font-bold text-brand-navy text-sm uppercase flex items-center gap-2">
                        <FileText size={16}/> Transcript Reference
                      </h3>
                   </div>
                   <div className="p-6 flex-grow overflow-y-auto font-mono text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {session.transcript}
                   </div>
                </div>

                {/* Right: Rubric Form */}
                <div className="lg:w-2/3 flex flex-col h-full overflow-hidden">
                   <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
                          {activeTab === 'se' ? <User size={24} className="text-brand-yellow"/> : <UserCog size={24} className="text-brand-blue"/>}
                          {activeTab === 'se' ? 'Self Assessment' : 'Manager Review'}
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Score against the SE Demo Scorecard.</p>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-bold text-slate-400 uppercase">Current Score</div>
                         <div className="text-2xl font-black text-brand-navy">
                            {calculateTotalScore(activeTab === 'se' ? session.aeScoring : session.managerScoring)}
                            <span className="text-lg text-slate-300 font-medium">/100</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex-grow overflow-y-auto pr-4 space-y-8 pb-4">
                      {Object.keys(rubricType === 'BDR' ? groupedBdrRubric : groupedRubric).map((section) => {
                        const activeGrouped = rubricType === 'BDR' ? groupedBdrRubric : groupedRubric;
                        return (
                        <div key={section}>
                           <div className="flex items-center gap-2 mb-4">
                              <div className="h-px bg-slate-200 flex-grow"></div>
                              <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider">{section}</h3>
                              <div className="h-px bg-slate-200 flex-grow"></div>
                           </div>
                           <div className="grid grid-cols-1 gap-4">
                             {activeGrouped[section].map(criterion => {
                               const currentProfile = activeTab === 'se' ? session.aeScoring : session.managerScoring;
                               const scoreData = currentProfile?.scores.find(s => s.criterionId === criterion.id);
                               
                               return (
                                 <ScoreInput 
                                    key={criterion.id}
                                    criterion={criterion}
                                    value={scoreData?.score || 0}
                                    onChange={(val) => updateManualScore(activeTab === 'se' ? 'AE' : 'MANAGER', criterion.id, val, scoreData?.reasoning || '')}
                                    feedback={scoreData?.reasoning || ''}
                                    onFeedbackChange={(val) => updateManualScore(activeTab === 'se' ? 'AE' : 'MANAGER', criterion.id, scoreData?.score || 0, val)}
                                 />
                               );
                             })}
                           </div>
                        </div>
                        );
                      })}
                   </div>

                   <div className="pt-4 mt-2 border-t border-slate-200">
                      <Button fullWidth onClick={() => {
                          if (activeTab === 'se' && (session.mode === ScoringMode.HYBRID || session.mode === ScoringMode.MANUAL_PEER)) {
                            setActiveTab('manager');
                          } else {
                            setSession(prev => ({...prev, status: 'complete'}));
                            setActiveTab('results');
                          }
                        }}>
                        {activeTab === 'se' ? 'Submit Assessment & Continue' : 'Finalize Report'}
                      </Button>
                   </div>
                </div>
              </div>
            )}

            {/* STEP 4: RESULTS - Multi-Screen Flow */}
            {activeTab === 'results' && (
              <div className="animate-fadeIn">
                {/* SE Results */}
                {resultsScreen === 'reveal' && session.rubricType === 'AE' && session.seScoring && (
                  <SeScoreReveal
                    session={session}
                    onViewCoachingReport={() => setResultsScreen('coaching')}
                    onSkipToDetails={() => setResultsScreen('details')}
                  />
                )}

                {resultsScreen === 'coaching' && session.rubricType === 'AE' && session.seScoring && (
                  <SeCoachingSummary
                    session={session}
                    onBack={() => setResultsScreen('reveal')}
                    onViewDetails={() => setResultsScreen('details')}
                  />
                )}

                {resultsScreen === 'details' && session.rubricType === 'AE' && session.seScoring && (
                  <SeCallScorecard
                    session={session}
                    onBack={() => setResultsScreen('coaching')}
                    expandAll
                  />
                )}

                {/* BDR Results */}
                {resultsScreen === 'reveal' && session.rubricType === 'BDR' && session.aiScoring && (
                  <ScoreReveal
                    totalScore={calculateTotalScore(session.aiScoring)}
                    userAverage={userAverage}
                    lastDemoScore={lastDemoScore}
                    trend={trendData}
                    callDeliveredBy={session.callDeliveredBy}
                    rubricType='BDR'
                    demoBooked={session.aiScoring.demoBooked}
                    bdrStageScores={BDR_STAGES.map(stage => ({ stage, ...getBdrStageScore(session.aiScoring!.scores, stage) }))}
                    onViewCoachingReport={() => setResultsScreen('coaching')}
                    onSkipToDetails={() => setResultsScreen('details')}
                  />
                )}

                {resultsScreen === 'coaching' && session.rubricType === 'BDR' && session.aiScoring && (
                  <BdrCallScorecard
                    session={session}
                    isManager={false}
                    onBack={() => setResultsScreen('reveal')}
                  />
                )}

                {/* Screen 3: Detailed Breakdown (BDR calls only) */}
                {resultsScreen === 'details' && session.rubricType === 'BDR' && (
                  <div className="max-w-6xl mx-auto">
                    {/* Header with Back Navigation */}
                    <div className="mb-6">
                      <Button
                        variant="ghost"
                        onClick={() => setResultsScreen('coaching')}
                        className="mb-4"
                      >
                        ← Back to Coaching Summary
                      </Button>
                      <div className="flex flex-col md:flex-row items-start justify-between gap-4 border-b border-slate-100 pb-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="text-brand-yellow" size={24} />
                            <span className="text-sm font-bold text-brand-yellow uppercase tracking-wider">
                              Detailed Rubric Scores
                            </span>
                          </div>
                          <h2 className="text-3xl font-black text-brand-navy">Complete Breakdown</h2>
                          {session.callDeliveredBy && (
                            <p className="text-sm text-gray-600 mt-1">
                              Call conducted by: <span className="font-semibold">{session.callDeliveredBy}</span>
                            </p>
                          )}
                          <p className="text-slate-500">
                            Simpro Sales Call Scoring Framework
                          </p>
                        </div>
                        <div className="flex gap-3 items-center">
                          {session.aiScoring && (
                            <div className="bg-brand-navy text-white p-4 rounded-lg text-center min-w-[120px] shadow-lg">
                              <span className="block text-[10px] font-bold opacity-60 uppercase">
                                AI Score
                              </span>
                              <span className="block text-3xl font-black text-brand-yellow">
                                {calculateTotalScore(session.aiScoring)}
                              </span>
                            </div>
                          )}
                          <Button
                            onClick={() => window.print()}
                            variant="outline"
                            className="h-full flex gap-2"
                          >
                            <Download size={18} /> Print / PDF
                          </Button>
                        </div>
                      </div>
                    </div>

                {/* Top Section: Executive Summary & Radar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                  
                  {/* Executive Summary */}
                  {session.aiScoring && (
                    <div className="lg:col-span-2 bg-white border border-brand-blue/10 rounded-xl shadow-lg overflow-hidden relative group">
                      <div className="bg-brand-navy p-6 text-white flex items-center gap-3">
                         <Bot size={24} className="text-brand-yellow" />
                         <h3 className="text-lg font-bold">DiscoveryCoachAI Summary</h3>
                         {session.aiScoring.vertical && session.aiScoring.vertical !== 'Unknown' && (
                           <span className="ml-auto bg-brand-yellow text-brand-navy px-3 py-1 rounded-full text-xs font-bold">
                             {session.aiScoring.vertical}
                           </span>
                         )}
                      </div>
                      
                      <div className="p-8 relative">
                         <p className="text-slate-700 text-lg leading-relaxed italic border-l-4 border-brand-yellow pl-4 mb-8">
                           "{session.aiScoring.executiveSummary}"
                         </p>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-green-50/50 p-5 rounded-lg border border-green-100">
                               <h4 className="text-green-700 font-bold text-sm uppercase mb-3 flex items-center gap-2"><CheckCircle size={16}/> Top Wins</h4>
                               <ul className="space-y-3">
                                  {session.aiScoring.topWins?.map((win, i) => (
                                    <li key={i} className="text-sm text-slate-700 flex gap-2 items-start">
                                       <span className="block w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                       {win}
                                    </li>
                                  ))}
                               </ul>
                            </div>
                            <div className="bg-brand-yellow/5 p-5 rounded-lg border border-brand-yellow/20">
                               <h4 className="text-brand-navy font-bold text-sm uppercase mb-3 flex items-center gap-2"><TrendingUp size={16}/> Improvement Areas</h4>
                               <ul className="space-y-3">
                                  {session.aiScoring.topFixes?.map((fix, i) => (
                                    <li key={i} className="text-sm text-slate-700 flex gap-2 items-start">
                                       <span className="block w-1.5 h-1.5 bg-brand-yellow rounded-full mt-1.5 flex-shrink-0"></span>
                                       {fix}
                                    </li>
                                  ))}
                               </ul>
                            </div>
                         </div>
                      </div>
                    </div>
                  )}

                  {/* Radar Chart */}
                  <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                    <h4 className="font-bold text-brand-navy text-center mb-4 text-sm uppercase tracking-wider">Score Alignment</h4>
                    <div className="w-full h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getChartData()}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" tick={false} />
                          
                          {session.aiScoring && (
                            <Radar name="AI Coach" dataKey="A" stroke="#FFC20E" strokeWidth={3} fill="#FFC20E" fillOpacity={0.3} />
                          )}
                          {session.aeScoring && (
                            <Radar name="Self" dataKey="B" stroke="#64748b" strokeWidth={2} fill="#64748b" fillOpacity={0.1} />
                          )}
                          {session.managerScoring && (
                            <Radar name="Manager" dataKey="C" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.1} />
                          )}
                          <Legend wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                          <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-8">
                  {Object.keys(session.rubricType === 'BDR' ? groupedBdrRubric : groupedRubric).map(section => {
                    const activeGrouped = session.rubricType === 'BDR' ? groupedBdrRubric : groupedRubric;
                    return (
                    <div key={section} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                       <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                          <h3 className="font-bold text-brand-navy text-lg uppercase tracking-tight">{section}</h3>
                          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                            Section Max: {activeGrouped[section].reduce((a,b) => a + b.maxPoints, 0)} pts
                          </span>
                       </div>

                       <div className="divide-y divide-slate-100">
                          {activeGrouped[section].map(criterion => {
                             const aiData = session.aiScoring?.scores.find(s => s.criterionId === criterion.id);
                             const seData = session.aeScoring?.scores.find(s => s.criterionId === criterion.id);
                             const mgrData = session.managerScoring?.scores.find(s => s.criterionId === criterion.id);

                             // Only show items if we have data
                             if (!aiData && !seData && !mgrData) return null;

                             const isPerfectScore = aiData && aiData.score === criterion.maxPoints;

                             return (
                               <div key={criterion.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
                                  <div className="flex justify-between items-start mb-4">
                                     <div className="max-w-2xl">
                                        <h4 className="font-bold text-brand-navy text-base flex items-center gap-2">
                                           {criterion.name}
                                           {isPerfectScore && <Award size={14} className="text-brand-yellow"/>}
                                        </h4>
                                        <p className="text-sm text-slate-500 mt-1">{criterion.description}</p>
                                     </div>
                                     {/* Scores Display */}
                                     <div className="flex gap-4">
                                        {aiData && (
                                          <div className="text-center">
                                             <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-lg border-2 shadow-sm ${
                                                isPerfectScore ? 'border-green-500 text-green-700 bg-green-50' :
                                                aiData.score === 0 ? 'border-red-200 text-red-400 bg-red-50' : 'border-brand-yellow text-brand-navy bg-brand-yellow/10'
                                             }`}>
                                                {aiData.score}
                                             </div>
                                             <span className="text-[9px] font-bold text-slate-400 uppercase mt-2 block tracking-wider">AI</span>
                                          </div>
                                        )}
                                        {seData && (
                                           <div className="text-center opacity-70">
                                              <div className="w-12 h-12 flex items-center justify-center rounded-xl font-bold text-lg bg-slate-100 text-slate-600 border border-slate-200">
                                                 {seData.score}
                                              </div>
                                              <span className="text-[9px] font-bold text-slate-400 uppercase mt-2 block tracking-wider">Self</span>
                                           </div>
                                        )}
                                        {mgrData && (
                                           <div className="text-center opacity-70">
                                              <div className="w-12 h-12 flex items-center justify-center rounded-xl font-bold text-lg bg-blue-50 text-blue-600 border border-blue-100">
                                                 {mgrData.score}
                                              </div>
                                              <span className="text-[9px] font-bold text-slate-400 uppercase mt-2 block tracking-wider">Mgr</span>
                                           </div>
                                        )}
                                     </div>
                                  </div>

                                  {/* Feedback Content */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                                     {aiData && (
                                        <div className="space-y-3">
                                           <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 relative">
                                              <div className="absolute top-3 right-3 text-slate-300"><Bot size={16}/></div>
                                              <strong className="text-xs font-bold text-slate-500 uppercase block mb-2">AI Observation</strong>
                                              <p className="text-sm text-slate-700 leading-relaxed">{aiData.reasoning}</p>
                                           </div>
                                           {aiData.coaching && !isPerfectScore && (
                                             <div className="bg-brand-yellow/5 p-4 rounded-lg border-l-4 border-brand-yellow">
                                                <strong className="text-xs font-bold text-brand-navy uppercase flex items-center gap-1 mb-2">
                                                  <AlertTriangle size={12}/> Coaching Fix
                                                </strong>
                                                <p className="text-sm text-brand-navy font-medium leading-relaxed">{aiData.coaching}</p>
                                             </div>
                                           )}
                                        </div>
                                     )}
                                     
                                     {(seData?.reasoning || mgrData?.reasoning) && (
                                        <div className="space-y-3">
                                           {seData?.reasoning && (
                                              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                  <strong className="text-xs font-bold text-slate-400 uppercase block mb-2">Self Notes</strong>
                                                  <p className="text-sm text-slate-600 italic">"{seData.reasoning}"</p>
                                              </div>
                                           )}
                                           {mgrData?.reasoning && (
                                              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                                  <strong className="text-xs font-bold text-blue-400 uppercase block mb-2">Manager Notes</strong>
                                                  <p className="text-sm text-blue-800 italic">"{mgrData.reasoning}"</p>
                                              </div>
                                           )}
                                        </div>
                                     )}
                                  </div>
                               </div>
                             );
                          })}
                       </div>
                    </div>
                  );
                  })}
                </div>

                    {/* Footer: Start New Evaluation */}
                    <div className="mt-12 mb-12 text-center">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSession((prev) => ({
                            ...prev,
                            id: 'new',
                            transcript: '',
                            status: 'upload',
                          }));
                          setActiveTab('input');
                          setResultsScreen('reveal');
                        }}
                      >
                        Start New Evaluation Session
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
