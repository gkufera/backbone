'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailWarning('');
    setLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      if (!response.emailSent) {
        setEmailWarning('Email could not be sent. Please contact support.');
      } else {
        setSuccess(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="mac-window w-full max-w-md">
        <div className="mac-window-title">
          <span>Forgot Password</span>
        </div>
        <div className="mac-window-body space-y-6">
          <p className="text-center text-sm font-mono text-black">
            Enter your email and we&apos;ll send you a reset link
          </p>

          {error && (
            <div role="alert" className="mac-alert-error p-3 text-sm">
              {error}
            </div>
          )}

          {emailWarning && (
            <div role="alert" className="mac-alert-error p-3 text-sm">
              {emailWarning}
            </div>
          )}

          {success ? (
            <div className="mac-alert p-3 text-sm font-mono">
              {success}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <button
                type="submit"
                disabled={loading}
                className="mac-btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="text-center text-sm font-mono text-black">
            <Link href="/login" className="underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
