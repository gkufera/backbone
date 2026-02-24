'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/productions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="mac-window w-full max-w-md">
        <div className="mac-window-title">
          <span>Log In</span>
        </div>
        <div className="mac-window-body space-y-6">
          <p className="text-center text-sm font-mono text-black">
            Sign in to your Slug Max account
          </p>

          {error && (
            <div role="alert" className="mac-alert-error p-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-black">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border-2 border-black px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-black">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border-2 border-black px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mac-btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="text-center text-sm font-mono text-black">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-bold underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
