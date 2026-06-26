'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const mouseGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (mouseGlowRef.current) {
        mouseGlowRef.current.style.background = `radial-gradient(circle 600px at ${e.clientX}px ${e.clientY}px, rgba(124, 58, 237, 0.15), transparent 80%)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black font-mono">
      {/* Interactive Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]"></div>

      {/* Mouse Glow Effect */}
      <div
        ref={mouseGlowRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{ opacity: 1 }}
      />

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding Corner Card */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16">
          <div>
            <Link href="/" className="inline-flex items-center space-x-3 group cursor-pointer">
              <div className="text-6xl bg-[#0A0A0A]/80 border-dashed border-2 border-[#333333] p-6 pb-8 font-bold tracking-tight text-white shadow-[0_0_50px_rgba(124,58,237,0.1)] group-hover:border-primary/50 transition-colors duration-500">
                <span className="text-primary group-hover:text-white transition-colors duration-500">
                  //
                </span>
                ARMOR
                <span className="text-[#555555] group-hover:text-white transition-colors duration-500">
                  IQ
                </span>
              </div>
            </Link>
          </div>

          <div className="space-y-6">
            <div className="max-w-md">
              <h1 className="text-3xl font-bold text-white mb-4">
                Agents shouldn't run <span className="text-primary">blind.</span> They need{" "}
                <span className="text-primary italic underline decoration-primary/30 underline-offset-8">
                  guardrails.
                </span>
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Cryptographically signed audit logs, real-time threat intelligence, and deterministic policy enforcement for your AI workflows.
              </p>
            </div>

            <div className="text-xs text-[#555555] font-medium tracking-widest uppercase">
              // v1.0.0 · armoriq secure shell
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-lg bg-[#0A0A0A]/80 backdrop-blur-xl border border-dashed border-[#333333] p-8 lg:p-12 shadow-[0_0_50px_rgba(124,58,237,0.05)] rounded-none relative">
            <div className="absolute top-0 right-0 w-16 h-16 border-l border-b border-dashed border-[#333333] flex items-center justify-center">
              <span className="text-[#333333] text-xs">A-IQ</span>
            </div>
            
            <div className="mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-primary mb-2">// ADMIN LOGIN</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to access policy controls.
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 text-sm font-medium text-[#EF4444] bg-[#EF4444]/10 border border-dashed border-[#EF4444]">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground tracking-widest uppercase">// EMAIL ADDRESS</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@armoriq.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 bg-[#000000] border-dashed border-[#333333] focus-visible:ring-1 focus-visible:ring-primary rounded-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground tracking-widest uppercase">// PASSWORD</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 bg-[#000000] border-dashed border-[#333333] focus-visible:ring-1 focus-visible:ring-primary rounded-none transition-colors"
                />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 font-mono text-xs tracking-widest border-dashed border-[#333333] text-muted-foreground bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] hover:text-white rounded-none transition-colors" 
                onClick={() => { setEmail('vaibhavgupta.v890@gmail.com'); setPassword('12345678'); }}
              >
                [ FILL DEMO CREDENTIALS ]
              </Button>
              <Button type="submit" className="w-full h-12 font-mono text-sm tracking-widest rounded-none shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:bg-primary/90 transition-all" disabled={loading}>
                {loading ? '[ AUTHENTICATING... ]' : '[ SIGN IN ]'}
              </Button>
            </form>
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                No access?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium transition-colors">
                  [ REQUEST ACCOUNT ]
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
