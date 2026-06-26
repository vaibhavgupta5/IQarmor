'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAuditStore } from '@/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { VerdictBadge } from '@/components/verdict-badge';
import { JsonViewer } from '@/components/json-viewer';
import { toast } from 'sonner';
import { ShieldCheck, Download, Filter } from 'lucide-react';

export default function AuditPage() {
  const { session } = useAuth();
  const { entries, setEntries, pagination, setPagination } = useAuditStore();
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  
  const [convId, setConvId] = useState('');
  const [toolName, setToolName] = useState('');
  
  const [debouncedConvId, setDebouncedConvId] = useState('');
  const [debouncedToolName, setDebouncedToolName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConvId(convId);
      setDebouncedToolName(toolName);
    }, 500);
    return () => clearTimeout(timer);
  }, [convId, toolName]);

  const fetchAudit = async () => {
    if (!session?.access_token) return;
    try {
      const res = await api.audit.list({ page: pagination.page, limit: pagination.limit, conversationId: debouncedConvId, toolName: debouncedToolName }, session.access_token);
      const data = res.data || res;
      setEntries(data || []);
      if (data.total) setPagination({ ...pagination, total: data.total });
    } catch  {
      toast.error('Failed to load audit logs');
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [session?.access_token, pagination.page, debouncedConvId, debouncedToolName]);

  const handleVerify = async () => {
    if (!session?.access_token) return;
    try {
      const res = await api.audit.verify(session.access_token);
      if (res.valid) {
        toast.success(`CHAIN VALID : ${res.totalEntries} entries verified`, { style: { background: '#16a34a', color: 'white' } });
      } else {
        toast.error(`TAMPERED : Entry ${res.tamperedAt} hash mismatch!`, { style: { background: '#dc2626', color: 'white' } });
      }
    } catch (err: any) {
      toast.error('Verification failed');
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
    const node = document.createElement('a');
    node.setAttribute("href", dataStr);
    node.setAttribute("download", `armoriq-audit.json`);
    document.body.appendChild(node);
    node.click();
    node.remove();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 md:p-8 pb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
            <p className="text-muted-foreground mt-1">Cryptographically verifiable immutable ledger of all agent actions</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="text-green-600 border-green-200 bg-green-50" onClick={handleVerify}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Verify Chain Integrity
            </Button>
            <Button variant="outline" onClick={handleExportJSON}>
              <Download className="mr-2 h-4 w-4" /> Export JSON
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:max-w-sm flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input 
              placeholder="Filter by Conversation ID" 
              value={convId} 
              onChange={e => setConvId(e.target.value)} 
              className="h-9 w-full"
            />
          </div>
          <div className="w-full sm:max-w-sm">
            <Input 
              placeholder="Filter by Tool Name" 
              value={toolName} 
              onChange={e => setToolName(e.target.value)} 
              className="h-9 w-full"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-8 pb-8">
        <div className="border rounded-md bg-card overflow-x-auto min-w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Conversation ID</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Risk Contrib</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No audit entries found.</TableCell>
                </TableRow>
              ) : entries.map((entry) => (
                <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEntry(entry)}>
                  <TableCell className="whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Link href={`/audit/${entry.conversationId}`} className="font-mono text-sm hover:underline text-blue-600" onClick={e => e.stopPropagation()}>
                      {entry.conversationId.substring(0, 12)}...
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">{entry.toolName}</TableCell>
                  <TableCell>
                    <VerdictBadge verdict={entry.decision as any} />
                  </TableCell>
                  <TableCell>{entry.latencyMs ? `${entry.latencyMs}ms` : '-'}</TableCell>
                  <TableCell>{entry.riskContrib > 0 ? `+${entry.riskContrib}` : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto px-4 sm:px-8 py-6">
          <SheetHeader className="mb-6 !px-0 border-b-2 border-gray-500/50 pb-4">
            <div className="flex justify-between items-center w-full">
              <div>
                <SheetTitle>Audit Entry Details</SheetTitle>
                <SheetDescription>Immutable record #{selectedEntry?.id}</SheetDescription>
              </div>
              
            </div>
          </SheetHeader>
          
          {selectedEntry && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Timestamp</div>
                  <div>{new Date(selectedEntry.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Tool</div>
                  <div className="font-mono text-sm">{selectedEntry.toolName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Decision</div>
                  <VerdictBadge verdict={selectedEntry.decision as any} />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Reason</div>
                  <div className="text-sm">{selectedEntry.reason}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Cryptographic Proof</div>
                <div className="bg-muted p-3 rounded-md text-xs font-mono break-all space-y-2">
                  <div>
                    <span className="text-muted-foreground">Hash: </span>
                    {selectedEntry.hash}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Prev: </span>
                    {selectedEntry.prevHash}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Parameters</div>
                <JsonViewer data={selectedEntry.params} defaultExpanded={true} />
              </div>

              {selectedEntry.result && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Result</div>
                  <JsonViewer data={selectedEntry.result} />
                </div>
              )}

              {selectedEntry && (
                <Link href={`/audit/${selectedEntry.conversationId}`}>
                  <Button size="sm" variant="default">
                    View Timeline
                  </Button>
                </Link>
              )}
            </div>
            
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
