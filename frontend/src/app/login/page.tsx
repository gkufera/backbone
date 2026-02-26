'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { ApiError, authApi } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setResendMessage('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/productions');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  const [resending, setResending] = useState(false);

  async function handleResend() {
    setResendMessage('');
    setResending(true);
    try {
      const result = await authApi.resendVerification(email);
      if (result.emailSent) {
        setResendMessage('Verification email sent! Check your inbox.');
      } else {
        setResendMessage('Email could not be sent. Please contact support.');
      }
    } catch {
      setResendMessage('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-white">
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
              <p>{error}</p>
              {needsVerification && (
                <div className="mt-2">
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-sm underline disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend verification email'}
                  </button>
                  {resendMessage && (
                    <p className="mt-1 text-sm font-mono">{resendMessage}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <form noValidate onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm text-black">
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
              <label htmlFor="password" className="block text-sm text-black">
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
            <Link href="/forgot-password" className="underline">
              Forgot password?
            </Link>
          </p>

          <p className="text-center text-sm font-mono text-black">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
