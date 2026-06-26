import { Badge } from '@/components/ui/badge';
import type { Verdict } from '@armoriq/shared';

const VERDICT_CONFIG: Record<Verdict, { label: string; variant: "default" | "destructive" | "secondary" | "outline"; className: string }> = {
  ALLOW: { label: 'ALLOW', variant: 'outline', className: 'text-[#22C55E] border-[#22C55E] bg-[#22C55E]/10' },
  BLOCK: { label: 'BLOCK', variant: 'outline', className: 'text-[#EF4444] border-[#EF4444] bg-[#EF4444]/10' },
  HOLD_FOR_APPROVAL: { label: 'HOLD', variant: 'outline', className: 'text-[#F59E0B] border-[#F59E0B] bg-[#F59E0B]/10' },
  INJECTION_DETECTED: { label: 'INJECTION', variant: 'outline', className: 'text-[#EC4899] border-[#EC4899] bg-[#EC4899]/10' },
  INDIRECT_INJECTION_DETECTED: { label: 'INDIRECT INJECT', variant: 'outline', className: 'text-[#EC4899] border-[#EC4899] bg-[#EC4899]/10' },
  VALIDATION_FAIL: { label: 'INVALID', variant: 'outline', className: 'text-[#F97316] border-[#F97316] bg-[#F97316]/10' },
  INTENT_DRIFT: { label: 'DRIFT', variant: 'outline', className: 'text-[#F97316] border-[#F97316] bg-[#F97316]/10' },
  DANGEROUS_CHAIN: { label: 'CHAIN', variant: 'outline', className: 'text-[#F97316] border-[#F97316] bg-[#F97316]/10' },
  BUDGET_EXCEEDED: { label: 'BUDGET', variant: 'outline', className: 'text-[#888888] border-[#888888] bg-[#888888]/10' },
  RATE_LIMIT_EXCEEDED: { label: 'RATE LIMIT', variant: 'outline', className: 'text-[#3B82F6] border-[#3B82F6] bg-[#3B82F6]/10' },
  LOOP_DETECTED: { label: 'LOOP', variant: 'outline', className: 'text-[#F59E0B] border-[#F59E0B] bg-[#F59E0B]/10' },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const config = VERDICT_CONFIG[verdict] || { label: verdict, variant: 'default', className: '' };
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
