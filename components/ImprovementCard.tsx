import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Lightbulb, Info } from 'lucide-react';
import type { PriorityImprovement } from '../utils/scoringHelpers';

interface ImprovementCardProps {
  improvement: PriorityImprovement;
  rank: number; // 1, 2, 3
  defaultExpanded?: boolean;
}

export const ImprovementCard: React.FC<ImprovementCardProps> = ({
  improvement,
  rank,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { criterionName, section, currentScore, maxScore, impact, whatHappened, whyItMatters, howToFix } = improvement;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:border-brand-yellow transition-all duration-200">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-start justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-3 text-left flex-1">
          {/* Rank Badge */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-yellow text-brand-navy font-bold flex items-center justify-center text-sm">
              {rank}
            </div>
          </div>

          {/* Criterion Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-brand-navy text-lg mb-1">{criterionName}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{section}</span>
              <span>
                {currentScore}/{maxScore} pts
              </span>
              <span className="font-semibold text-orange-600">
                {impact > 0 && '+'}{impact} pt potential
              </span>
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
          {/* What Happened */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                What Happened
              </h4>
            </div>
            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-gray-800 italic">"{whatHappened}"</p>
            </div>
          </div>

          {/* Why It Matters */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-500" />
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Why It Matters
              </h4>
            </div>
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-gray-700">{whyItMatters}</p>
            </div>
          </div>

          {/* How to Fix */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                How to Fix
              </h4>
            </div>
            <div className="bg-yellow-50 p-4 rounded border-2 border-yellow-300">
              <p className="text-gray-800 font-medium leading-relaxed">{howToFix}</p>
            </div>
          </div>

          {/* Future Enhancement Placeholder: Example Link */}
          {/*
          <div className="pt-2">
            <button className="text-sm text-brand-blue hover:underline flex items-center gap-1">
              <PlayCircle className="w-4 h-4" />
              See example from high-scoring demo
            </button>
          </div>
          */}
        </div>
      )}
    </div>
  );
};
