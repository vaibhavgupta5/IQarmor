'use client';
import { useState, useEffect } from 'react';

export function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState(new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(new Date(expiresAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft <= 0) {
    return <span className="font-semibold text-amber-500">TIMEOUT — AUTO-DENIED</span>;
  }

  const seconds = Math.floor(timeLeft / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  
  const isDanger = seconds <= 10;

  return (
    <span className={`font-mono font-medium ${isDanger ? 'text-destructive' : 'text-muted-foreground'}`}>
      {m}:{s.toString().padStart(2, '0')}
    </span>
  );
}
