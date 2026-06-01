import React from 'react';
import { Target, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './Button';
import {
  getScoreInterpretation,
  getInterpretationLabel,
  getInterpretationColor,
  getTrendEmoji,
  getBdrGrade,
  getBdrGradeLabel,
  getBdrGradeColor,
  type TrendDirection,
  type ScoreInterpretation,
} from '../utils/scoringHelpers';
import { ScoringRubricType } from '../types';

interface ScoreRevealProps {
  totalScore: number;
  userAverage: number | null;
  lastDemoScore: number | null;
  trend: TrendDirection;
  callDeliveredBy?: string;
  rubricType?: ScoringRubricType;
  demoBooked?: boolean;
  bdrStageScores?: { stage: string; earned: number; max: number; pct: number }[];
  onViewCoachingReport: () => void;
  onSkipToDetails: () => void;
}

export const ScoreReveal: React.FC<ScoreRevealProps> = ({
  totalScore,
  userAverage,
  lastDemoScore,
  trend,
  callDeliveredBy,
  rubricType = 'AE',
  demoBooked,
  bdrStageScores,
  onViewCoachingReport,
  onSkipToDetails,
}) => {
  const isBdr = rubricType === 'BDR';

  // AE interpretation
  const interpretation: ScoreInterpretation = getScoreInterpretation(totalScore);
  const interpretationLabel = getInterpretationLabel(interpretation);
  const colorClasses = getInterpretationColor(interpretation);
  const trendEmoji = getTrendEmoji(trend);

  // BDR grade
  const bdrGrade = isBdr ? getBdrGrade(totalScore) : null;
  const bdrGradeLabel = bdrGrade ? getBdrGradeLabel(bdrGrade) : null;
  const bdrGradeColor = bdrGrade ? getBdrGradeColor(bdrGrade) : null;

  const maxScore = isBdr ? 46 : 100;
  const progressVsLast = lastDemoScore !== null ? totalScore - lastDemoScore : null;
  const progressVsAvg = userAverage !== null ? totalScore - userAverage : null;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Header */}
        <div className="mb-6">
          <Target className="w-12 h-12 text-brand-navy mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-brand-navy">
            {isBdr ? 'BDR Call Score' : 'Your Call Score'}
          </h2>
          {callDeliveredBy && (
            <p className="text-sm text-gray-600 mt-2">
              {isBdr ? 'BDR' : 'Call Conducted By'}:{' '}
              <span className="font-semibold">{callDeliveredBy}</span>
            </p>
          )}
        </div>

        {/* Large Score Display */}
        <div className="mb-6">
          <div className="text-7xl font-bold text-brand-navy mb-2">
            {totalScore}
            <span className="text-4xl text-gray-400">/{maxScore}</span>
          </div>

          {/* Grade / Interpretation Badge */}
          {isBdr && bdrGrade ? (
            <div className="flex flex-col items-center gap-2">
              <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-lg font-semibold border-2 ${bdrGradeColor}`}>
                <span className="text-2xl font-black">{bdrGrade}</span>
                <span>{bdrGradeLabel?.split(' — ')[1]}</span>
              </div>
              {/* Demo Booked Indicator */}
              {demoBooked !== undefined && (
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border ${
                  demoBooked
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}>
                  {demoBooked
                    ? <><CheckCircle size={14} /> Demo Booked</>
                    : <><XCircle size={14} /> No Demo Booked</>
                  }
                </div>
              )}
            </div>
          ) : (
            <div className={`inline-block px-6 py-2 rounded-full text-lg font-semibold border-2 ${colorClasses}`}>
              {interpretationLabel}
            </div>
          )}
        </div>

        {/* BDR Stage Breakdown */}
        {isBdr && bdrStageScores && bdrStageScores.length > 0 && (
          <div className="mb-6 text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stage Breakdown</p>
            <div className="space-y-2">
              {bdrStageScores.map(({ stage, earned, max, pct }) => (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-32 flex-shrink-0">{stage}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500 w-16 text-right flex-shrink-0">
                    {earned}/{max} ({pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Context Information */}
        <div className="space-y-4 mb-8 text-left">
          {progressVsAvg !== null && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700">
                {progressVsAvg >= 0 ? 'Above' : 'Below'} your average ({userAverage} pts)
              </span>
              <span className={`font-bold ${progressVsAvg >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {progressVsAvg > 0 ? '+' : ''}{progressVsAvg} pts
              </span>
            </div>
          )}

          {progressVsLast !== null && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700 flex items-center gap-2">
                {progressVsLast > 0 && <TrendingUp className="w-5 h-5 text-green-600" />}
                {progressVsLast < 0 && <TrendingDown className="w-5 h-5 text-red-600" />}
                {progressVsLast === 0 && <Minus className="w-5 h-5 text-gray-600" />}
                Progress from last call
              </span>
              <span className={`font-bold ${progressVsLast > 0 ? 'text-green-600' : progressVsLast < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {progressVsLast > 0 ? '+' : ''}{progressVsLast} pts
              </span>
            </div>
          )}

          {userAverage !== null && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Trend (last 5 calls)</span>
              <span className="font-bold flex items-center gap-2">
                <span className="text-2xl">{trendEmoji}</span>
                <span className="capitalize text-gray-700">{trend}</span>
              </span>
            </div>
          )}

          {userAverage === null && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                This is your first scored call! Complete 2-3 more calls to see your progress
                trends and averages.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button variant="primary" fullWidth onClick={onViewCoachingReport} className="text-base py-3">
            See Your Coaching Report →
          </Button>
          <Button variant="ghost" fullWidth onClick={onSkipToDetails} className="text-sm">
            Skip to Detailed Scores
          </Button>
        </div>

        {/* Score Guide */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          {isBdr ? (
            <>
              <p className="text-xs text-gray-500 mb-3">Grade Guide (out of 46 pts):</p>
              <div className="flex justify-center gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-gray-600">A = 37–46 (80%+)</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-gray-600">B = 28–36 (60%+)</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-gray-600">C = 18–27 (40%+)</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-gray-600">D = 0–17</span></div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">Score Guide:</p>
              <div className="flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-gray-600">71+ = Gold Standard</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-gray-600">40-70 = At Risk</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-gray-600">&lt;40 = Critical</span></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
