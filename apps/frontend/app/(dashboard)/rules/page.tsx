'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useRulesStore } from '@/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Download, Upload, Plus, Trash2 } from 'lucide-react';

const RULE_COLORS: Record<string, string> = {
  BLOCK: 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  APPROVE: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  VALIDATE: 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  BUDGET: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  RATE_LIMIT: 'bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
};

function RuleHelpGuide({ type, onDemo }: { type: string, onDemo: () => void }) {
  const DemoButton = () => (
    <Button variant="outline" size="sm" onClick={onDemo} className="w-full mt-4 bg-background/50 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary transition-all">
      Try Example Configuration
    </Button>
  );

  switch (type) {
    case 'BLOCK':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1A1A1A]">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
            <div className="font-bold text-red-500 tracking-wider">BLOCK RULE</div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Immediately blocks and rejects matching tool calls. Crucial for preventing destructive operations (like deleting files) or disabling specific capabilities.
          </p>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">// How it works:</div>
            <ul className="list-disc pl-4 space-y-2 text-muted-foreground text-[11px] leading-relaxed">
              <li>Enter a <strong className="text-foreground">Tool Pattern</strong> like <code className="text-primary">fetch_generic_url_content</code> or <code className="text-primary">*</code>.</li>
              <li>When the agent attempts to run a matching tool, the Policy Engine intervenes.</li>
              <li>The agent receives an immediate "Access Denied" error message.</li>
            </ul>
          </div>
          <DemoButton />
        </div>
      );
    case 'APPROVE':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1A1A1A]">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            <div className="font-bold text-amber-500 tracking-wider">APPROVE RULE</div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Pauses the agent's execution and requires human intervention. Use for sensitive actions like executing bash commands or sending emails.
          </p>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">// How it works:</div>
            <ul className="list-disc pl-4 space-y-2 text-muted-foreground text-[11px] leading-relaxed">
              <li>Agent execution is suspended while waiting.</li>
              <li>An operator can explicitly <span className="text-green-500">Allow</span> or <span className="text-red-500">Deny</span> the action via the UI.</li>
              <li>If the <strong className="text-foreground">Timeout</strong> expires, the fallback action (Deny or Escalate) is automatically applied.</li>
            </ul>
          </div>
          <DemoButton />
        </div>
      );
    case 'VALIDATE':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1A1A1A]">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
            <div className="font-bold text-blue-500 tracking-wider">VALIDATE RULE</div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Performs runtime checks on the exact parameters sent to the tool before allowing execution.
          </p>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">// How it works:</div>
            <ul className="list-disc pl-4 space-y-2 text-muted-foreground text-[11px] leading-relaxed">
              <li>Specify a <strong className="text-foreground">Parameter</strong> (e.g., <code>domain</code>).</li>
              <li>Choose an <strong className="text-foreground">Operator</strong> (e.g., <code>not_contains</code>).</li>
              <li>Set a <strong className="text-foreground">Value</strong> (e.g., <code>internal.corp</code>).</li>
              <li>Only tool calls with arguments satisfying this constraint are permitted.</li>
            </ul>
          </div>
          <DemoButton />
        </div>
      );
    case 'BUDGET':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1A1A1A]">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <div className="font-bold text-green-500 tracking-wider">BUDGET RULE</div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Restricts the total LLM token usage for a single conversation session.
          </p>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">// How it works:</div>
            <ul className="list-disc pl-4 space-y-2 text-muted-foreground text-[11px] leading-relaxed">
              <li>Set a <strong className="text-foreground">Max Tokens Limit</strong> (e.g., 4000).</li>
              <li>The system tracks total tokens consumed by the agent.</li>
              <li>If the threshold is breached, the agent is halted and cannot make further tool calls.</li>
            </ul>
          </div>
          <DemoButton />
        </div>
      );
    case 'RATE_LIMIT':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1A1A1A]">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
            <div className="font-bold text-purple-500 tracking-wider">RATE LIMIT</div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Caps the maximum number of times a specific tool can be run per conversation.
          </p>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">// How it works:</div>
            <ul className="list-disc pl-4 space-y-2 text-muted-foreground text-[11px] leading-relaxed">
              <li>Enter a <strong className="text-foreground">Tool Pattern</strong> (e.g., <code>web_search_exa</code>).</li>
              <li>Set the <strong className="text-foreground">Max Calls per Session</strong>.</li>
              <li>Prevents agents from getting stuck in infinite loops or spamming an expensive external API.</li>
            </ul>
          </div>
          <DemoButton />
        </div>
      );
    default:
      return null;
  }
}

