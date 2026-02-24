'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="mac-window w-full max-w-md">
          <div className="mac-window-title">
            <span>Slug Max</span>
          </div>
          <div className="mac-window-body flex flex-col items-center gap-6 py-8">
            <Image
              src="/logo.png"
              alt="Slug Max"
              width={280}
              height={80}
              priority
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="text-sm uppercase tracking-widest">For Film &amp; TV Creatives</span>
            <p className="text-center text-2xl font-bold font-mono leading-tight">
              Production&apos;s hub for creative decisions
            </p>
            <p className="text-center text-lg font-mono">
              Stop searching email threads, start shooting.
            </p>
            {!isLoading && isAuthenticated && (
              <Link href="/productions" className="mac-btn-primary mt-2">
                My Productions
              </Link>
            )}
            {!isLoading && !isAuthenticated && (
              <div className="mt-2 flex gap-3">
                <Link href="/login" className="mac-btn-primary">
                  Log in
                </Link>
                <Link href="/signup" className="mac-btn-secondary">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
