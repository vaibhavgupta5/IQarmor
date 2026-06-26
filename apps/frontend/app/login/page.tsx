'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
    <div className="flex min-h-screen items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-dashed border-[#1A1A1A] p-6 rounded-sm">
        <div className="space-y-1 mb-6">
          <h1 className="text-xl font-bold tracking-tight text-primary">// ARMORIQ ADMIN</h1>
          <p className="text-xs text-muted-foreground">
            Enter credentials to access policy controls.
          </p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 text-sm font-medium text-[#EF4444] bg-[#EF4444]/10 border border-dashed border-[#EF4444] rounded-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs text-muted-foreground">// EMAIL</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@armoriq.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#000000] border-dashed focus-visible:ring-1 focus-visible:ring-[#444444]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs text-muted-foreground">// PASSWORD</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#000000] border-dashed focus-visible:ring-1 focus-visible:ring-[#444444]"
            />
          </div>
          <Button type="submit" className="w-full font-mono text-xs tracking-wider" disabled={loading}>
            {loading ? '[ AUTHENTICATING... ]' : '[ SIGN IN ]'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/register" className="text-xs text-primary hover:underline font-mono">
            [ CREATE AN ACCOUNT ]
          </Link>
        </div>
        <div className="mt-6 pt-4 border-t border-dashed border-[#1A1A1A] text-xs text-muted-foreground text-center">
          // v1.0.0 · armoriq
        </div>
      </div>
    </div>
  );
}
