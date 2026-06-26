import { RISK_FLAG_THRESHOLD, RISK_TERMINATE_THRESHOLD } from '@armoriq/shared';

export function calculateRiskUpdate(
  currentScore: number,
  riskContribution: number
): { newScore: number; shouldFlag: boolean; shouldTerminate: boolean } {
  const newScore = Math.min(currentScore + riskContribution, 150);
  const shouldFlag = newScore >= RISK_FLAG_THRESHOLD && currentScore < RISK_FLAG_THRESHOLD;
  const shouldTerminate = newScore >= RISK_TERMINATE_THRESHOLD;

  return { newScore, shouldFlag, shouldTerminate };
}
