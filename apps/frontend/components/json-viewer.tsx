'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function JsonViewer({ data, defaultExpanded = false }: { data: unknown; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Copied to clipboard');
  };

  return (
    <div className="rounded-md border bg-muted/50 p-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}
          {expanded ? 'Collapse' : 'Expand'} JSON
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      {expanded && (
        <pre className="mt-2 overflow-x-auto text-xs p-2 bg-background rounded-sm">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
