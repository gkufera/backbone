'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '../../lib/api';

function VerifyEmailSentContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [resendMessage, setResendMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    setResendMessage('');

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
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="mac-window w-full max-w-md">
        <div className="mac-window-title">
          <span>Check Your Email</span>
        </div>
        <div className="mac-window-body space-y-6">
          <p className="text-center text-sm font-mono text-black">
            We&apos;ve sent a verification link to your email. Please check your email and click the
            link to verify your account.
          </p>

          {email && (
            <p className="text-center text-sm font-mono text-black font-bold">{email}</p>
          )}

          {resendMessage && (
            <p className="text-center text-sm font-mono text-black">{resendMessage}</p>
          )}

          <div className="flex flex-col items-center gap-3">
            {email && (
              <button
                onClick={handleResend}
                disabled={loading}
                className="mac-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Resend verification email'}
              </button>
            )}

            <Link href="/login" className="text-sm font-mono underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailSentPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <VerifyEmailSentContent />
    </Suspense>
  );
}
