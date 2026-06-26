'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { SocketProvider, useSocket } from '@/components/providers/socket-provider';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, MessageSquare, Shield, CheckSquare, Activity, Server, LogOut, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat Interface', icon: MessageSquare },
  { href: '/rules', label: 'Policy Rules', icon: Shield },
  { href: '/approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/audit', label: 'Audit Log', icon: Activity },
  { href: '/servers', label: 'MCP Servers', icon: Server },
];

function SidebarContent({ isExpanded = true, toggleExpanded }: { isExpanded?: boolean, toggleExpanded?: () => void }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  
  return (
    <>
      <div className="p-6 flex items-center justify-between">
        {isExpanded ? (
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">// ARMORIQ</h1>
            <p className="text-xs text-muted-foreground mt-1">// AI Security Platform</p>
          </div>
        ) : (
          <div className="font-bold text-primary w-full text-center">{'//'}</div>
        )}
        
        {toggleExpanded && (
          <Button variant="ghost" size="icon" onClick={toggleExpanded} className="hidden md:flex rounded-none hover:bg-[#1A1A1A] shrink-0">
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
      
      <nav className="flex-1 space-y-2 px-3 overflow-y-auto mt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!isExpanded ? item.label : undefined}
              className={`flex items-center gap-3 py-2.5 text-sm font-medium transition-all ${isExpanded ? 'px-3' : 'justify-center'} ${
                isActive 
                  ? 'bg-purple-900/30 text-primary border-l-2 border-purple-500 shadow-[inset_0_0_12px_rgba(168,85,247,0.2)]' 
                  : 'text-muted-foreground hover:bg-[#0A0A0A] hover:text-primary hover:border-l-2 border-transparent'
              }`}
            >
              <Icon className={isExpanded ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0"} />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-dashed border-[#1A1A1A] mt-auto">
        <ConnectionStatus isExpanded={isExpanded} />
        <Button 
          variant="ghost" 
          className={`w-full mt-2 hover:bg-red-950/30 hover:text-red-500 rounded-none transition-colors ${isExpanded ? 'justify-start' : 'justify-center p-0 h-10'}`} 
          onClick={() => signOut()}
          title={!isExpanded ? "Sign out" : undefined}
        >
          <LogOut className={isExpanded ? "mr-2 h-4 w-4 shrink-0" : "h-5 w-5 shrink-0"} />
          {isExpanded && "Sign out"}
        </Button>
      </div>
    </>
  );
}

function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className={`hidden md:flex h-screen flex-col border-r border-dashed border-[#1A1A1A] bg-[#000000]/80 backdrop-blur-md font-mono z-10 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}>
      <SidebarContent isExpanded={isExpanded} toggleExpanded={() => setIsExpanded(!isExpanded)} />
    </div>
  );
}

function ConnectionStatus({ isExpanded = true }: { isExpanded?: boolean }) {
  const { connected } = useSocket();
  
  if (!isExpanded) {
    return (
      <div className="flex justify-center mb-2" title={connected ? 'Socket Connected' : 'Socket Disconnected'}>
        <span className={`inline-block w-2 h-2 ${connected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground font-mono">
      <span className={`inline-block w-2 h-2 ${connected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
      {connected ? 'Socket Connected' : 'Socket Disconnected'}
    </div>
  );
}

import { SocketEventHandler } from '@/components/providers/socket-event-handler';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <SocketEventHandler />
      <div className="flex min-h-screen bg-background relative overflow-hidden">
        {/* Purple Aura Light Effect (Enhanced) */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-background to-background" />
        <div className="fixed top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-700/20 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
        
        <Sidebar />
        
        <main className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative">
          {/* Mobile Header with Hamburger Menu */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-dashed border-[#1A1A1A] bg-[#000000]/80 backdrop-blur-sm z-20">
            <h1 className="text-lg font-bold tracking-tight text-primary">// ARMORIQ</h1>
            <Sheet>
              <SheetTrigger render={
                <Button variant="ghost" size="icon" className="md:hidden" />
              }>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 flex flex-col w-64 bg-[#000000] border-r border-[#1A1A1A]">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
          {children}
        </main>
      </div>
    </SocketProvider>
  );
}