export default function RulesPage() {
  const { session } = useAuth();
  const { rules, setRules, loading, setLoading } = useRulesStore();
  const [filter, setFilter] = useState('All');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [newRuleType, setNewRuleType] = useState('BLOCK');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRulePriority, setNewRulePriority] = useState('0');
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  // Type-specific states
  const [ttlSeconds, setTtlSeconds] = useState('120');
  const [onTimeout, setOnTimeout] = useState('DENY');
  const [validationField, setValidationField] = useState('domain');
  const [validationOperator, setValidationOperator] = useState('not_contains');
  const [validationValue, setValidationValue] = useState('');
  const [limitValue, setLimitValue] = useState('10');
  const [budgetLimit, setBudgetLimit] = useState('4000');
  const [availableTools, setAvailableTools] = useState<string[]>([]);

  const applyDemo = (type: string) => {
    setNewRuleType(type);
    if (type === 'BLOCK') {
      setNewRulePattern('fetch_generic_url_content');
      setNewRulePriority('10');
    } else if (type === 'APPROVE') {
      setNewRulePattern('scan_url');
      setTtlSeconds('60');
      setOnTimeout('ESCALATE');
      setNewRulePriority('5');
    } else if (type === 'VALIDATE') {
      setNewRulePattern('check_domain');
      setValidationField('domain');
      setValidationOperator('not_contains');
      setValidationValue('internal.corp');
      setNewRulePriority('8');
    } else if (type === 'BUDGET') {
      setNewRulePattern('*');
      setBudgetLimit('5000');
      setNewRulePriority('100');
    } else if (type === 'RATE_LIMIT') {
      setNewRulePattern('web_search_exa');
      setLimitValue('3');
      setNewRulePriority('50');
    }
  };

  const fetchRules = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await api.rules.list({}, session.access_token);
      setRules(res.data || res);
    } catch (err: any) {
      toast.error('Failed to load rules: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;
    api.servers.list(session.access_token)
      .then(res => {
        const serversList = (res as any).data || res || [];
        const tools = serversList.flatMap((s: any) => s.discoveredTools || []);
        setAvailableTools(Array.from(new Set(tools)));
      })
      .catch(() => {});
  }, [session?.access_token]);

  const handleToggle = async (id: string, currentActive: boolean) => {
    if (!session?.access_token) return;
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !currentActive } : r));
    try {
      await api.rules.toggle(id, !currentActive, session.access_token);
      toast.success('Rule updated');
    } catch (err: any) {
      toast.error('Failed to update rule');
      fetchRules();
    }
  };

  const confirmDelete = async () => {
    if (!session?.access_token || !ruleToDelete) return;
    
    try {
      await api.rules.delete(ruleToDelete, session.access_token);
      toast.success('Rule deleted');
      fetchRules();
    } catch (err: any) {
      toast.error('Failed to delete rule');
    } finally {
      setRuleToDelete(null);
    }
  };

  const handleCreate = async () => {
    if (!session?.access_token) return;
    
    let condition: any = null;
    if (newRuleType === 'VALIDATE') {
      condition = {
        field: validationField,
        operator: validationOperator,
        value: validationValue,
      };
    } else if (newRuleType === 'BUDGET') {
      condition = {
        field: 'count',
        operator: 'lt',
        value: parseInt(budgetLimit) || 4000,
      };
    } else if (newRuleType === 'RATE_LIMIT') {
      condition = {
        field: 'count',
        operator: 'lt',
        value: parseInt(limitValue) || 10,
      };
    }

    try {
      await api.rules.create({
        type: newRuleType,
        toolPattern: newRulePattern.trim().toLowerCase().replace(/\s+/g, '_'),
        priority: parseInt(newRulePriority) || 0,
        isActive: true,
        condition,
        ttlSeconds: newRuleType === 'APPROVE' ? (parseInt(ttlSeconds) || 120) : undefined,
        onTimeout: newRuleType === 'APPROVE' ? onTimeout : undefined,
      }, session.access_token);
      
      toast.success('Rule created');
      setIsDialogOpen(false);
      
      // Reset state
      setStep(1);
      setNewRulePattern('');
      setNewRulePriority('0');
      setTtlSeconds('120');
      setOnTimeout('DENY');
      setValidationField('domain');
      setValidationOperator('not_contains');
      setValidationValue('');
      setLimitValue('10');
      setBudgetLimit('4000');

      fetchRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create rule');
    }
  };

  const handleExport = async () => {
    if (!session?.access_token) return;
    try {
      const data = await api.rules.export(session.access_token);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const node = document.createElement('a');
      node.setAttribute("href", dataStr);
      node.setAttribute("download", `armoriq-rules.json`);
      document.body.appendChild(node);
      node.click();
      node.remove();
    } catch (err: any) {
      toast.error('Export failed');
    }
  };

  const displayedRules = filter === 'All' ? rules : rules.filter(r => r.type === filter);

  const getConditionText = (rule: any) => {
    if (!rule.condition && rule.type !== 'APPROVE') return '—';
    if (rule.type === 'APPROVE') {
      return `ttl: ${rule.ttlSeconds || 120}s, onTimeout: ${rule.onTimeout || 'DENY'}`;
    }
    const cond = rule.condition;
    if (rule.type === 'VALIDATE') {
      return `${cond.field} ${cond.operator} ${cond.value}`;
    }
    if (rule.type === 'BUDGET') {
      return `max ${cond.value} tokens`;
    }
    if (rule.type === 'RATE_LIMIT') {
      return `max ${cond.value} calls`;
    }
    return '—';
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Policy Rules</h1>
          <p className="text-muted-foreground mt-1">Manage agent constraints and permissions</p>
        </div>
        <div className="flex w-full flex-col sm:w-auto sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" className="w-full sm:w-auto">
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setStep(1); }}>
            <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
              <Plus className="mr-2 h-4 w-4" /> New Rule
            </DialogTrigger>
            <DialogContent className="w-full !max-w-4xl !max-h-[90vh] overflow-y-auto sm:max-w-106.25">
              <DialogHeader>
                <DialogTitle>Create Policy Rule</DialogTitle>
                <DialogDescription>Add a new rule to govern agent tool execution.</DialogDescription>
              </DialogHeader>

              <div className="mt-4 flex flex-col md:flex-row gap-6">
                
                {/* Form Column */}
                <div className="flex-1 space-y-5">
                  
                  {/* Basic Settings */}
                  <div className="space-y-4 bg-[#0A0A0A] p-4 rounded-md border border-[#1A1A1A]">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold">Rule Type</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['BLOCK', 'APPROVE', 'VALIDATE', 'BUDGET', 'RATE_LIMIT'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setNewRuleType(t);
                              if (t === 'BUDGET' && !newRulePattern) setNewRulePattern('*');
                            }}
                            onMouseEnter={() => setHoveredType(t)}
                            onMouseLeave={() => setHoveredType(null)}
                            className={`px-3 py-2 text-xs font-mono rounded border transition-all ${newRuleType === t ? 'border-primary bg-primary/10 text-primary' : 'border-[#1A1A1A] hover:border-primary/50 text-muted-foreground hover:text-foreground'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold">Tool Pattern</Label>
                        <Input value={newRulePattern} onChange={e => setNewRulePattern(e.target.value)} placeholder="e.g. web_search_exa, *, delete_*" className="font-mono text-sm bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold">Priority</Label>
                        <Input type="number" value={newRulePriority} onChange={e => setNewRulePriority(e.target.value)} className="font-mono text-sm bg-background" placeholder="0" />
                      </div>
                    </div>

                    {availableTools.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">// Quick Select Tools</Label>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setNewRulePattern('*')} className="text-[10px] font-mono px-2 py-0.5 rounded border border-dashed border-[#1A1A1A] hover:bg-primary/20 hover:text-primary hover:border-primary transition-colors">
                            * (All)
                          </button>
                          {availableTools.map(t => (
                            <button key={t} type="button" onClick={() => setNewRulePattern(t)} className="text-[10px] font-mono px-2 py-0.5 rounded border border-dashed border-[#1A1A1A] hover:bg-primary/20 hover:text-primary hover:border-primary transition-colors">
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Type-Specific Configuration */}
                  <div className="space-y-4 bg-[#0A0A0A] p-4 rounded-md border border-[#1A1A1A]">
                    <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold">{newRuleType} Configuration</Label>
                    
                    {newRuleType === 'BLOCK' && (
                      <div className="text-sm text-muted-foreground">
                        No additional configuration needed. Matching tools will be immediately blocked.
                      </div>
                    )}

                    {newRuleType === 'APPROVE' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Timeout (Seconds)</Label>
                          <Input type="number" value={ttlSeconds} onChange={e => setTtlSeconds(e.target.value)} className="font-mono text-sm bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Timeout Action</Label>
                          <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-sans" value={onTimeout} onChange={e => setOnTimeout(e.target.value)}>
                            <option value="DENY">Deny (Fail-Closed)</option>
                            <option value="ESCALATE">Escalate (Alert Operator)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {newRuleType === 'VALIDATE' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Parameter</Label>
                          <Input value={validationField} onChange={e => setValidationField(e.target.value)} placeholder="domain" className="font-mono text-sm bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Operator</Label>
                          <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-sans" value={validationOperator} onChange={e => setValidationOperator(e.target.value)}>
                            <option value="not_contains">not_contains</option>
                            <option value="contains">contains</option>
                            <option value="starts_with">starts_with</option>
                            <option value="ends_with">ends_with</option>
                            <option value="matches_regex">matches_regex</option>
                            <option value="lt">less_than</option>
                            <option value="gt">greater_than</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Value</Label>
                          <Input value={validationValue} onChange={e => setValidationValue(e.target.value)} placeholder="internal" className="font-mono text-sm bg-background" />
                        </div>
                      </div>
                    )}

                    {newRuleType === 'BUDGET' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Max Tokens Limit</Label>
                        <Input type="number" value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)} className="font-mono text-sm bg-background max-w-[200px]" />
                      </div>
                    )}

                    {newRuleType === 'RATE_LIMIT' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Max Calls per Session</Label>
                        <Input type="number" value={limitValue} onChange={e => setLimitValue(e.target.value)} className="font-mono text-sm bg-background max-w-[200px]" />
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!newRulePattern.trim()}>Create Rule</Button>
                  </DialogFooter>
                </div>

                {/* Help Guide Column */}
                <div className="hidden md:block md:w-[280px] shrink-0 p-5 bg-[#030303] border border-dashed border-[#1A1A1A] rounded-md text-xs space-y-3 font-mono self-start shadow-inner">
                  <RuleHelpGuide type={hoveredType || newRuleType} onDemo={() => applyDemo(hoveredType || newRuleType)} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        {['All', 'BLOCK', 'APPROVE', 'VALIDATE', 'BUDGET', 'RATE_LIMIT'].map(f => (
          <Button 
            key={f} 
            variant={filter === f ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter(f)}
            className="whitespace-nowrap shrink-0"
          >
            {f}
          </Button>
        ))}
      </div>

      <div className="border rounded-md bg-card overflow-x-auto min-w-full">
        <Table className="min-w-180">
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Tool Pattern</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading rules...</TableCell>
              </TableRow>
            ) : displayedRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No rules found.</TableCell>
              </TableRow>
            ) : displayedRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Badge className={RULE_COLORS[rule.type] || 'bg-gray-100 text-gray-800'}>
                    {rule.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm font-medium">{rule.toolPattern}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{getConditionText(rule)}</TableCell>
                <TableCell>{rule.priority}</TableCell>
                <TableCell>
                  <Switch 
                    checked={rule.isActive} 
                    onCheckedChange={() => handleToggle(rule.id, rule.isActive)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setRuleToDelete(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!ruleToDelete} onOpenChange={(open) => !open && setRuleToDelete(null)}>
        <DialogContent className="border-[#1A1A1A] bg-[#0A0A0A] sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle className="text-primary font-mono tracking-tight uppercase">Delete Rule</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Are you sure you want to delete this rule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setRuleToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
