'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { registerUser } from './actions';
import { Loader2, Lock, Mail, User, ShieldAlert } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simple client side checks matching Zod regex
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      setLoading(false);
      return;
    }

    try {
      const res = await registerUser({ name, email, password });

      if (res.success) {
        // Automatically sign in the user after successful registration
        const authRes = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (authRes?.error) {
          router.push('/login?registered=true');
        } else {
          router.push('/onboarding');
          router.refresh();
        }
      } else {
        setError(res.error || 'Registration failed');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[10%] h-[350px] w-[350px] rounded-full bg-primary/10 blur-[90px]"></div>
        <div className="absolute bottom-[20%] right-[10%] h-[350px] w-[350px] rounded-full bg-primary/5 blur-[90px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 glass-panel p-8 rounded-lg glow-primary">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="text-2xl font-black tracking-wider text-primary">BACKUPPER</span>
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-xs font-semibold text-primary">BDR</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Create your free account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-medium flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-foreground mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <input
                  id="full-name"
                  name="name"
                  type="text"
                  required
                  disabled={loading}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-md border border-border bg-secondary pl-10 pr-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border border-border bg-secondary pl-10 pr-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border border-border bg-secondary pl-10 pr-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Minimum 8 characters with at least one uppercase, lowercase, and numeric character.
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !name || !email || !password}
              className="flex w-full justify-center items-center gap-2 rounded-md bg-primary py-2.5 px-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
