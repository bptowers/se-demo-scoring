import React from 'react';
import {
  FileText,
  Target,
  TrendingUp,
  Search,
  Download,
  CheckCircle,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Button } from './Button';
import { ImprovementCard } from './ImprovementCard';
import type { PriorityImprovement, Strength } from '../utils/scoringHelpers';
import { ScoringRubricType } from '../types';

interface CoachingSummaryProps {
  demoNumber?: number;
  vertical?: string;
  date: Date;
  totalScore: number;
  callDeliveredBy?: string;
  rubricType?: ScoringRubricType;
  demoBooked?: boolean;
  priorityImprovements: PriorityImprovement[];
  topStrengths: Strength[];
  onDownloadPDF: () => void;
  onSetGoal: () => void;
  onCompareToLast: () => void;
  onViewDetailedScores: () => void;
}

export const CoachingSummary: React.FC<CoachingSummaryProps> = ({
  demoNumber,
  vertical,
  date,
  totalScore,
  callDeliveredBy,
  rubricType = 'AE',
  demoBooked,
  priorityImprovements,
  topStrengths,
  onDownloadPDF,
  onSetGoal,
  onCompareToLast,
  onViewDetailedScores,
}) => {
  const isBdr = rubricType === 'BDR';
  const maxScore = isBdr ? 46 : 100;

  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-brand-navy" />
              <div>
                <h1 className="text-2xl font-bold text-brand-navy">
                  {isBdr ? 'BDR Call Coaching Report' : 'Coaching Report'}
                  {demoNumber && ` - ${isBdr ? 'BDR Call' : 'Call'} #${demoNumber}`}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 flex-wrap">
                  {vertical && !isBdr && (
                    <span className="px-2 py-1 bg-brand-yellow text-brand-navy rounded font-semibold text-xs">
                      {vertical}
                    </span>
                  )}
                  <span>{formatDate(date)}</span>
                  {callDeliveredBy && (
                    <span>
                      {isBdr ? 'BDR' : 'AE'}:{' '}
                      <span className="font-semibold">{callDeliveredBy}</span>
                    </span>
                  )}
                  <span className="font-semibold">Score: {totalScore}/{maxScore}</span>
                  {/* Demo Booked badge */}
                  {isBdr && demoBooked !== undefined && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                      demoBooked
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      {demoBooked
                        ? <><CheckCircle size={11} /> Demo Booked</>
                        : <><XCircle size={11} /> No Demo</>
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={onDownloadPDF}>
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 space-y-8">
          {/* Priority Improvements Section */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-brand-navy">
                TOP PRIORITY IMPROVEMENTS
              </h2>
              <span className="text-sm text-gray-500">(Focus Here First)</span>
            </div>

            {priorityImprovements.length > 0 ? (
              <div className="space-y-3">
                {priorityImprovements.map((improvement, index) => (
                  <ImprovementCard
                    key={improvement.criterionId}
                    improvement={improvement}
                    rank={index + 1}
                    defaultExpanded={index === 0}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Trophy className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-green-700 font-semibold text-lg">
                  {isBdr ? 'Grade A — Perfect Call!' : 'Perfect Score!'}
                </p>
                <p className="text-green-600 text-sm mt-1">
                  {isBdr
                    ? 'All 23 behaviours passed — outstanding BDR call.'
                    : 'You scored 100/100 - no improvements needed. Keep up the excellent work!'}
                </p>
              </div>
            )}
          </section>

          {/* Top Strengths Section */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-brand-navy">TOP STRENGTHS</h2>
              <span className="text-sm text-gray-500">(Keep Doing This)</span>
            </div>

            {topStrengths.length > 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <ul className="space-y-3">
                  {topStrengths.map((strength) => (
                    <li key={strength.criterionId} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">
                          {strength.criterionName} ({strength.score}/{strength.maxScore})
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{strength.reasoning}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-600">
                  Focus on improvements first. As you score higher, your top strengths will
                  appear here.
                </p>
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section>
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-brand-navy mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button variant="outline" onClick={onSetGoal} className="justify-start">
                  <Target className="w-4 h-4" />
                  Set Improvement Goal
                </Button>
                <Button variant="outline" onClick={onCompareToLast} className="justify-start">
                  <TrendingUp className="w-4 h-4" />
                  Compare to Past Calls
                </Button>
                <Button variant="outline" onClick={onViewDetailedScores} className="justify-start">
                  <Search className="w-4 h-4" />
                  See Detailed Scores
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Review the detailed rubric breakdown or start a new evaluation
            </p>
            <Button variant="primary" onClick={onViewDetailedScores}>
              View Detailed Scores →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
