import React from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { SeCategoryScore } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  'Customer Context and Discovery': 'Context',
  'Demo Relevance and Storyline': 'Storyline',
  'Product and Technical Credibility': 'Technical',
  'Operational Fit and Adoption Readiness': 'Adoption',
  'Value and Business Impact': 'Value',
  'Customer Engagement and Active Listening': 'Engagement',
  'Buyer-Centric Demo Language': 'Buyer Lang',
  'Communication and Executive Presence': 'Presence',
  'Objection, Concern, and Risk Handling': 'Risk',
  'Call Leadership, Collaboration, and Next Steps': 'Next Steps',
};

const getScoreColor = (pct: number) => {
  if (pct >= 85) return 'bg-green-500';
  if (pct >= 75) return 'bg-brand-yellow';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

interface SeCategoryRadarProps {
  categories: SeCategoryScore[];
  title?: string;
  compact?: boolean;
}

export const SeCategoryRadar: React.FC<SeCategoryRadarProps> = ({
  categories,
  title = 'Category Performance',
  compact = false,
}) => {
  const data = categories.map((category) => {
    const pct = category.max_points > 0
      ? Math.round((category.points_awarded / category.max_points) * 100)
      : 0;

    return {
      label: CATEGORY_LABELS[category.category] ?? category.category,
      category: category.category,
      pct,
      points: category.points_awarded,
      maxPoints: category.max_points,
      rating: category.rating,
    };
  });

  const sortedGaps = [...data].sort((a, b) => a.pct - b.pct).slice(0, 3);

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-brand-navy flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-brand-yellow uppercase tracking-wide">{title}</h2>
        <span className="text-xs text-slate-300 font-semibold">Percent of category max</span>
      </div>

      <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-[1.25fr_0.85fr]'} gap-4 p-5`}>
        <div className="h-[320px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 12, right: 30, bottom: 12, left: 30 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Category score"
                dataKey="pct"
                stroke="#0f1b35"
                fill="#ffc20e"
                fillOpacity={0.38}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(_value, _name, item) => {
                  const payload = item.payload as typeof data[number];
                  return [`${payload.pct}% (${payload.points}/${payload.maxPoints})`, payload.rating];
                }}
                labelFormatter={(_label, payload) => {
                  const first = payload?.[0]?.payload as typeof data[number] | undefined;
                  return first?.category ?? '';
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {!compact && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Largest Coaching Gaps</h3>
              <div className="space-y-2">
                {sortedGaps.map((item) => (
                  <div key={item.category} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm font-bold text-brand-navy">{item.category}</p>
                      <span className="text-xs font-black text-slate-600">{item.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white overflow-hidden border border-slate-100">
                      <div className={`h-full ${getScoreColor(item.pct)}`} style={{ width: `${item.pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{item.points}/{item.maxPoints} pts - {item.rating}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {data.map((item) => (
                <div key={item.category} className="border border-slate-100 rounded-lg px-3 py-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase truncate">{item.label}</p>
                  <p className="text-sm font-black text-brand-navy">{item.points}/{item.maxPoints}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
