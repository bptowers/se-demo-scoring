import React from 'react';
import { XCircle } from 'lucide-react';
import { NonNegotiableViolationsV2 } from '../types';

const VIOLATION_LABELS: Record<keyof NonNegotiableViolationsV2, string> = {
  productBeforeValueMirror:    'Product Opened Before Value Mirror — P3 capped at 0, GS1 capped at 2',
  demoFeatureNoDiscoveryLink:  'Demo Feature Shown Without Discovery Link — GS3 capped at 1',
  noNextStep:                  'No Specific Next Step — P5 capped at 1, GS5 capped at 1',
  falseCapabilityCommitment:   'False Capability Commitment — T10 triggered',
  objectionCapitulation:       'Objection Capitulation — GS2 capped at 1',
  priceDropNoRoi:              'Price Dropped Without ROI Framing — GS4 capped at 1',
};

interface ViolationsPanelProps {
  violations: NonNegotiableViolationsV2;
}

export const ViolationsPanel: React.FC<ViolationsPanelProps> = ({ violations }) => {
  const active = (Object.keys(violations) as Array<keyof NonNegotiableViolationsV2>)
    .filter(k => violations[k]);

  if (active.length === 0) return null;

  return (
    <div className="border border-red-300 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-red-600">
        <p className="text-sm font-bold text-white uppercase tracking-wide">
          Non-Negotiable Violations ({active.length})
        </p>
      </div>
      <div className="px-5 py-4 space-y-2 bg-red-50">
        {active.map(key => (
          <div key={key} className="flex items-start gap-2">
            <XCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{VIOLATION_LABELS[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
