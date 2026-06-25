'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import axios from 'axios';
import { Button, Field, Input, Label } from '@headlessui/react';

type Mode = 'loading' | 'login' | 'register' | 'error';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/auth/status');
        setMode(data.registered ? 'login' : 'register');
      } catch {
        setMode('error');
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      await api.post(endpoint, { email, password });
      router.push('/');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Invalid credentials');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setPending(false);
    }
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (mode === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-sm text-red-400">
          Service unavailable. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6">
        <div>
          <p className="text-2xl font-semibold tracking-widest text-green-400 uppercase mb-1">
            {mode === 'login' ? 'Welcome back' : 'Mint Pay'}
          </p>
          <h1 className="text-xl font-semibold text-zinc-100">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          {mode === 'register' && (
            <p className="text-sm text-zinc-500 mt-1">
              Admin account registration.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field className="space-y-1">
            <Label className="text-xs text-zinc-400">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-green-400 transition-colors"
            />
          </Field>

          <Field className="space-y-1">
            <Label className="text-xs text-zinc-400">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-green-400 transition-colors"
            />
          </Field>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md px-4 py-2 transition-colors"
          >
            {pending
              ? mode === 'login'
                ? 'Signing in…'
                : 'Creating…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  );
}
