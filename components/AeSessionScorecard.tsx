import React from 'react';
import { DemoSession } from '../types';
import { AeCallScorecard } from './AeCallScorecard';
import { AeCallScorecardV2 } from './AeCallScorecardV2';

interface AeSessionScorecardProps {
  session: DemoSession;
  onBack?: () => void;
  expandAll?: boolean;
}

export const AeSessionScorecard: React.FC<AeSessionScorecardProps> = ({ session, onBack, expandAll }) => {
  if (session.aiV2) {
    return <AeCallScorecardV2 session={session} onBack={onBack} expandAll={expandAll} />;
  }

  return <AeCallScorecard session={session} onBack={onBack} expandAll={expandAll} />;
};
