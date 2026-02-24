'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '../../lib/api';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed');
      });
  }, [token]);

  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="mac-window w-full max-w-md">
        <div className="mac-window-title">
          <span>Email Verification</span>
        </div>
        <div className="mac-window-body space-y-6">
          {status === 'verifying' && (
            <p className="text-center text-sm font-mono text-black">Verifying your email...</p>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-center text-sm font-mono text-black">{message}</p>
              <p className="text-center">
                <Link href="/login" className="mac-btn-primary inline-block px-6 py-2">
                  Log in
                </Link>
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div role="alert" className="mac-alert-error p-3 text-sm">
                {message}
              </div>
              <p className="text-center text-sm font-mono text-black">
                <Link href="/login" className="font-bold underline">
                  Back to login
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
