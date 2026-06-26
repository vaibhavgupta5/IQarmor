'use client';
import { useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useApprovalsStore } from '@/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CountdownTimer } from '@/components/countdown-timer';
import { JsonViewer } from '@/components/json-viewer';
import { Check, X } from 'lucide-react';

export default function ApprovalsPage() {
  const { session } = useAuth();
  const { approvals, setApprovals } = useApprovalsStore();

  useEffect(() => {
    if (!session?.access_token) return;
    api.approvals.list({ status: 'PENDING' }, session.access_token)
      .then(res => setApprovals((res as any).data || res))
      .catch(err => toast.error('Failed to load approvals: ' + err.message));
  }, [session?.access_token, setApprovals]);

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!session?.access_token) return;
    try {
      await api.approvals.decide(id, decision, session.access_token);
      toast.success(`Request ${decision.toLowerCase()}`);
      setApprovals(approvals.filter(a => a.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit decision');
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
        <p className="text-muted-foreground mt-1">Review tools waiting for human confirmation</p>
      </div>

      <div className="border rounded-md bg-card overflow-x-auto min-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Params</TableHead>
              <TableHead>Expires In</TableHead>
              <TableHead className="text-right">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No pending approvals.</TableCell>
              </TableRow>
            ) : approvals.map((approval) => {
              const isExpired = new Date(approval.expiresAt).getTime() <= Date.now();
              return (
                <TableRow key={approval.id}>
                  <TableCell className="font-mono text-sm font-semibold">{approval.toolName}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <JsonViewer data={approval.params} />
                  </TableCell>
                  <TableCell>
                    <CountdownTimer expiresAt={approval.expiresAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDecision(approval.id, 'REJECTED')}
                        disabled={isExpired}
                      >
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white" 
                        onClick={() => handleDecision(approval.id, 'APPROVED')}
                        disabled={isExpired}
                      >
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
