'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { productionsApi } from '../../lib/api';

function ApproveProductionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'approving' | 'success' | 'error'>('approving');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No approval token provided');
      return;
    }

    productionsApi
      .approve(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Approval failed');
      });
  }, [token]);

  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="mac-window w-full max-w-md">
        <div className="mac-window-title">
          <span>Production Approval</span>
        </div>
        <div className="mac-window-body space-y-6">
          {status === 'approving' && (
            <p className="text-center text-sm font-mono text-black">Approving production...</p>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-center text-sm font-mono text-black">
                {message}
              </p>
              <p className="text-center">
                <Link href="/productions" className="mac-btn-primary inline-block px-6 py-2">
                  View Productions
                </Link>
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div role="alert" className="mac-alert-error p-3 text-sm">
                {message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ApproveProductionPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ApproveProductionContent />
    </Suspense>
  );
}
