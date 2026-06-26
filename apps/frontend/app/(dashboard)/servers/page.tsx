'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useServersStore } from '@/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Server, Activity, Plus, CheckCircle2, XCircle, Search } from 'lucide-react';

export default function ServersPage() {
  const { session } = useAuth();
  const { servers, setServers } = useServersStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [discoveredTools, setDiscoveredTools] = useState<any[]>([]);

  const fetchServers = async () => {
    if (!session?.access_token) return;
    try {
      const res = await api.servers.list(session.access_token);
      setServers((res as any).data || res);
    } catch (err: any) {
      toast.error('Failed to load servers');
    }
  };

  useEffect(() => {
    fetchServers();
  }, [session?.access_token]);

  const [transport, setTransport] = useState<'STREAMABLE_HTTP' | 'STDIO'>('STREAMABLE_HTTP');
  const [envString, setEnvString] = useState('');

  const parseEnvString = () => {
    if (!envString.trim()) return undefined;
    const envVars: Record<string, string> = {};
    envString.split('\n').forEach(line => {
      const [k, ...rest] = line.split('=');
      if (k && rest.length > 0) {
        envVars[k.trim()] = rest.join('=').trim();
      }
    });
    return envVars;
  };

  const handleProbe = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await api.servers.probe({
        name: name || 'temp-probe',
        transport,
        url,
        authHeader: transport === 'STREAMABLE_HTTP' ? (apiKey || undefined) : undefined,
        env: transport === 'STDIO' ? parseEnvString() : undefined,
      }, session.access_token);
      const data = res.data || res;
      setDiscoveredTools(data.tools || []);
      setStep(2);
      toast.success(`Discovered ${(data.tools || []).length} tools`);
    } catch (err: any) {
      toast.error(err.message || 'Probe failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      await api.servers.register({
        name,
        transport,
        url,
        authHeader: transport === 'STREAMABLE_HTTP' ? (apiKey || undefined) : undefined,
        env: transport === 'STDIO' ? parseEnvString() : undefined,
      }, session.access_token);
      
      toast.success('Server registered');
      setIsDialogOpen(false);
      setStep(1);
      setUrl('');
      setName('');
      setApiKey('');
      setEnvString('');
      setDiscoveredTools([]);
      fetchServers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register server');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    if (!session?.access_token) return;
    try {
      await api.servers.toggle(id, !current, session.access_token);
      setServers(servers.map(s => s.id === id ? { ...s, isActive: !current } : s));
      toast.success(current ? 'Server disabled' : 'Server enabled');
    } catch (err: any) {
      toast.error('Failed to toggle server');
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP Registry</h1>
          <p className="text-muted-foreground mt-1">Connect and manage external tool providers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { 
          setIsDialogOpen(open); 
          if (!open) {
            setStep(1);
            setUrl('');
            setName('');
            setApiKey('');
            setDiscoveredTools([]);
          }
        }}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> Register Server
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Register MCP Server</DialogTitle>
              <DialogDescription>
                Connect a new Model Context Protocol compatible server.
              </DialogDescription>
            </DialogHeader>
            
            {step === 1 && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Server Name</Label>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. threat-intel-prod" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transport Type</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={transport} 
                    onChange={e => setTransport(e.target.value as any)}
                  >
                    <option value="STREAMABLE_HTTP">Streamable HTTP (Remote)</option>
                    <option value="STDIO">Standard I/O (Local)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{transport === 'STDIO' ? 'Command (e.g. npx ...)' : 'SSE URL (e.g. http://localhost:3002/mcp)'}</Label>
                  <Input 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder={transport === 'STDIO' ? "npx -y exa-mcp-server" : "http://localhost:3002/mcp"} 
                    className="font-mono text-xs"
                  />
                </div>
                {transport === 'STREAMABLE_HTTP' ? (
                  <div className="space-y-2">
                    <Label>API Key / Auth Header (Optional)</Label>
                    <Input 
                      type="password"
                      value={apiKey} 
                      onChange={e => setApiKey(e.target.value)} 
                      placeholder="Enter API key if required by the server" 
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Environment Variables (Optional)</Label>
                    <textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs"
                      value={envString} 
                      onChange={e => setEnvString(e.target.value)} 
                      placeholder="EXA_API_KEY=your-key&#10;POSTGRES_URL=postgresql://..." 
                    />
                  </div>
                )}
                <Button className="w-full" onClick={handleProbe} disabled={loading || !url || !name}>
                  <Search className="mr-2 h-4 w-4" /> Probe Server
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 py-4">
                <div className="rounded-md border p-4 bg-muted/30">
                  <h4 className="text-sm font-semibold mb-2 text-green-600 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Server Reachable
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">Found {discoveredTools.length} tools.</p>
                  <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {discoveredTools.map(t => (
                      <li key={t.name} className="font-mono flex items-center gap-2">
                        <div className="h-1 w-1 bg-primary rounded-full" /> {t.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label>Assign Server Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. threat-intel-prod" />
                </div>
                <Button className="w-full" onClick={handleRegister} disabled={loading || !name}>
                  Complete Registration
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers.length === 0 ? (
          <div className="col-span-full p-12 text-center border rounded-lg border-dashed text-muted-foreground">
            No servers registered. Register your first MCP server to start connecting tools.
          </div>
        ) : servers.map(server => (
          <Card key={server.id} className={!server.isActive ? 'opacity-70 grayscale-[0.5]' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${server.isHealthy ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                  <CardTitle className="text-lg">{server.name}</CardTitle>
                </div>
                <Switch checked={server.isActive} onCheckedChange={() => handleToggle(server.id, server.isActive)} />
              </div>
           
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Activity className="mr-1 h-4 w-4" /> 
                  {server.toolCount} tools
                </div>
                <div className="text-xs text-muted-foreground">
                  Added {new Date(server.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
